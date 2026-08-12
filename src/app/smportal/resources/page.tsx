import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSummerSession } from "../../summer/summer-session";
import { getActiveSummerCohort, campWeeks } from "@/lib/summer";
import Footer from "@/components/site/Footer";
import ResourcesContent, { type ResourceWithSize } from "./ResourcesContent";
import type { PortalResource } from "../PortalContent";

export const dynamic = "force-dynamic";

/**
 * /smportal/resources — the full resource library, all weeks.
 *
 * Same cookie-session gating as the main portal (ADR 002 — no
 * Supabase Auth here). Reuses get_summer_resources() exactly as the
 * main portal does; this page just doesn't collapse it down to one
 * week the way the portal's "this week" view does.
 */
export default async function ResourcesPage() {
  const session = await getSummerSession();
  if (!session) redirect("/summer");

  const supabase = await createClient();
  const cohort = await getActiveSummerCohort();

  // Was a raw .from("summer_students") query — summer_students is
  // admin-only at the RLS layer, so that returned null for every
  // student and bounced them straight back to /summer. Same bug that
  // took the whole portal down; same fix (migration 0027).
  const { data: studentRows, error: studentError } = await supabase.rpc(
    "get_my_summer_student",
    { p_summer_student_id: session.sid }
  );

  if (studentError) {
    console.error("ResourcesPage get_my_summer_student:", studentError.message);
  }

  const student = studentRows?.[0] ?? null;
  if (!student) redirect("/summer");

  // p_summer_student_id is REQUIRED — get_summer_resources became
  // batch-aware in 0022, and without the student id the batch filter
  // matches nothing and returns an empty list every time.
  const { data: resources, error: resourcesError } = await supabase.rpc(
    "get_summer_resources",
    {
      p_cohort_year: session.year,
      p_summer_student_id: session.sid,
    }
  );

  if (resourcesError) {
    console.error("ResourcesPage get_summer_resources:", resourcesError.message);
  }

  const list = (resources ?? []) as PortalResource[];
  const withSizes = await attachFileSizes(supabase, list);

  const totalWeeks = cohort ? campWeeks(cohort.startsOn, cohort.endsOn) : null;

  const stats = {
    total: withSizes.length,
    weeks: totalWeeks ?? new Set(withSizes.map((r) => r.week)).size,
    videos: withSizes.filter((r) => r.kind === "video" || r.kind === "recording").length,
    documents: withSizes.filter((r) => r.kind === "slides" || r.kind === "file").length,
    code: withSizes.filter((r) => r.kind === "code").length,
  };

  return (
    <div>
      <ResourcesContent cohortYear={student.cohort_year} resources={withSizes} stats={stats} />
      <Footer />
    </div>
  );
}

/**
 * Best-effort file sizes read from Supabase Storage metadata — there's
 * no size column in summer_resources, but Storage tracks it natively.
 *
 * Bucket "summer" and paths shaped "{year}/week{n}/{file}" — both now
 * confirmed correct against the real upload code. Still non-blocking:
 * if a list call fails, the page renders fine without sizes.
 */
async function attachFileSizes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  resources: PortalResource[]
): Promise<ResourceWithSize[]> {
  const byFolder = new Map<string, PortalResource[]>();
  for (const r of resources) {
    if (!r.storage_path) continue;
    const folder = r.storage_path.substring(0, r.storage_path.lastIndexOf("/"));
    const arr = byFolder.get(folder) ?? [];
    arr.push(r);
    byFolder.set(folder, arr);
  }

  const sizeByPath = new Map<string, number>();
  for (const folder of byFolder.keys()) {
    try {
      const { data, error } = await supabase.storage.from("summer").list(folder);
      if (error || !data) continue;
      for (const file of data) {
        const size = (file.metadata as { size?: number } | null)?.size;
        if (typeof size === "number") sizeByPath.set(`${folder}/${file.name}`, size);
      }
    } catch {
      // Non-blocking — the page works fine without sizes.
    }
  }

  return resources.map((r) => ({
    ...r,
    sizeBytes: r.storage_path ? sizeByPath.get(r.storage_path) ?? null : null,
  }));
}