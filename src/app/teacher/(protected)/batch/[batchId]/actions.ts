"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Mirrors assertAdmin()'s shape but for the teacher role — same
 * "layout guard is UX convenience, this is the real boundary since a
 * Server Action can be invoked directly" reasoning. Returns the
 * teacher's own teachers.id (not user_id) since that's what
 * teacher_batches.teacher_id and every table 0043/0040 gate on
 * actually key against.
 */
async function assertTeacherForBatch(batchId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id, active")
    .eq("user_id", user.id)
    .single();

  if (!teacher || !teacher.active) throw new Error("Not an active teacher");

  const { data: grant } = await supabase
    .from("teacher_batches")
    .select("batch_id")
    .eq("teacher_id", teacher.id)
    .eq("batch_id", batchId)
    .maybeSingle();

  if (!grant) throw new Error("Not authorised for this batch");

  return supabase;
}

type Result<T = {}> = { ok: true } & T | { ok: false; error: string };

/* ── Batch identity, for the shell header ──────────────────────── */

export type TeacherBatchHeader = {
  id: string;
  cohort_label: string;
  course_title: string;
  capacity: number;
  seats_used: number;
};

export async function getTeacherBatchHeader(
  batchId: string
): Promise<{ ok: true; batch: TeacherBatchHeader } | { ok: false; error: string }> {
  try {
    const supabase = await assertTeacherForBatch(batchId);

    const { data: batch, error } = await supabase
      .from("batches")
      .select("id, cohort_label, capacity, course_slug")
      .eq("id", batchId)
      .single();

    if (error || !batch) return { ok: false, error: error?.message ?? "Batch not found." };

    const { data: course } = await supabase
      .from("courses")
      .select("title, type")
      .eq("slug", batch.course_slug)
      .single();

    const isSummer = course?.type === "summer";
    const { count } = isSummer
      ? await supabase
          .from("summer_students")
          .select("id", { count: "exact", head: true })
          .eq("batch_id", batchId)
      : await supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("batch_id", batchId)
          .eq("status", "active");

    return {
      ok: true,
      batch: {
        id: batch.id,
        cohort_label: batch.cohort_label,
        course_title: course?.title ?? batch.course_slug,
        capacity: batch.capacity,
        seats_used: count ?? 0,
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Not authorised." };
  }
}

/* ── Class session (instructor, meet link, live toggle) ─────────── */
/* Same shape as admin's batch-actions.ts BatchSessionInput/
   saveBatchSession/setBatchLive — deliberately not re-derived, this
   IS the same underlying operation, just gated by teacher access
   instead of assertAdmin(). */

export type TeacherBatchSessionInput = {
  batch_id: string;
  week: number;
  instructor: string | null;
  meet_link: string | null;
  next_class_at: string | null;
};

export async function saveTeacherBatchSession(
  input: TeacherBatchSessionInput
): Promise<Result> {
  try {
    const supabase = await assertTeacherForBatch(input.batch_id);

    if (input.week < 1 || input.week > 3) {
      return { ok: false, error: "Week must be between 1 and 3." };
    }

    const { error } = await supabase
      .from("summer_batch_sessions")
      .upsert(
        {
          batch_id: input.batch_id,
          week: input.week,
          instructor: input.instructor?.trim() || null,
          meet_link: input.meet_link?.trim() || null,
          next_class_at: input.next_class_at || null,
        },
        { onConflict: "batch_id,week" }
      );

    if (error) return { ok: false, error: error.message };

    revalidatePath(`/teacher/batch/${input.batch_id}/class`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Not authorised." };
  }
}

export async function setTeacherBatchLive(
  batchId: string,
  week: number,
  live: boolean
): Promise<Result> {
  try {
    const supabase = await assertTeacherForBatch(batchId);

    // set_batch_live is the same RPC admin uses — SECURITY DEFINER
    // functions in this project don't re-check role themselves (see
    // doc 02 §V's own note on get_my_summer_student trusting the
    // caller), so the real gate here is assertTeacherForBatch above,
    // same as every admin action gates via assertAdmin() before
    // calling the same RPC.
    const { error } = await supabase.rpc("set_batch_live", {
      p_batch_id: batchId,
      p_week: week,
      p_live: live,
    });

    if (error) return { ok: false, error: error.message };

    revalidatePath(`/teacher/batch/${batchId}/class`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Not authorised." };
  }
}

/* ── Batch week content — title/note, the actual new feature ────── */

export type TeacherBatchWeekContent = {
  title: string | null;
  note_to_students: string | null;
  published: boolean;
};

export async function getBatchWeekContent(
  batchId: string,
  weekNumber: number
): Promise<{ ok: true; content: TeacherBatchWeekContent | null } | { ok: false; error: string }> {
  try {
    const supabase = await assertTeacherForBatch(batchId);

    const { data, error } = await supabase
      .from("batch_week_content")
      .select("title, note_to_students, published")
      .eq("batch_id", batchId)
      .eq("week_number", weekNumber)
      .maybeSingle();

    if (error) return { ok: false, error: error.message };

    return { ok: true, content: data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Not authorised." };
  }
}

export type SaveBatchWeekContentInput = {
  batch_id: string;
  week_number: number;
  title: string;
  note_to_students: string;
  published: boolean;
};

export async function saveBatchWeekContent(
  input: SaveBatchWeekContentInput
): Promise<Result> {
  try {
    const supabase = await assertTeacherForBatch(input.batch_id);

    if (input.published && !input.title.trim()) {
      return {
        ok: false,
        error: "Give the week a title before publishing it — students will see this.",
      };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("batch_week_content").upsert(
      {
        batch_id: input.batch_id,
        week_number: input.week_number,
        title: input.title.trim() || null,
        note_to_students: input.note_to_students.trim() || null,
        published: input.published,
        updated_by: user?.id ?? null,
      },
      { onConflict: "batch_id,week_number" }
    );

    if (error) return { ok: false, error: error.message };

    revalidatePath(`/teacher/batch/${input.batch_id}/class`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Not authorised." };
  }
}
