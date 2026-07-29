import { getGradingQueue, getBatchHomeworkAssignments } from "../../../batch-actions";
import HomeworkQueue from "./HomeworkQueue";

export const dynamic = "force-dynamic";

export default async function BatchHomeworkPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const [queueRes, assignmentsRes] = await Promise.all([
    getGradingQueue(batchId),
    getBatchHomeworkAssignments(batchId),
  ]);

  return (
    <HomeworkQueue
      batchId={batchId}
      initialQueue={queueRes.ok ? queueRes.queue : []}
      initialError={queueRes.ok ? null : queueRes.error}
      assignments={assignmentsRes.ok ? assignmentsRes.assignments : []}
    />
    
  );
}