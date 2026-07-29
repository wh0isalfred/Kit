"use client";

import { useState, useEffect } from "react";
import { returnHomework, getHomeworkRoster, type HomeworkRosterItem } from "./batch-actions";


export default function HomeworkReview({
  resourceId,
  resourceTitle,
  batchId,
  submissionType,
}: {
  resourceId: string;
  resourceTitle: string;
  batchId: string;
  submissionType: "link" | "file" | null;
}) {
  const [roster, setRoster] = useState<HomeworkRosterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await getHomeworkRoster(resourceId, batchId);
      setLoading(false);
      if (!res.ok) {
        setLoadError(res.error);
      } else {
        setRoster(res.roster ?? []);
      }
    })();
  }, [resourceId, batchId]);

  const stats = {
    total: roster.length,
    assigned: roster.filter((r) => r.status === "assigned").length,
    turned_in: roster.filter((r) => r.status === "turned_in").length,
    returned: roster.filter((r) => r.status === "returned").length,
  };

  async function handleReturn(submissionId: string) {
  setBusy(true);
  setError(null);
  setSuccess(null);

  const res = await returnHomework(submissionId, feedbackText);
  setBusy(false);

  if (!res.ok) {
    setError(res.error);
  } else {
    setSuccess(`Returned to ${roster.find((r) => r.submission_id === submissionId)?.name}`);
    setExpandedStudent(null);
    setFeedbackText("");
    setRoster(
      roster.map((r) =>
        r.submission_id === submissionId
          ? { ...r, status: "returned" as const, feedback: feedbackText, returned_at: new Date().toISOString() }
          : r
      )
    );
  }
}

  if (loading) {
    return (
      <div className="hw-review">
        <p className="hw-review-loading">Loading roster…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="hw-review">
        <p className="hw-review-error">Failed to load roster: {loadError}</p>
      </div>
    );
  }

  return (
    <div className="hw-review">
      <div className="hw-review-head">
        <h3>{resourceTitle}</h3>
        <div className="hw-review-stats">
          <span className="hw-review-stat">
            <strong>{stats.total}</strong>
            <em>Total</em>
          </span>
          <span className="hw-review-stat">
            <strong>{stats.assigned}</strong>
            <em>Not turned in</em>
          </span>
          <span className="hw-review-stat">
            <strong>{stats.turned_in}</strong>
            <em>Turned in</em>
          </span>
          <span className="hw-review-stat">
            <strong>{stats.returned}</strong>
            <em>Returned</em>
          </span>
        </div>
      </div>

      {error && <p className="hw-review-error">{error}</p>}
      {success && <p className="hw-review-success">{success}</p>}

      <div className="hw-review-roster">
        {/* Sort: assigned first (no action needed), then turned_in (action needed), then returned */}
        {roster
          .sort((a, b) => {
            const order = { assigned: 0, turned_in: 1, returned: 2 };
            return order[a.status] - order[b.status];
          })
          .map((student) => (
            <div
              key={student.summer_student_id}
              className={`hw-review-row hw-review-status-${student.status}`}
            >
              <div
                className="hw-review-row-head"
                onClick={() =>
                  expandedStudent === student.summer_student_id
                    ? setExpandedStudent(null)
                    : setExpandedStudent(student.summer_student_id)
                }
              >
                <div className="hw-review-student">
                  <strong>{student.name}</strong>
                  <span className={`hw-review-pill hw-review-pill-${student.status}`}>
                    {student.status === "assigned"
                      ? "Not turned in"
                      : student.status === "turned_in"
                      ? "Turned in"
                      : "Returned"}
                  </span>
                </div>

                {student.status === "turned_in" && (
                  <div className="hw-review-meta">
                    <em>
                      {new Date(student.submitted_at!).toLocaleDateString("en-NG", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </em>
                  </div>
                )}

                {student.status === "returned" && (
                  <div className="hw-review-meta">
                    <em>
                      Returned{" "}
                      {new Date(student.returned_at!).toLocaleDateString("en-NG", {
                        month: "short",
                        day: "numeric",
                      })}
                    </em>
                  </div>
                )}

                <button className="hw-review-toggle" aria-label="Toggle details">
                  {expandedStudent === student.summer_student_id ? "▼" : "▶"}
                </button>
              </div>

              {expandedStudent === student.summer_student_id && (
                <div className="hw-review-detail">
                  {/* Submission details if turned in */}
                  {student.status !== "assigned" && (
                    <div className="hw-review-submission">
                      <div className="hw-review-label">Submission</div>
                      {submissionType === "link" && student.submission_url ? (
                        <a
                          href={student.submission_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hw-review-link"
                        >
                          {student.submission_url}
                        </a>
                      ) : submissionType === "file" && student.submission_storage_path ? (
                        <div className="hw-review-file">
                          📎 {student.submission_storage_path.split("/").pop()}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Prior feedback if returned */}
                  {student.feedback && (
                    <div className="hw-review-prior-feedback">
                      <div className="hw-review-label">Your feedback</div>
                      <div className="hw-review-feedback-text">{student.feedback}</div>
                    </div>
                  )}

                  {/* Return form if not yet returned */}
                  {student.status !== "returned" && student.status !== "assigned" && (
                    <div className="hw-review-return-form">
                      <label className="hw-review-label">Feedback (optional)</label>
                      <textarea
                        rows={4}
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Leave feedback for the student..."
                        disabled={busy}
                        className="hw-review-textarea"
                      />
                      <button
                        className="hw-review-btn"
                        onClick={() => handleReturn(student.submission_id!)}
                        disabled={busy}
                      >
                        {busy ? "Returning…" : "Return assignment"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
      </div>

      {roster.length === 0 && (
        <div className="hw-review-empty">
          <p>No students in this batch.</p>
        </div>
      )}
    </div>
  );
}
