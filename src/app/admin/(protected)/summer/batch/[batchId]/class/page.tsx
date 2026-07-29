import { createClient } from "@/lib/supabase/server";
import ClassSessionForm, { type ClassSession } from "./ClassSessionForm";

export const dynamic = "force-dynamic";

export default async function BatchClassPage({
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
    <ClassSessionForm
      batchId={batchId}
      initialWeek={activeCohort?.current_week ?? 1}
      sessions={(sessions ?? []) as ClassSession[]}
    />
  );
}