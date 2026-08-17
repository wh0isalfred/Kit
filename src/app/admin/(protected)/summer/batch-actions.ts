"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

type Result<T = {}> = { ok: true; id?: string } & T | { ok: false; error: string };

export async function createBatch(
  courseSlug: string,
  year: number,
  cohortNumber: number,
  label: string,
  capacity: number
): Promise<Result<{ id: string }>> {
  const supabase = await assertAdmin();

  if (!label.trim()) {
    return { ok: false, error: "Batch label is required" };
  }
  if (capacity < 1) {
    return { ok: false, error: "Capacity must be at least 1" };
  }

  const { data, error } = await supabase
    .from("batches")
    .insert({
      course_slug: courseSlug,
      year,
      cohort_number: cohortNumber,
      cohort_label: label.trim(),
      capacity,
      status: "active",
      next_student_no: 1,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/summer");
  return { ok: true, id: data.id };
}

export async function updateBatch(
  batchId: string,
  label: string,
  capacity: number
): Promise<Result> {
  const supabase = await assertAdmin();

  if (!label.trim()) {
    return { ok: false, error: "Batch label is required" };
  }
  if (capacity < 1) {
    return { ok: false, error: "Capacity must be at least 1" };
  }

  const { error } = await supabase
    .from("batches")
    .update({
      cohort_label: label.trim(),
      capacity,
    })
    .eq("id", batchId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/summer");
  return { ok: true };
}

export async function deleteBatch(batchId: string): Promise<Result> {
  const supabase = await assertAdmin();

  const { count } = await supabase
    .from("summer_students")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", batchId);

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `This batch has ${count} student${count === 1 ? "" : "s"} enrolled. Remove them first or reassign to another batch.`,
    };
  }

  const { error } = await supabase.from("batches").delete().eq("id", batchId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/summer");
  return { ok: true };
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

export async function returnHomework(
  submissionId: string,
  feedback: string
): Promise<Result> {
  const supabase = await assertAdmin();

  const { error } = await supabase.rpc("return_homework", {
    p_submission_id: submissionId,
    p_feedback: feedback.trim() || null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/summer");
  return { ok: true };
}

export async function getHomeworkRoster(
  resourceId: string,
  batchId: string
): Promise<{ ok: true; roster: HomeworkRosterItem[] } | { ok: false; error: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_homework_roster", {
    p_resource_id: resourceId,
    p_batch_id: batchId,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

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
}

export type BatchSessionInput = {
  batch_id: string;
  week: number;
  instructor: string | null;
  meet_link: string | null;
  next_class_at: string | null;
};

export async function saveBatchSession(input: BatchSessionInput): Promise<Result> {
  const supabase = await assertAdmin();

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

  revalidatePath("/admin/summer");
  revalidatePath("/smportal");
  return { ok: true };
}

export async function setBatchLive(
  batchId: string,
  week: number,
  live: boolean
): Promise<Result> {
  const supabase = await assertAdmin();

  const { error } = await supabase.rpc("set_batch_live", {
    p_batch_id: batchId,
    p_week: week,
    p_live: live,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/summer");
  revalidatePath("/smportal");
  return { ok: true };
}

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

export async function getGradingQueue(
  batchId: string | null
): Promise<{ ok: true; queue: GradingQueueItem[] } | { ok: false; error: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_grading_queue", {
    p_batch_id: batchId,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, queue: (data ?? []) as GradingQueueItem[] };
}

export async function getSubmissionFileUrl(
  storagePath: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const supabase = await assertAdmin();

  const { data, error } = await supabase.storage
    .from("summer")
    .createSignedUrl(storagePath, 600);

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not generate a file URL." };
  }

  return { ok: true, url: data.signedUrl };
}

export type HomeworkAssignment = {
  id: string;
  week: number;
  day_number: number | null;
  title: string;
  submission_type: "link" | "file" | null;
};

export async function getBatchHomeworkAssignments(
  batchId: string
): Promise<{ ok: true; assignments: HomeworkAssignment[] } | { ok: false; error: string }> {
  const supabase = await createClient();

  const { data: batch, error: batchError } = await supabase
    .from("batches")
    .select("year")
    .eq("id", batchId)
    .single();

  if (batchError || !batch) {
    return { ok: false, error: batchError?.message ?? "Batch not found." };
  }

  const { data, error } = await supabase
    .from("summer_resources")
    .select("id, week, day_number, title, submission_type")
    .eq("cohort_year", batch.year)
    .eq("kind", "homework")
    .not("submission_type", "is", null)
    .or(`batch_id.is.null,batch_id.eq.${batchId}`)
    .order("week", { ascending: true });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, assignments: (data ?? []) as HomeworkAssignment[] };
}

export type BatchOverview = {
  batch_label: string;
  capacity: number;
  seats_used: number;
  status: string;
  current_week: number;
  is_live: boolean;
  next_class_at: string | null;
  assignments_published: number;
  assignments_total: number;
  submissions_returned: number;
  submissions_turned_in: number;
};

// Read-only landing pad (doc 06 §IV, built last per its own
// instruction). Bundles everything the Overview tab needs into one
// call rather than the page firing five separate queries itself.
export async function getBatchOverview(
  batchId: string
): Promise<{ ok: true; overview: BatchOverview } | { ok: false; error: string }> {
  const supabase = await createClient();

  const [{ data: batch, error: batchError }, { data: cohorts }] = await Promise.all([
    supabase.from("batches").select("cohort_label, capacity, status, year").eq("id", batchId).single(),
    supabase.from("summer_cohorts").select("year, active, current_week").order("year", { ascending: false }),
  ]);

  if (batchError || !batch) {
    return { ok: false, error: batchError?.message ?? "Batch not found." };
  }

  const activeCohort = cohorts?.find((c) => c.active) ?? cohorts?.[0] ?? null;
  const currentWeek = activeCohort?.current_week ?? 1;

  const [{ data: students }, { data: session }, { data: resources }] = await Promise.all([
    supabase.from("summer_students").select("id").eq("batch_id", batchId),
    supabase
      .from("summer_batch_sessions")
      .select("is_live, next_class_at")
      .eq("batch_id", batchId)
      .eq("week", currentWeek)
      .maybeSingle(),
    supabase
      .from("summer_resources")
      .select("id, published")
      .eq("cohort_year", batch.year)
      .eq("kind", "homework")
      .not("submission_type", "is", null)
      .or(`batch_id.is.null,batch_id.eq.${batchId}`),
  ]);

  const studentIds = (students ?? []).map((s) => s.id);
  const assignmentIds = (resources ?? []).map((r) => r.id);
  const assignmentsPublished = (resources ?? []).filter((r) => r.published).length;

  let submissionsReturned = 0;
  let submissionsTurnedIn = 0;

  if (assignmentIds.length > 0 && studentIds.length > 0) {
    const { data: submissions } = await supabase
      .from("summer_submissions")
      .select("status")
      .in("resource_id", assignmentIds)
      .in("summer_student_id", studentIds);

    submissionsReturned = (submissions ?? []).filter((s) => s.status === "returned").length;
    submissionsTurnedIn = (submissions ?? []).filter((s) => s.status === "turned_in").length;
  }

  return {
    ok: true,
    overview: {
      batch_label: batch.cohort_label,
      capacity: batch.capacity,
      seats_used: studentIds.length,
      status: batch.status,
      current_week: currentWeek,
      is_live: session?.is_live ?? false,
      next_class_at: session?.next_class_at ?? null,
      assignments_published: assignmentsPublished,
      assignments_total: assignmentIds.length,
      submissions_returned: submissionsReturned,
      submissions_turned_in: submissionsTurnedIn,
    },
  };
}

/* ══════════════════════════════════════════════════════════════
   BATCH WEEK CONTENT — title/note, per-batch curriculum
   Admin's own version of the same functions built for teachers
   (teacher/batch/[batchId]/actions.ts) — same table
   (batch_week_content, migration 0040), same shape, gated by
   assertAdmin() instead of assertTeacherForBatch since batch_week_content
   already has an is_admin() ALL policy from 0040. Added here because
   admin's Class tab (ClassSessionForm.tsx) never got the week-content
   block that shipped for teachers — admin and teacher were showing
   different things on the same tab until this.
   ══════════════════════════════════════════════════════════════ */

export type BatchWeekContent = {
  title: string | null;
  note_to_students: string | null;
  published: boolean;
};

export async function getBatchWeekContentAdmin(
  batchId: string,
  weekNumber: number
): Promise<{ ok: true; content: BatchWeekContent | null } | { ok: false; error: string }> {
  const supabase = await assertAdmin();

  const { data, error } = await supabase
    .from("batch_week_content")
    .select("title, note_to_students, published")
    .eq("batch_id", batchId)
    .eq("week_number", weekNumber)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };

  return { ok: true, content: data };
}

export type SaveBatchWeekContentAdminInput = {
  batch_id: string;
  week_number: number;
  title: string;
  note_to_students: string;
  published: boolean;
};

export async function saveBatchWeekContentAdmin(
  input: SaveBatchWeekContentAdminInput
): Promise<Result> {
  const supabase = await assertAdmin();

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

  revalidatePath("/admin/summer");
  return { ok: true };
}