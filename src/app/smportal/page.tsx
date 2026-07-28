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
    .select("name, cohort_year, batch_id")
    .eq("id", session.sid)
    .maybeSingle();

  if (!student) redirect("/summer");

  const { data: portal } = await supabase.rpc("get_summer_portal", {
    p_cohort_year: session.year,
    p_summer_student_id: session.sid,
  });

  const { data: resources } = await supabase.rpc("get_summer_resources", {
    p_cohort_year: session.year,
    p_summer_student_id: session.sid,
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
        batchId={student.batch_id ?? null}
        currentWeek={week}
        weekGroups={weekGroups}
        // is_live now comes from the batch-scoped session (via
        // get_summer_portal's new column), not the old cohort-wide
        // flag — a batch with no session row yet defaults to false,
        // same "say nothing" posture as everywhere else.
        isLive={week?.is_live ?? false}
      />
      <Footer />
    </div>
  );
}
