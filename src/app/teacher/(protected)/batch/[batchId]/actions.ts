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
 *
 * Used by every function in this file — Class tab, Overview header,
 * and Homework tab all share this one definition rather than each
 * redeclaring it, since a Server Action invoked directly is the real
 * security boundary regardless of which tab called it.
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

/* ══════════════════════════════════════════════════════════════
   BATCH IDENTITY — for the shell header
   ══════════════════════════════════════════════════════════════ */

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

/* ══════════════════════════════════════════════════════════════
   CLASS SESSION — instructor, meet link, live toggle
   Same shape as admin's batch-actions.ts BatchSessionInput/
   saveBatchSession/setBatchLive — deliberately not re-derived, this
   IS the same underlying operation, just gated by teacher access
   instead of assertAdmin().
   ══════════════════════════════════════════════════════════════ */

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

/* ══════════════════════════════════════════════════════════════
   BATCH WEEK CONTENT — title/note, the per-batch curriculum feature
   ══════════════════════════════════════════════════════════════ */

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

/* ══════════════════════════════════════════════════════════════
   HOMEWORK — grading queue, by-assignment roster, return-with-feedback
   The RPCs these call (get_grading_queue, get_homework_roster,
   return_homework) were hardcoded admin-only before migration 0046 —
   every one of them now also checks is_teacher_for_batch internally.
   assertTeacherForBatch below is belt-and-suspenders: not the only
   gate, but it turns a raw RPC exception into a clear, specific error
   before the UI ever sees it.
   ══════════════════════════════════════════════════════════════ */

export type GradingQueueItem = {
  submission_id: string;
  summer_student_id: string;
  student_name: string;
  summer_id: string;
  batch_id: string;
  resource_id: string;
  resource_title: string;
  week: number;
  day_number: number | null;
  submission_type: "link" | "file" | null;
  url: string | null;
  storage_path: string | null;
  submitted_at: string;
};

export async function getTeacherGradingQueue(
  batchId: string
): Promise<{ ok: true; queue: GradingQueueItem[] } | { ok: false; error: string }> {
  try {
    const supabase = await assertTeacherForBatch(batchId);

    // 0046: get_grading_queue now checks is_teacher_for_batch itself
    // too — this call is scoped explicitly to ONE batch (never null),
    // so a teacher never accidentally sees "all batches I'm allowed
    // to see" mixed together on a page meant to show one batch's
    // queue.
    const { data, error } = await supabase.rpc("get_grading_queue", {
      p_batch_id: batchId,
    });

    if (error) return { ok: false, error: error.message };

    return { ok: true, queue: (data ?? []) as GradingQueueItem[] };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Not authorised." };
  }
}

export type HomeworkAssignment = {
  id: string;
  week: number;
  day_number: number | null;
  title: string;
  submission_type: "link" | "file" | null;
};

export async function getTeacherHomeworkAssignments(
  batchId: string
): Promise<{ ok: true; assignments: HomeworkAssignment[] } | { ok: false; error: string }> {
  try {
    const supabase = await assertTeacherForBatch(batchId);

    const { data: batch, error: batchError } = await supabase
      .from("batches")
      .select("year")
      .eq("id", batchId)
      .single();

    if (batchError || !batch) {
      return { ok: false, error: batchError?.message ?? "Batch not found." };
    }

    // Same nullable-batch_id cohort-wide-or-override pattern as
    // Resources (0045's own note on this) — mirrors
    // getBatchHomeworkAssignments' exact .or() shape from admin's
    // batch-actions.ts, not reinvented.
    const { data, error } = await supabase
      .from("summer_resources")
      .select("id, week, day_number, title, submission_type")
      .eq("cohort_year", batch.year)
      .eq("kind", "homework")
      .not("submission_type", "is", null)
      .or(`batch_id.is.null,batch_id.eq.${batchId}`)
      .order("week", { ascending: true });

    if (error) return { ok: false, error: error.message };

    return { ok: true, assignments: (data ?? []) as HomeworkAssignment[] };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Not authorised." };
  }
}

export type HomeworkRosterItem = {
  summer_student_id: string;
  submission_id: string | null;
  name: string;
  status: "assigned" | "turned_in" | "returned";
  submitted_at: string | null;
  submission_url: string | null;
  submission_storage_path: string | null;
  feedback: string | null;
  returned_at: string | null;
};

export async function getTeacherHomeworkRoster(
  resourceId: string,
  batchId: string
): Promise<{ ok: true; roster: HomeworkRosterItem[] } | { ok: false; error: string }> {
  try {
    const supabase = await assertTeacherForBatch(batchId);

    // 0046: get_homework_roster now REQUIRES p_batch_id for a
    // non-admin caller and checks is_teacher_for_batch on it — never
    // omitted here, matching that requirement.
    const { data, error } = await supabase.rpc("get_homework_roster", {
      p_resource_id: resourceId,
      p_batch_id: batchId,
    });

    if (error) return { ok: false, error: error.message };

    const roster: HomeworkRosterItem[] = (data ?? []).map((row: any) => ({
      summer_student_id: row.summer_student_id,
      submission_id: row.submission_id,
      name: row.student_name,
      status: row.status,
      submitted_at: row.submitted_at,
      submission_url: row.url,
      submission_storage_path: row.storage_path,
      feedback: row.feedback,
      returned_at: row.returned_at,
    }));

    return { ok: true, roster };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Not authorised." };
  }
}

/**
 * batchId is required here specifically so this function can call
 * assertTeacherForBatch BEFORE touching return_homework at all —
 * return_homework (0046) also checks is_teacher_for_batch internally
 * by resolving the submission's own batch, but that's a second,
 * independent check, not a substitute for gating the Server Action
 * itself. Belt-and-suspenders, same posture as everywhere else.
 */
export async function returnTeacherHomework(
  batchId: string,
  submissionId: string,
  feedback: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await assertTeacherForBatch(batchId);

    const { error } = await supabase.rpc("return_homework", {
      p_submission_id: submissionId,
      p_feedback: feedback.trim() || null,
    });

    if (error) return { ok: false, error: error.message };

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Not authorised." };
  }
}

/**
 * Teacher-scoped counterpart to admin's getSubmissionFileUrl —
 * that one is assertAdmin()-gated (a teacher calling it would throw
 * immediately) and ALSO never applied the { download: filename }
 * option doc 07 already documents as a real, previously-hit bug
 * (inline rendering instead of downloading for browser-renderable
 * types). Fixed here from the start, same as the Resources tab's
 * equivalent action, rather than repeating either gap a third time.
 */
export async function getTeacherSubmissionFileUrl(
  batchId: string,
  storagePath: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const supabase = await assertTeacherForBatch(batchId);

    const rawName = storagePath.split("/").pop() ?? "file";
    const downloadName = rawName.replace(/^\d+-/, "");

    const { data, error } = await supabase.storage
      .from("summer")
      .createSignedUrl(storagePath, 600, { download: downloadName });

    if (error || !data) {
      console.error("getTeacherSubmissionFileUrl:", storagePath, error?.message);
      return { ok: false, error: "Could not generate a file URL." };
    }

    return { ok: true, url: data.signedUrl };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Not authorised." };
  }
}
