import { redirect } from "next/navigation";

/**
 * Catches a bare /teacher/batch/[batchId] visit with no tab — this
 * 404'd before, since only overview/class/resources have real
 * page.tsx files, nothing existed at this exact segment. The batch
 * cards on /teacher (TeacherLandingView.tsx) have ALSO been fixed to
 * link straight to /overview, so this redirect is now a safety net
 * for bookmarks/typed URLs/future links that omit the tab — not the
 * primary path anymore, but still needed so this route can never
 * 404 again regardless of how someone arrives at it.
 */
export default async function TeacherBatchRootPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  redirect(`/teacher/batch/${batchId}/overview`);
}
