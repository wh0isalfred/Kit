"use client";

import type { MyBatch } from "./actions";

/**
 * Uses the teacher-head / teacher-batch-grid / teacher-batch-card /
 * teacher-empty classes built and previewed earlier this session —
 * same tokens as admin (--navy, --blue, --line, the pill/live-dot
 * classes imported by name, not re-styled) so this reads as the same
 * product, not a bolted-on portal.
 */
export default function TeacherLandingView({
  name,
  batches,
}: {
  name: string;
  batches: MyBatch[];
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const firstName = name.trim().split(" ")[0] || name;

  return (
    <>
      <div className="teacher-head">
        <div className="teacher-head-avatar">{initials || "T"}</div>
        <div className="teacher-head-text">
          <h1>Hello, {firstName}</h1>
          <p>
            {batches.length === 0
              ? "Nothing assigned yet."
              : `You have ${batches.length} ${batches.length === 1 ? "batch" : "batches"}`}
          </p>
        </div>
      </div>

      {batches.length === 0 ? (
        <div className="teacher-empty">
          <h2>No batches yet</h2>
          <p>Once an admin assigns you to a batch, it&apos;ll show up here.</p>
        </div>
      ) : (
        <div className="teacher-batch-grid">
          {batches.map((b) => (
            <a key={b.id} className="teacher-batch-card" href={`/teacher/batch/${b.id}/overview`}>
              <div className="teacher-batch-card-top">
                <div>
                  <div className="teacher-batch-card-name">{b.cohort_label}</div>
                  <div className="teacher-batch-card-meta">
                    {b.seats_used} / {b.capacity} seats
                    {b.current_week && ` · Week ${b.current_week}`}
                  </div>
                </div>
                <span
                  className={`admin-pill ${
                    b.programme_type === "summer" ? "prog-summer" : "prog-term"
                  }`}
                >
                  {b.programme_type === "summer" ? "Summer" : "12-Week"}
                </span>
              </div>

              <div className="teacher-batch-card-status-row">
                <div className="teacher-batch-card-status">
                  <span className={`admin-live-dot ${b.is_live ? "" : "off"}`} />
                  {b.is_live ? "Live now" : "Not live"}
                </div>
                {b.grading_count > 0 && (
                  <span className="teacher-batch-card-grading">
                    {b.grading_count} to grade
                  </span>
                )}
              </div>

              <div className="teacher-batch-card-foot">
                Open batch
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </div>
            </a>
          ))}
        </div>
      )}
    </>
  );
}
