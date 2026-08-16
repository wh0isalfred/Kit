"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, EMAIL_FROM } from "@/lib/email/resend";

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
 * Splits identity creation from the email that announces it — the
 * same separation this project already makes for the Summer ID email
 * (doc: summer/actions.ts's "Email 2 of 2" comment): Supabase's
 * inviteUserByEmail sends its OWN email, from Supabase's shared
 * sending infrastructure, using Supabase's default template — no KIT
 * branding, not from kitacademy.net, worse deliverability than a
 * domain-verified sender. generateLink creates the same auth.users
 * row and hands back the real invite URL WITHOUT sending anything,
 * so the actual email can go out through Resend/kitacademy.net like
 * every other parent-facing email in this project.
 *
 * Deliberately best-effort on the email, same posture as the welcome
 * email in summer/actions.ts: a failed SEND should not roll back a
 * successful teacher row, because losing the row means re-entering
 * everything, and a resend is one click away. The teacher row and the
 * auth invite link are the durable parts; the email is a delivery
 * attempt on top of them.
 * Exported (not module-private) so teacher/login/actions.ts can reuse
 * it for the public "send me a new invite link" flow — same email,
 * same generateLink call, different caller and trust model (that one
 * has no assertAdmin(), see its own file for why).
 */
export async function sendTeacherInviteEmail(
  email: string,
  name: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminClient = createAdminClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kitacademy.net";

  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo: `${siteUrl}/teacher/set-password` },
  });

  if (linkError || !linkData) {
    return { ok: false, error: linkError?.message ?? "Could not generate an invite link." };
  }

  const inviteUrl = linkData.properties?.action_link;
  if (!inviteUrl) {
    return { ok: false, error: "Invite link was generated but came back empty." };
  }

  const firstName = name.trim().split(" ")[0] || "there";

  try {
    const { error: sendError } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: "You're invited to teach at KIT",
      html: `
        <div style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <p style="font-size: 20px; font-weight: 800; color: #1F2C4F; margin: 0 0 24px;">KIT</p>
          <p style="font-size: 15px; color: #1F2C4F; line-height: 1.6;">Hi ${firstName},</p>
          <p style="font-size: 15px; color: #1F2C4F; line-height: 1.6;">
            You've been added as a teacher at KIT. Set your password to get
            into your teacher account, where you'll see the batches you've
            been assigned to.
          </p>
          <a href="${inviteUrl}"
             style="display: inline-block; margin: 20px 0; padding: 12px 24px;
                    background: #1F2C4F; color: #fff; font-weight: 700;
                    font-size: 14px; text-decoration: none; border-radius: 9px;">
            Set your password
          </a>
          <p style="font-size: 13px; color: #5d6781; line-height: 1.6;">
            This link is just for you — if you weren't expecting this, you
            can ignore this email.
          </p>
        </div>
      `,
    });

    if (sendError) {
      return { ok: false, error: `Invite link created, but the email failed to send: ${sendError.message}` };
    }
  } catch (err) {
    return {
      ok: false,
      error: `Invite link created, but the email failed to send: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }

  return { ok: true };
}

/**
 * Mirror of sendTeacherInviteEmail above — same split (generate the
 * Supabase action link ourselves via generateLink, send our own
 * branded email through Resend instead of Supabase's default), same
 * best-effort posture, different link type ('recovery' instead of
 * 'invite') and different redirect target (/teacher/reset-password,
 * not /teacher/set-password — see that page's own comment for why
 * these are kept separate rather than sharing one page).
 */
export async function sendTeacherPasswordResetEmail(
  email: string,
  name: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminClient = createAdminClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kitacademy.net";

  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${siteUrl}/teacher/reset-password` },
  });

  if (linkError || !linkData) {
    return { ok: false, error: linkError?.message ?? "Could not generate a reset link." };
  }

  const resetUrl = linkData.properties?.action_link;
  if (!resetUrl) {
    return { ok: false, error: "Reset link was generated but came back empty." };
  }

  const firstName = name.trim().split(" ")[0] || "there";

  try {
    const { error: sendError } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: "Reset your KIT password",
      html: `
        <div style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <p style="font-size: 20px; font-weight: 800; color: #1F2C4F; margin: 0 0 24px;">KIT</p>
          <p style="font-size: 15px; color: #1F2C4F; line-height: 1.6;">Hi ${firstName},</p>
          <p style="font-size: 15px; color: #1F2C4F; line-height: 1.6;">
            Someone requested a password reset for your KIT teacher account.
            If that was you, set a new password below.
          </p>
          <a href="${resetUrl}"
             style="display: inline-block; margin: 20px 0; padding: 12px 24px;
                    background: #1F2C4F; color: #fff; font-weight: 700;
                    font-size: 14px; text-decoration: none; border-radius: 9px;">
            Reset your password
          </a>
          <p style="font-size: 13px; color: #5d6781; line-height: 1.6;">
            If you didn't request this, you can safely ignore this email —
            your password won't change unless you click the link above.
          </p>
        </div>
      `,
    });

    if (sendError) {
      return { ok: false, error: `Reset link created, but the email failed to send: ${sendError.message}` };
    }
  } catch (err) {
    return {
      ok: false,
      error: `Reset link created, but the email failed to send: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }

  return { ok: true };
}

/**
 * Creates the teacher row, then generates the auth invite and sends
 * it via Resend — see sendTeacherInviteEmail above for why this isn't
 * a single inviteUserByEmail call.
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

  const inviteResult = await sendTeacherInviteEmail(email, name);

  if (!inviteResult.ok) {
    // The teacher row exists but the invite failed to send — don't
    // roll back the row. A resend is one click from the teacher list;
    // losing the row means re-entering everything. Surfaced clearly
    // so the admin knows to retry the invite specifically, not
    // re-create the teacher.
    return {
      ok: false,
      error: `Teacher created, but ${inviteResult.error.charAt(0).toLowerCase()}${inviteResult.error.slice(1)} Use "Resend invite" on their row.`,
    };
  }

  revalidatePath("/admin/teachers");
  return { ok: true, id: teacher.id };
}

export async function resendTeacherInvite(email: string, name: string): Promise<Result> {
  await assertAdmin();

  const result = await sendTeacherInviteEmail(email, name);
  if (!result.ok) return { ok: false, error: result.error };

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
