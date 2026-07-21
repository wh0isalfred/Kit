import { createClient } from "@/lib/supabase/server";

export type SummerCohort = {
  year: number;
  label: string;
  currentWeek: number;
  startsOn: string | null;
  endsOn: string | null;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  prizeNaira: number | null;
};

/**
 * The one cohort admin has marked active. Reads `summer_cohorts`
 * directly — migration 0015 added a public read policy scoped to
 * `active` only, so this works without a session. The roster
 * (summer_students) stays admin-only and is not touched here.
 *
 * Returns null when nothing is configured. Callers must treat that
 * as "hide the dated parts", never as a reason to invent a date.
 */
export async function getActiveSummerCohort(): Promise<SummerCohort | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("summer_cohorts")
    .select(
      "year, label, current_week, starts_on, ends_on, registration_opens_at, registration_closes_at, prize_kobo"
    )
    .eq("active", true)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("getActiveSummerCohort:", error.message);
    return null;
  }

  return {
    year: data.year,
    label: data.label,
    currentWeek: data.current_week,
    startsOn: data.starts_on,
    endsOn: data.ends_on,
    registrationOpensAt: data.registration_opens_at,
    registrationClosesAt: data.registration_closes_at,
    prizeNaira: data.prize_kobo !== null ? data.prize_kobo / 100 : null,
  };
}

/** "August", or null when no start date is set. */
export function campMonth(startsOn: string | null): string | null {
  if (!startsOn) return null;
  return new Date(startsOn).toLocaleDateString("en-NG", { month: "long" });
}

/** Whole weeks between start and end, rounded. Null if either is missing. */
export function campWeeks(
  startsOn: string | null,
  endsOn: string | null
): number | null {
  if (!startsOn || !endsOn) return null;
  const ms = new Date(endsOn).getTime() - new Date(startsOn).getTime();
  if (ms <= 0) return null;
  return Math.max(1, Math.round(ms / (7 * 86400000)));
}
