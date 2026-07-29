import { getGradingQueue } from "../../../batch-actions";
import HomeworkQueue from "./HomeworkQueue";

export const dynamic = "force-dynamic";

export default async function BatchHomeworkPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const res = await getGradingQueue(batchId);

  return (
    <HomeworkQueue
      batchId={batchId}
      initialQueue={res.ok ? res.queue : []}
      initialError={res.ok ? null : res.error}
    />
  );
}