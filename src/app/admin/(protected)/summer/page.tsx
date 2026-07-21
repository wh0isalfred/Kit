import { createClient } from "@/lib/supabase/server";
import SummerAdmin, { type Cohort, type Week } from "./SummerAdmin";

export const dynamic = "force-dynamic";

export default async function AdminSummerPage() {
  const supabase = await createClient();

  const { data: cohorts, error } = await supabase
    .from("summer_cohorts")
    .select(
      "year, label, current_week, starts_on, ends_on, registration_opens_at, registration_closes_at, active, prize_kobo"
    )
    .order("year", { ascending: false });

  if (error) {
    return (
      <main className="admin-page">
        <h1>Summer Programme</h1>
        <p className="af-submit-error">Couldn&apos;t load cohorts: {error.message}</p>
      </main>
    );
  }

  const active = cohorts?.find((c) => c.active) ?? cohorts?.[0];

  const { data: weeks } = active
    ? await supabase
        .from("summer_content")
        .select("cohort_year, week, published, class_title, class_note, meet_link, next_class_at, updated_at")
        .eq("cohort_year", active.year)
        .order("week")
    : { data: [] };

  // Roster size — useful context when setting dates, and it's the
  // number that tells you whether the Summer ID space is filling up
  // (generate_summer_id refuses past 50% of 1,000).
  const { count: rosterCount } = active
    ? await supabase
        .from("summer_students")
        .select("id", { count: "exact", head: true })
        .eq("cohort_year", active.year)
    : { count: 0 };

  return (
    <main className="admin-page">
      <h1>Summer Programme</h1>
      <SummerAdmin
        cohorts={(cohorts ?? []) as Cohort[]}
        weeks={(weeks ?? []) as Week[]}
        rosterCount={rosterCount ?? 0}
      />
    </main>
  );
}
