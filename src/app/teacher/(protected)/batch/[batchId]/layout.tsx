import { redirect } from "next/navigation";
import Link from "next/link";
import { getTeacherBatchHeader } from "./actions";
import TeacherBatchTabs from "./TeacherBatchTabs";

/**
 * Mirrors doc 06 §IV's admin batch shell header exactly in structure
 * (← All batches / name + seats / tabs) — the concept of "you're
 * inside one batch now, here's how to get back out" doesn't change
 * based on role. Visually in the .teacher-* namespace for the parts
 * that differ from admin (this sits inside teacher-main, not
 * admin-main), reusing .admin-pill/.admin-btn etc. by class name
 * where the anatomy is identical, same pattern as TeacherRail.tsx.
 *
 * Access is checked here via getTeacherBatchHeader, which itself
 * calls assertTeacherForBatch — if that throws (wrong teacher, batch
 * not assigned, deactivated), this redirects back to the batch list
 * rather than rendering a broken shell. Every tab under this layout
 * inherits that same protection implicitly, since none of them can
 * render without this layout succeeding first.
 */
export default async function TeacherBatchLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const result = await getTeacherBatchHeader(batchId);

  if (!result.ok) {
    redirect("/teacher");
  }

  const { batch } = result;

  return (
    <div className="teacher-batch-shell">
      <Link href="/teacher" className="teacher-batch-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M11 18l-6-6 6-6" />
        </svg>
        All batches
      </Link>

      <div className="teacher-batch-shell-head">
        <div>
          <h1>{batch.cohort_label}</h1>
          <p>
            {batch.course_title} · {batch.seats_used}/{batch.capacity} seats
          </p>
        </div>
      </div>

      <TeacherBatchTabs batchId={batchId} />

      <div className="teacher-batch-content">{children}</div>
    </div>
  );
}
