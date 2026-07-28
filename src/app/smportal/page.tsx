import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSummerSession } from "../summer/summer-session";
import PortalContent, { type PortalWeek, type PortalResource } from "./PortalContent";
import Footer from "@/components/site/Footer";
import { getActiveSummerCohort } from "@/lib/summer";

export const dynamic = "force-dynamic";

/**
 * /smportal — the gated classroom.
 *
 * No valid session cookie -> back to /summer to sign in. This is the
 * whole access model (ADR 002): there is no Supabase Auth here, the
 * cookie is the credential.
 *
 * Data comes from two SECURITY DEFINER functions that already know
 * which cohort is active and which week is current, so this page
 * doesn't decide any of that — it just renders what it's handed.
 */
export default async function PortalPage() {
  const session = await getSummerSession();
  if (!session) redirect("/summer");

  const supabase = await createClient();

  // Read the cohort here, INSIDE the function — this runs per request,
  // so cookies() is valid. The top-level version broke the build.
  const cohort = await getActiveSummerCohort();

  const { data: student } = await supabase
    .from("summer_students")
    .select("name, cohort_year")
    .eq("id", session.sid)
    .maybeSingle();

  if (!student) redirect("/summer");

  const { data: portal } = await supabase.rpc("get_summer_portal", {
    p_cohort_year: session.year,
  });

  const { data: resources } = await supabase.rpc("get_summer_resources", {
    p_cohort_year: session.year,
  });

  const week = portal?.[0] ?? null;

  /* Group resources by week for display. get_summer_resources
     already returns them newest-week-first, day-ordered. */
  const byWeek = new Map<number, PortalResource[]>();
  for (const r of (resources ?? []) as PortalResource[]) {
    const list = byWeek.get(r.week) ?? [];
    list.push(r);
    byWeek.set(r.week, list);
  }
  const weekGroups: PortalWeek[] = Array.from(byWeek.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([weekNo, items]) => ({ week: weekNo, resources: items }));

  return (
    <div>
      <PortalContent
        studentName={student.name}
        cohortYear={student.cohort_year}
        cohortStartsOn={cohort?.startsOn ?? null}
        cohortEndsOn={cohort?.endsOn ?? null}
        currentWeek={week}
        weekGroups={weekGroups}
        isLive={cohort?.isLive ?? false}
      />
      <Footer />
    </div>
  );
}
