import { getTeacherGradingQueue, getTeacherHomeworkAssignments } from "../actions";
import TeacherHomeworkQueue from "./TeacherHomeworkQueue";

export const dynamic = "force-dynamic";

export default async function TeacherBatchHomeworkPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const [queueRes, assignmentsRes] = await Promise.all([
    getTeacherGradingQueue(batchId),
    getTeacherHomeworkAssignments(batchId),
  ]);

  return (
    <TeacherHomeworkQueue
      batchId={batchId}
      initialQueue={queueRes.ok ? queueRes.queue : []}
      initialError={queueRes.ok ? null : queueRes.error}
      assignments={assignmentsRes.ok ? assignmentsRes.assignments : []}
    />
  );
}
