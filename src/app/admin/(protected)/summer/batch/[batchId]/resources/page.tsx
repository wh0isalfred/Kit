import { createClient } from "@/lib/supabase/server";
import { getBatchResources } from "../../../resource-actions";
import BatchResourceList from "./BatchResourceList";

export const dynamic = "force-dynamic";

export default async function BatchResourcesPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const supabase = await createClient();

  const { data: batch } = await supabase
    .from("batches")
    .select("id, cohort_label, year")
    .eq("id", batchId)
    .single();

  if (!batch) {
    return <p className="admin-warn">Batch not found.</p>;
  }

  const res = await getBatchResources(batchId);

  return (
    <BatchResourceList
      batchId={batchId}
      batchLabel={batch.cohort_label}
      cohortYear={batch.year}
      initialResources={res.ok ? res.resources : []}
      initialError={res.ok ? null : res.error}
    />
  );
}