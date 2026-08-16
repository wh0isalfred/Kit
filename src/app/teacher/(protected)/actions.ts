"use server";

import { createClient } from "@/lib/supabase/server";

export type MyBatch = {
  id: string;
  cohort_label: string;
  course_slug: string;
  course_title: string;
  programme_type: "summer" | "term";
  capacity: number;
  seats_used: number;
  current_week: number | null;
  is_live: boolean;
  grading_count: number;
};

/**
 * Deliberately NOT assertAdmin() — this runs as the teacher's own
 * session. RLS is the real gate here: teacher_batches' own SELECT
 * policy already restricts this to "their own grants, nothing else"
 * (0039), so this query can only ever return what the teacher already
 * has explicit permission to see. No is_teacher_for_batch() call
 * needed in application code — Postgres enforces it at the row level
 * regardless of what this function does or doesn't check.
 *
 * One get_grading_queue(null) call for everything, grouped
 * client-side by batch_id — same "never fetch grading counts per
 * batch in a loop" discipline doc 06 §III already established for
 * admin's batch cards, applied here for the same reason.
 */
export async function getMyBatches(): Promise<
  { ok: true; batches: MyBatch[] } | { ok: false; error: string }
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Not signed in." };

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!teacher) return { ok: false, error: "No teacher profile found for this account." };

  const { data: grants, error: grantsError } = await supabase
    .from("teacher_batches")
    .select("batch_id")
    .eq("teacher_id", teacher.id);

  if (grantsError) return { ok: false, error: grantsError.message };

  const batchIds = (grants ?? []).map((g) => g.batch_id);

  if (batchIds.length === 0) {
    return { ok: true, batches: [] };
  }

  const { data: batches, error: batchesError } = await supabase
    .from("batches")
    .select("id, cohort_label, course_slug, capacity")
    .in("id", batchIds);

  if (batchesError) return { ok: false, error: batchesError.message };

  const { data: courses } = await supabase.from("courses").select("slug, title, type");
  const courseInfo = new Map<string, { title: string; type: string }>(
    (courses ?? []).map((c) => [c.slug, { title: c.title, type: c.type }])
  );

  const { data: students } = await supabase
    .from("students")
    .select("batch_id")
    .in("batch_id", batchIds)
    .eq("status", "active");

  const { data: summerStudents } = await supabase
    .from("summer_students")
    .select("batch_id")
    .in("batch_id", batchIds);

  // current_week is still cohort-wide (doc 01 §23, doc 06 §VIII's own
  // flagged limitation) — this reads the same value every batch card
  // on /admin/summer already reads, not something this page fixes.
  // batch_week_content (0040) changes what a batch's week CONTENT is,
  // not which week number is currently active.
  const { data: cohorts } = await supabase
    .from("summer_cohorts")
    .select("year, active, current_week");
  const activeCohort = (cohorts ?? []).find((c) => c.active) ?? cohorts?.[0] ?? null;
  const currentWeek = activeCohort?.current_week ?? null;

  const { data: sessions } = currentWeek
    ? await supabase
        .from("summer_batch_sessions")
        .select("batch_id, is_live")
        .in("batch_id", batchIds)
        .eq("week", currentWeek)
    : { data: [] as { batch_id: string; is_live: boolean }[] };

  const liveByBatch = new Map((sessions ?? []).map((s) => [s.batch_id, s.is_live]));

  // One call for the whole set of batches, grouped client-side —
  // not one call per batch in a loop.
  const { data: queue } = await supabase.rpc("get_grading_queue", { p_batch_id: null });
  const gradingByBatch = new Map<string, number>();
  for (const row of (queue ?? []) as { batch_id: string }[]) {
    if (batchIds.includes(row.batch_id)) {
      gradingByBatch.set(row.batch_id, (gradingByBatch.get(row.batch_id) ?? 0) + 1);
    }
  }

  const result: MyBatch[] = (batches ?? []).map((b) => {
    const course = courseInfo.get(b.course_slug);
    const isSummer = course?.type === "summer";
    const seats_used = isSummer
      ? (summerStudents ?? []).filter((s) => s.batch_id === b.id).length
      : (students ?? []).filter((s) => s.batch_id === b.id).length;

    return {
      id: b.id,
      cohort_label: b.cohort_label,
      course_slug: b.course_slug,
      course_title: course?.title ?? b.course_slug,
      programme_type: (course?.type as "summer" | "term") ?? "summer",
      capacity: b.capacity,
      seats_used,
      current_week: currentWeek,
      is_live: liveByBatch.get(b.id) ?? false,
      grading_count: gradingByBatch.get(b.id) ?? 0,
    };
  });

  return { ok: true, batches: result };
}
