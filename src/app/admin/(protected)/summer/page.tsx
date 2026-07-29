import { createClient } from "@/lib/supabase/server";
import SummerAdmin from "./SummerAdmin";
import BatchManagement from "./BatchManagement";
import SummerResources from "./SummerResources";
import { getGradingQueue } from "./batch-actions";
import type { Cohort, Week } from "./SummerAdmin";
import type { Resource } from "./SummerResources";

export const dynamic = "force-dynamic";

export default async function SummerAdminPage() {
  const supabase = await createClient();

  const { data: cohorts } = await supabase
    .from("summer_cohorts")
    .select("*")
    .order("year", { ascending: false });

  const { data: weeks } = await supabase
    .from("summer_content")
    .select("*")
    .order("week", { ascending: true });

  const { data: resources } = await supabase
    .from("summer_resources")
    .select("*")
    .order("week, sort_order");

  const { data: batchRows } = await supabase
    .from("batches")
    .select("id, cohort_label, course_slug, capacity, status")
    .eq("course_slug", "summer");

  const { data: summerStudents } = await supabase
    .from("summer_students")
    .select("batch_id");

  if (!cohorts || cohorts.length === 0) {
    return (
      <>
        <header className="admin-head">
          <h1>Summer Admin</h1>
        </header>
        <p className="admin-warn">
          No summer cohort exists yet. Insert a row into <code>summer_cohorts</code> first.
        </p>
      </>
    );
  }

  const activeCohort = cohorts.find((c) => c.active) ?? cohorts[0];

  const rosterCount = (summerStudents ?? []).length;

  // Live status per batch for THIS week only — current_week is
  // cohort-wide (doc 06 §VIII trap), so every card shows the same
  // week number until per-batch weeks exist.
  const { data: currentWeekSessions } = await supabase
    .from("summer_batch_sessions")
    .select("batch_id, is_live")
    .eq("week", activeCohort.current_week);

  // ONE call for the whole cohort, grouped here — not one
  // get_grading_queue call per batch (doc 06 §III's explicit
  // warning), and not a second counts-only RPC that could drift out
  // of sync with the queue itself.
  const gradingRes = await getGradingQueue(null);
  const gradingByBatch = new Map<string, number>();
  if (gradingRes.ok) {
    gradingRes.queue.forEach((item) => {
      gradingByBatch.set(item.batch_id, (gradingByBatch.get(item.batch_id) ?? 0) + 1);
    });
  }

  /* Compute real seat counts for batches, plus this week's live
     status and grading count. All summer batches are keyed by
     course_slug = "summer", regardless of cohort year. */
  const batchesWithSeats = (batchRows ?? []).map((b) => ({
    id: b.id,
    cohort_label: b.cohort_label,
    capacity: b.capacity,
    status: b.status,
    seats_used: (summerStudents ?? []).filter((s) => s.batch_id === b.id).length,
    current_week: activeCohort.current_week,
    is_live: (currentWeekSessions ?? []).some((s) => s.batch_id === b.id && s.is_live),
    grading_count: gradingByBatch.get(b.id) ?? 0,
  }));

  const activeResources = (resources ?? [])
    .filter((r) => r.cohort_year === activeCohort.year)
    .map((r) => ({
      ...r,
      cohort_year: r.cohort_year,
      week: r.week,
      day_number: r.day_number,
      title: r.title,
      description: r.description,
      kind: r.kind,
      url: r.url,
      storage_path: r.storage_path,
      code_body: r.code_body,
      code_language: r.code_language,
      published: r.published,
      available_from: r.available_from,
      sort_order: r.sort_order,
      submission_type: r.submission_type as "link" | "file" | null,
    })) as Resource[];

  const activeWeeks = (weeks ?? [])
    .filter((w) => w.cohort_year === activeCohort.year)
    .map((w) => ({
      cohort_year: w.cohort_year,
      week: w.week,
      published: w.published,
      class_title: w.class_title,
      class_note: w.class_note,
      updated_at: w.updated_at,
    })) as Week[];

  const weeksWithContent = Array.from(
    new Set(activeResources.map((r) => r.week))
  );

  return (
    <>
      <header className="admin-head">
        <h1>Summer Admin</h1>
        <p>Managing {activeCohort.label}</p>
      </header>

      {/* ── Cohort settings ─────────────────────────────────── */}
      <SummerAdmin
        cohorts={cohorts as Cohort[]}
        weeks={activeWeeks}
        rosterCount={rosterCount}
      />

      {/* ── Batch management ────────────────────────────────── */}
      <BatchManagement
        courseSlug="summer"
        year={activeCohort.year}
        currentWeek={activeCohort.current_week}
        batches={batchesWithSeats}
      />

      {/* Live class controls + homework review live in
          /admin/summer/batch/[batchId] (Class tab, Homework tab). */}

      {/* ── Weekly content & resources ──────────────────────── */}
      <SummerResources
        cohortYear={activeCohort.year}
        currentWeek={activeCohort.current_week}
        weeksWithContent={weeksWithContent}
        resources={activeResources}
      />
    </>
  );
}