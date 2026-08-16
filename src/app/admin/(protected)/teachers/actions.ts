"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Same shape as every other actions.ts in this project (see
 * applications/actions.ts, summer/batch-actions.ts) — copy-pasted
 * deliberately, not shared, matching the existing convention. The
 * (protected) layout guard is a UX convenience; this is the real
 * boundary, because a Server Action can be invoked directly without
 * ever rendering that layout.
 */
async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Not authorised");
  return supabase;
}

type Result<T = {}> = { ok: true } & T | { ok: false; error: string };

/* ── Types ──────────────────────────────────────────────────── */

export type TeacherListItem = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  role_title: string | null;
  active: boolean;
  created_at: string;
  batch_count: number;
};

export type TeacherBatchOption = {
  id: string;
  cohort_label: string;
  course_slug: string;
  course_title: string;
  programme_type: "summer" | "term";
  assigned: boolean;
};

/* ── Reads ──────────────────────────────────────────────────── */

/**
 * Admin-gated explicitly, not left to RLS alone — unlike a grading
 * queue or homework roster, this returns every teacher's email and
 * phone in one list. Matches the same caution getSubmissionFileUrl
 * already applies to a read (doc: batch-actions.ts).
 */
export async function getTeachers(): Promise<
  { ok: true; teachers: TeacherListItem[] } | { ok: false; error: string }
> {
  const supabase = await assertAdmin();

  const { data: teachers, error } = await supabase
    .from("teachers")
    .select("id, user_id, name, email, phone, role_title, active, created_at")
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: error.message };

  const { data: grants } = await supabase.from("teacher_batches").select("teacher_id");

  const batchCounts = new Map<string, number>();
  for (const g of grants ?? []) {
    batchCounts.set(g.teacher_id, (batchCounts.get(g.teacher_id) ?? 0) + 1);
  }

  return {
    ok: true,
    teachers: (teachers ?? []).map((t) => ({
      ...t,
      batch_count: batchCounts.get(t.id) ?? 0,
    })) as TeacherListItem[],
  };
}

export async function getTeacher(
  teacherId: string
): Promise<{ ok: true; teacher: TeacherListItem } | { ok: false; error: string }> {
  const supabase = await assertAdmin();

  const { data: teacher, error } = await supabase
    .from("teachers")
    .select("id, user_id, name, email, phone, role_title, active, created_at")
    .eq("id", teacherId)
    .single();

  if (error || !teacher) return { ok: false, error: error?.message ?? "Teacher not found." };

  const { count } = await supabase
    .from("teacher_batches")
    .select("batch_id", { count: "exact", head: true })
    .eq("teacher_id", teacherId);

  return { ok: true, teacher: { ...teacher, batch_count: count ?? 0 } as TeacherListItem };
}

/**
 * Every batch, tagged with whether THIS teacher already holds it —
 * one query, not N. courses.type drives the programme tag (grouping
 * only, no separate programme-level grant — see doc 08 §7).
 */
export async function getBatchesForTeacherAssignment(
  teacherId: string
): Promise<{ ok: true; batches: TeacherBatchOption[] } | { ok: false; error: string }> {
  const supabase = await assertAdmin();

  const { data: batches, error } = await supabase
    .from("batches")
    .select("id, cohort_label, course_slug")
    .order("cohort_label", { ascending: true });

  if (error) return { ok: false, error: error.message };

  const { data: courses } = await supabase
    .from("courses")
    .select("slug, title, type");
  const courseInfo = new Map<string, { title: string; type: string }>(
    (courses ?? []).map((c) => [c.slug, { title: c.title, type: c.type }])
  );

  const { data: grants } = await supabase
    .from("teacher_batches")
    .select("batch_id")
    .eq("teacher_id", teacherId);
  const assignedIds = new Set((grants ?? []).map((g) => g.batch_id));

  const options: TeacherBatchOption[] = (batches ?? []).map((b) => {
    const course = courseInfo.get(b.course_slug);
    return {
      id: b.id,
      cohort_label: b.cohort_label,
      course_slug: b.course_slug,
      course_title: course?.title ?? b.course_slug,
      programme_type: (course?.type as "summer" | "term") ?? "summer",
      assigned: assignedIds.has(b.id),
    };
  });

  return { ok: true, batches: options };
}

/* ── Writes ─────────────────────────────────────────────────── */

export type NewTeacherInput = {
  name: string;
  email: string;
  phone: string;
  roleTitle: string;
};

