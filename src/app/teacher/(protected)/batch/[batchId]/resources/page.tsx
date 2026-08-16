import { createClient } from "@/lib/supabase/server";
import TeacherResourceList from "./TeacherResourceList";

export const dynamic = "force-dynamic";

/**
 * Read-only for teachers (Alfred's call, earlier this session):
 * shared curriculum stays admin-editable only for now — one less
 * write path to get RLS wrong on while this is new, same reasoning
 * already applied to teacher_profiles. If self-service editing is
 * wanted later, it's an additive RLS policy + form, not a redesign.
 *
 * Queries summer_resources directly rather than importing
 * getBatchResources from admin's resource-actions.ts — that function
 * is fine to reuse in principle (same "RLS is the real gate" pattern
 * as getBatchOverview), but importing an admin-tree action into the
 * teacher tree for a plain read isn't worth the cross-tree coupling
 * when the query itself is this simple. RLS (0045's teacher policy on
 * summer_resources) is what actually enforces access either way.
 *
 * batch_id is nullable on summer_resources (confirmed via
 * information_schema while building 0045) — NULL means cohort-wide,
 * a real value means specific to just this batch. Both are fetched
 * with the same .or() pattern getBatchHomeworkAssignments already
 * uses in batch-actions.ts, not reinvented here.
 */
export default async function TeacherBatchResourcesPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const supabase = await createClient();

  const { data: batch, error: batchError } = await supabase
    .from("batches")
    .select("id, cohort_label, year")
    .eq("id", batchId)
    .single();

  if (batchError || !batch) {
    return <p className="admin-warn">Couldn&apos;t load this batch.</p>;
  }

  const { data: resources, error } = await supabase
    .from("summer_resources")
    .select(
      "id, week, day_number, title, description, kind, url, storage_path, published, submission_type, batch_id, sort_order"
    )
    .eq("cohort_year", batch.year)
    .or(`batch_id.is.null,batch_id.eq.${batchId}`)
    .order("week", { ascending: true });

  if (error) {
    return <p className="admin-warn">Couldn&apos;t load resources: {error.message}</p>;
  }

  return (
    <TeacherResourceList
      batchLabel={batch.cohort_label}
      resources={resources ?? []}
    />
  );
}
