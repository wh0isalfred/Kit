import { createClient } from "@/lib/supabase/server";
import SummerAdmin, { type Cohort, type Week } from "./SummerAdmin";
import SummerResources, { type Resource } from "./SummerResources";
import BatchSessionManager, { type BatchOption, type BatchSession } from "./BatchSessionManager";

export const dynamic = "force-dynamic";

export default async function AdminSummerPage() {
  const supabase = await createClient();

  const { data: cohorts, error } = await supabase
    .from("summer_cohorts")
    .select(
      "year, label, current_week, starts_on, ends_on, registration_opens_at, registration_closes_at, active, prize_kobo,is_live, live_started_at"
    )
    .order("year", { ascending: false });

  if (error) {
    return (
      <>
        <header className="admin-head">
          <h1>Summer Programme</h1>
        </header>
        <p className="af-submit-error">Couldn&apos;t load cohorts: {error.message}</p>
      </>
    );
  }

  const active = cohorts?.find((c) => c.active) ?? cohorts?.[0];

  const { data: weeks } = active
    ? await supabase
        .from("summer_content")
        .select("cohort_year, week, published, class_title, class_note, updated_at")
        .eq("cohort_year", active.year)
        .order("week")
    : { data: [] };

  const { data: resources } = active
    ? await supabase
        .from("summer_resources")
        .select("*")
        .eq("cohort_year", active.year)
        .order("week")
        .order("day_number", { nullsFirst: false })
        .order("sort_order")
    : { data: [] };

  /* Roster size — context when setting dates, and the number that
     says whether the Summer ID space is filling up
     (generate_summer_id refuses past 50% of 1,000). */
  const { count: rosterCount } = active
    ? await supabase
        .from("summer_students")
        .select("id", { count: "exact", head: true })
        .eq("cohort_year", active.year)
    : { count: 0 };

  /* Batches for this cohort year — course_slug is literally "summer"
     (confirmed against a real inserted row, not assumed). Batches
     themselves still only get created by hand in the DB; this just
     reads whatever exists. */
  const { data: batches } = active
    ? await supabase
        .from("batches")
        .select("id, cohort_label, status")
        .eq("year", active.year)
        .eq("course_slug", "summer")
        .order("cohort_label")
    : { data: [] };

  const batchIds = (batches ?? []).map((b) => b.id);
  const { data: batchSessions } = batchIds.length
    ? await supabase
        .from("summer_batch_sessions")
        .select("batch_id, week, instructor, meet_link, next_class_at, is_live, live_started_at")
        .in("batch_id", batchIds)
    : { data: [] };

  return (
    <>
      {/* NOTE: no <main> here — the (protected) layout already
          provides one. Nesting them was breaking the page heading. */}
      <header className="admin-head">
        <div>
          <h1>Summer Programme</h1>
          <p>Cohort dates, weekly content, and the resources students see.</p>
        </div>
      </header>

      <SummerAdmin
        cohorts={(cohorts ?? []) as Cohort[]}
        weeks={(weeks ?? []) as Week[]}
        rosterCount={rosterCount ?? 0}
      />

      <BatchSessionManager
        batches={(batches ?? []) as BatchOption[]}
        sessions={(batchSessions ?? []) as BatchSession[]}
      />

      {active && (
        <SummerResources
          cohortYear={active.year}
          currentWeek={active.current_week}
          weeksWithContent={(weeks ?? []).map((w) => w.week)}
          resources={(resources ?? []) as Resource[]}
        />
      )}
    </>
  );
}
