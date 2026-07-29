import { createClient } from "@/lib/supabase/server";
import SummerAdmin from "./SummerAdmin";
import BatchManagement from "./BatchManagement";
import SummerResources from "./SummerResources";
import BatchSessionManager from "./BatchSessionManager";
import type { Cohort, Week } from "./SummerAdmin";
import type { Resource } from "./SummerResources";
import type { BatchSession, HomeworkResource } from "./BatchSessionManager";

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

  const { data: batchSessions } = await supabase
    .from("summer_batch_sessions")
    .select("*");

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

  /* Compute real seat counts for batches. All summer batches are keyed
     by course_slug = "summer", regardless of cohort year. */
  const batchesWithSeats = (batchRows ?? []).map((b) => ({
    id: b.id,
    cohort_label: b.cohort_label,
    capacity: b.capacity,
    status: b.status,
    seats_used: (summerStudents ?? []).filter((s) => s.batch_id === b.id).length,
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

  const activeSessions = (batchSessions ?? []).filter(
    (s) => batchesWithSeats.some((b) => b.id === s.batch_id)
  ) as BatchSession[];

  /* Group homework resources by week for easy lookup in BatchSessionManager */
const homeworkByWeek = new Map<
    number,
    Array<{ id: string; title: string; submission_type: string | null }>
  >();
  activeResources
    .filter((r) => r.submission_type !== null)
    .forEach((r) => {
      if (!homeworkByWeek.has(r.week)) {
        homeworkByWeek.set(r.week, []);
      }
      homeworkByWeek.get(r.week)!.push({
        id: r.id,
        title: r.title,
        submission_type: r.submission_type as "link" | "file",
      });
    });

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

      {/* ── Batch management (NEW) ──────────────────────────── */}
      <BatchManagement courseSlug="summer" year={activeCohort.year} batches={batchesWithSeats} />

      {/* ── Live class & batch sessions ──────────────────────── */}
      <BatchSessionManager
        batches={batchesWithSeats.map((b) => ({
          id: b.id,
          cohort_label: b.cohort_label,
          status: b.status,
        }))}
        sessions={activeSessions}
        homeworkByWeek={homeworkByWeek}
      />

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
