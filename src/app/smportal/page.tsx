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
 * Data comes from SECURITY DEFINER functions that already know which
 * cohort is active and which week is current, so this page doesn't
 * decide any of that — it just renders what it's handed. The student
 * self-lookup below (get_my_summer_student) used to be a raw table
 * read; summer_students' only RLS policy is admin-only, so that read
 * silently returned nothing for every student, always. Fixed 10 Aug
 * 2026 — see migration 0027.
 */
export default async function PortalPage() {
  const session = await getSummerSession();
  if (!session) redirect("/summer");

  const supabase = await createClient();

  // Read the cohort here, INSIDE the function — this runs per request,
  // so cookies() is valid. The top-level version broke the build.
  const cohort = await getActiveSummerCohort();

  const { data: studentRows, error: studentError } = await supabase.rpc(
    "get_my_summer_student",
    { p_summer_student_id: session.sid }
  );

  if (studentError) {
    console.error("PortalPage get_my_summer_student:", studentError.message);
  }

  const student = studentRows?.[0] ?? null;
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

 
  /* Group resources by week for display, newest first — latest week at
     the top, and latest day within each week. */
  const byWeek = new Map<number, PortalResource[]>();
  for (const r of (resources ?? []) as PortalResource[]) {
    const list = byWeek.get(r.week) ?? [];
    list.push(r);
    byWeek.set(r.week, list);
  }
  const weekGroups: PortalWeek[] = Array.from(byWeek.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([weekNo, items]) => ({
      week: weekNo,
      resources: [...items].sort((a, b) => {
        const ad = a.day_number ?? 99;
        const bd = b.day_number ?? 99;
        return bd - ad;
      }),
    }));


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
        isLive={week?.is_live ?? false}
      />
      <Footer />
    </div>
  );
}