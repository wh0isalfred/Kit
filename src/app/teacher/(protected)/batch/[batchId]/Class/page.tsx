import { createClient } from "@/lib/supabase/server";
import TeacherClassForm, { type TeacherClassSession } from "./TeacherClassForm";

export const dynamic = "force-dynamic";

/**
 * Mirrors admin's class/page.tsx almost exactly (same sessions +
 * current-week fetch) — the real difference is RLS does the access
 * enforcement here (0043's teacher policies on summer_batch_sessions)
 * rather than admin's implicit ALL access. The parent layout.tsx
 * already redirected away if this teacher isn't assigned to this
 * batch, so a plain .select() here is safe — RLS backs it up
 * regardless, same belt-and-suspenders posture as every other
 * teacher-facing read in this feature.
 */
export default async function TeacherBatchClassPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("summer_batch_sessions")
    .select("*")
    .eq("batch_id", batchId);

  const { data: cohorts } = await supabase
    .from("summer_cohorts")
    .select("year, active, current_week")
    .order("year", { ascending: false });
  const activeCohort = cohorts?.find((c) => c.active) ?? cohorts?.[0] ?? null;

  return (
    <TeacherClassForm
      batchId={batchId}
      initialWeek={activeCohort?.current_week ?? 1}
      sessions={(sessions ?? []) as TeacherClassSession[]}
    />
  );
}