/**
 * Creates the teacher row AND sends the Supabase Auth invite. Uses
 * the admin (service-role) client for the invite itself — inviteUserByEmail
 * requires elevated privileges a session-scoped client doesn't have,
 * same reason the Stripe webhook (api/stripe/webhook/route.ts) uses
 * createAdminClient() rather than createClient().
 *
 * teachers.user_id starts NULL and is filled in once the invited
 * person actually accepts and logs in for the first time — see the
 * note on teachers.user_id in migration 0038. A teacher row existing
 * with no user_id yet is the correct, expected state right after
 * this action runs, not a bug.
 */
export async function createTeacher(input: NewTeacherInput): Promise<Result<{ id: string }>> {
  const supabase = await assertAdmin();

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  const roleTitle = input.roleTitle.trim();

  if (!name) return { ok: false, error: "A name is required." };
  if (!email) return { ok: false, error: "A work email is required." };
  if (!email.includes("@")) return { ok: false, error: "That doesn't look like a valid email." };

  const { data: { user: admin } } = await supabase.auth.getUser();

  const { data: teacher, error: insertError } = await supabase
    .from("teachers")
    .insert({
      name,
      email,
      phone: phone || null,
      role_title: roleTitle || null,
      active: true,
      created_by: admin?.id ?? null,
    })
    .select("id")
    .single();

  if (insertError) {
    // A citext-unique email column will surface as a constraint
    // violation here — surfaced plainly rather than as a raw Postgres
    // error string.
    if (insertError.message.toLowerCase().includes("duplicate")) {
      return { ok: false, error: "A teacher with this email already exists." };
    }
    return { ok: false, error: insertError.message };
  }

  const adminClient = createAdminClient();
  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email);

  if (inviteError) {
    // The teacher row exists but the invite failed to send — don't
    // roll back the row. A resend is one click from the teacher list;
    // losing the row means re-entering everything. Surfaced clearly
    // so the admin knows to retry the invite specifically, not
    // re-create the teacher.
    return {
      ok: false,
      error: `Teacher created, but the invite email failed to send: ${inviteError.message}. Use "Resend invite" on their row.`,
    };
  }

  revalidatePath("/admin/teachers");
  return { ok: true, id: teacher.id };
}

export async function resendTeacherInvite(email: string): Promise<Result> {
  await assertAdmin();

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.inviteUserByEmail(email);

  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export type UpdateTeacherInput = {
  teacherId: string;
  name: string;
  phone: string;
  roleTitle: string;
};

export async function updateTeacher(input: UpdateTeacherInput): Promise<Result> {
  const supabase = await assertAdmin();

  const name = input.name.trim();
  if (!name) return { ok: false, error: "A name is required." };

  const { error } = await supabase
    .from("teachers")
    .update({
      name,
      phone: input.phone.trim() || null,
      role_title: input.roleTitle.trim() || null,
    })
    .eq("id", input.teacherId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/teachers");
  return { ok: true };
}

/**
 * The kill switch (migration 0038/0039's own framing) — flipping this
 * to false revokes every batch at once via is_teacher_for_batch(),
 * no cascade of deletes against teacher_batches needed.
 */
export async function setTeacherActive(teacherId: string, active: boolean): Promise<Result> {
  const supabase = await assertAdmin();

  const { error } = await supabase
    .from("teachers")
    .update({
      active,
      deactivated_at: active ? null : new Date().toISOString(),
    })
    .eq("id", teacherId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/teachers");
  revalidatePath("/teacher");
  return { ok: true };
}

/**
 * One checkbox = one call, independent insert/delete — never a bulk
 * diff-and-save. A partial failure this way is never ambiguous about
 * which grants actually landed (doc 08 §7's own stated reasoning for
 * this shape).
 */
export async function grantBatchAccess(teacherId: string, batchId: string): Promise<Result> {
  const supabase = await assertAdmin();
  const { data: { user: admin } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("teacher_batches")
    .insert({ teacher_id: teacherId, batch_id: batchId, assigned_by: admin?.id ?? null });

  if (error) {
    if (error.message.toLowerCase().includes("duplicate")) {
      // Already granted — not an error the admin needs to see twice.
      return { ok: true };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/teachers");
  revalidatePath("/teacher");
  return { ok: true };
}

export async function revokeBatchAccess(teacherId: string, batchId: string): Promise<Result> {
  const supabase = await assertAdmin();

  const { error } = await supabase
    .from("teacher_batches")
    .delete()
    .eq("teacher_id", teacherId)
    .eq("batch_id", batchId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/teachers");
  revalidatePath("/teacher");
  return { ok: true };
}
