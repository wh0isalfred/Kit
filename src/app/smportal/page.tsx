import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSummerSession } from "../summer/summer-session";
import PortalContent, { type PortalWeek, type PortalResource } from "./PortalContent";
import Footer from "@/components/site/Footer";
import { getActiveSummerCohort } from "@/lib/summer";
import { unstable_noStore as noStore } from "next/cache";

const cohort = await getActiveSummerCohort();

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
  noStore();

  const session = await getSummerSession();
  if (!session) redirect("/summer");

  const supabase = await createClient();

  // Who this is — for the greeting. If the row is gone (un-enrolled),
  // the session is stale; send them back.
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
      currentWeek={week}
      weekGroups={weekGroups}
      isLive={cohort?.isLive ?? false}          // ← add
    />
    <Footer/>
    </div>
  );
}
