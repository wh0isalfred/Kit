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

  const { data: student } = await supabase
    .from("summer_students")
    .select("name, cohort_year")
    .eq("id", session.sid)
    .maybeSingle();

  if (!student) redirect("/summer");

  const { data: resources } = await supabase.rpc("get_summer_resources", {
    p_cohort_year: session.year,
  });

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
 * ASSUMES bucket "summer" and paths shaped "{year}/week{n}/{file}" per
 * the handoff doc's bucket list. NOT verified against the actual
 * upload code — if either assumption is wrong, this silently returns
 * no sizes rather than breaking the page. Worth confirming for real
 * before relying on it.
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
