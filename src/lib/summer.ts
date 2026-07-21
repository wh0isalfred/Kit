import { createClient } from "@/lib/supabase/server";

export type SummerSchedule = {
  cohortYear: number;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null; // drives the homepage countdown
  campStartsAt: string | null;
  campEndsAt: string | null;
};

/**
 * The one row admin has marked `is_active` — "this year's" dates.
 * Returns null if nothing has been configured yet (fresh install
 * state, or between cohorts), which callers should treat as "hide
 * the countdown" rather than showing a broken date.
 */
export async function getActiveSummerSchedule(): Promise<SummerSchedule | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("summer_camp_settings")
    .select(
      "cohort_year, registration_opens_at, registration_closes_at, camp_starts_at, camp_ends_at"
    )
    .eq("is_active", true)
    .order("cohort_year", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("getActiveSummerSchedule:", error.message);
    return null;
  }

  return {
    cohortYear: data.cohort_year,
    registrationOpensAt: data.registration_opens_at,
    registrationClosesAt: data.registration_closes_at,
    campStartsAt: data.camp_starts_at,
    campEndsAt: data.camp_ends_at,
  };
}
