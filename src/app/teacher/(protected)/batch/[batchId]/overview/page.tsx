import { getBatchOverview } from "@/app/admin/(protected)/summer/batch-actions";

export const dynamic = "force-dynamic";

/**
 * Deliberately reuses admin's getBatchOverview() UNCHANGED, not a
 * teacher-specific fork. It was already written with plain
 * createClient() (no assertAdmin()) — RLS was always meant to be the
 * real gate for this function, same trust model as getGradingQueue
 * and getBatchHomeworkAssignments in the same file. Before this
 * migration set (0043/0045), that RLS gate simply didn't exist yet
 * for a teacher session — summer_batch_sessions, summer_students,
 * summer_resources, and summer_submissions were all admin-only. Now
 * that all four have teacher policies, this same function correctly
 * scopes itself for whichever role is actually calling it — no
 * fork needed, exactly the situation SECURITY DEFINER/RLS-first
 * design is supposed to make possible.
 *
 * The parent layout.tsx already confirmed this teacher holds this
 * batch (via assertTeacherForBatch, redirecting otherwise) before
 * this page can even render — RLS is still the real enforcement, this
 * is belt-and-suspenders, same posture as every other teacher tab.
 */
export default async function TeacherBatchOverviewPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const res = await getBatchOverview(batchId);

  if (!res.ok) {
    return <p className="admin-warn">Couldn&apos;t load overview: {res.error}</p>;
  }

  const o = res.overview;
  const spotsLeft = o.capacity - o.seats_used;
  const nextClass = o.next_class_at
    ? new Date(o.next_class_at).toLocaleString("en-NG", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const totalSubmitted = o.submissions_returned + o.submissions_turned_in;

  return (
    <div className="admin-card">
      <div className="admin-week-body">
        <div className="ov-grid">
          <div className="ov-stat">
            <strong>{o.seats_used} / {o.capacity}</strong>
            <em>Roster{spotsLeft <= 0 ? " · Full" : ""}</em>
          </div>
          <div className="ov-stat">
            <strong>Week {o.current_week}</strong>
            <em>Current week</em>
          </div>
          <div className="ov-stat">
            <strong>{o.is_live ? "🔴 Live" : "Off"}</strong>
            <em>Class status</em>
          </div>
          <div className="ov-stat">
            <strong>{nextClass ?? "Not set"}</strong>
            <em>Next class</em>
          </div>
          <div className="ov-stat">
            <strong>{o.assignments_published} / {o.assignments_total}</strong>
            <em>Assignments published</em>
          </div>
          <div className="ov-stat">
            <strong>{o.submissions_returned} / {totalSubmitted}</strong>
            <em>Graded (of turned in)</em>
          </div>
        </div>

        {o.status !== "active" && (
          <p className="admin-warn">This batch&apos;s status is &ldquo;{o.status}&rdquo;, not active.</p>
        )}
      </div>
    </div>
  );
}