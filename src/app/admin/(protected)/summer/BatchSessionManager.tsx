"use client";

import { useState } from "react";
import { saveBatchSession, setBatchLive } from "./batch-actions";
import HomeworkReview from "./HomeworkReview";
import type { HomeworkRosterItem } from "./HomeworkReview";

export type BatchOption = { id: string; cohort_label: string; status: string };
export type BatchSession = {
  batch_id: string;
  week: number;
  instructor: string | null;
  meet_link: string | null;
  next_class_at: string | null;
  is_live: boolean;
  live_started_at: string | null;
};

export type HomeworkResource = {
  id: string;
  title: string;
  submission_type: "link" | "file" | null;
};

const toLocalInput = (iso: string | null) =>
  iso ? new Date(iso).toISOString().slice(0, 16) : "";
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

export default function BatchSessionManager({
  batches,
  sessions,
  homeworkByWeek,
}: {
  batches: BatchOption[];
  sessions: BatchSession[];
  homeworkByWeek: Map<number, HomeworkResource[]>;
}) {
  const [batchId, setBatchId] = useState(batches[0]?.id ?? "");
  const [week, setWeek] = useState(1);
  const [reviewingHomework, setReviewingHomework] = useState<string | null>(null);

  if (batches.length === 0) {
    return (
      <section className="admin-section">
        <h2>Live class &amp; batch sessions</h2>
        <p className="admin-warn">
          No batches exist yet for this cohort. Batches currently only get
          created directly in the database — there&apos;s no admin form for
          that yet, so nothing can show here until at least one exists.
        </p>
      </section>
    );
  }

  const session = sessions.find((s) => s.batch_id === batchId && s.week === week) ?? null;
  const homework = homeworkByWeek.get(week) ?? [];

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <h2>Live class &amp; batch sessions</h2>
      </div>
      <p className="admin-hint">
        Meet link, instructor, and the live toggle are per batch — each batch
        runs the same curriculum at its own time, so they don&apos;t share one
        global setting anymore.
      </p>

      <div className="af-row">
        <label className="af-field">
          <span>Batch</span>
          <select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>{b.cohort_label}</option>
            ))}
          </select>
        </label>
        <label className="af-field">
          <span>Week</span>
          <select value={week} onChange={(e) => setWeek(Number(e.target.value))}>
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>Week {n}</option>
            ))}
          </select>
        </label>
      </div>

      {/* key forces a remount on batch/week change, so form state
          doesn't leak from one selection into another */}
      <BatchSessionForm key={`${batchId}-${week}`} batchId={batchId} week={week} session={session} />

      {/* Homework review section */}
      {homework.length > 0 && (
        <div className="hw-review-section" style={{ marginTop: 24 }}>
          <h3>Homework for this week</h3>
          <div className="hw-review-homework-list">
            {homework.map((hw) => (
              <button
                key={hw.id}
                className="hw-review-hw-btn"
                onClick={() => {
                  setReviewingHomework(hw.id);
                  // In a real app, fetch the roster here
                }}
              >
                {hw.title}
                <span className="hw-review-hw-type">
                  {hw.submission_type === "link" ? "🔗" : hw.submission_type === "file" ? "📎" : "📝"}
                </span>
              </button>
            ))}
          </div>

          {reviewingHomework && (
            <div className="hw-review-modal-overlay" onClick={() => setReviewingHomework(null)}>
              <div className="hw-review-modal" onClick={(e) => e.stopPropagation()}>
                <button
                  className="hw-review-modal-close"
                  onClick={() => setReviewingHomework(null)}
                  aria-label="Close"
                >
                  ✕
                </button>
                <HomeworkReview
                  resourceId={reviewingHomework}
                  resourceTitle={homework.find((h) => h.id === reviewingHomework)?.title ?? ""}
                  batchId={batchId}
                  submissionType={homework.find((h) => h.id === reviewingHomework)?.submission_type ?? null}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function BatchSessionForm({
  batchId,
  week,
  session,
}: {
  batchId: string;
  week: number;
  session: BatchSession | null;
}) {
  const [instructor, setInstructor] = useState(session?.instructor ?? "");
  const [meetLink, setMeetLink] = useState(session?.meet_link ?? "");
  const [nextClass, setNextClass] = useState(toLocalInput(session?.next_class_at ?? null));
  const [live, setLive] = useState(session?.is_live ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSave() {
    setBusy(true);
    setError(null);
    setSuccess(null);

    const res = await saveBatchSession({
      batch_id: batchId,
      week,
      instructor: instructor.trim() || null,
      meet_link: meetLink.trim() || null,
      next_class_at: fromLocalInput(nextClass),
    });

    setBusy(false);

    if (!res.ok) {
      setError(res.error);
    } else {
      setSuccess("Session saved");
    }
  }

  async function onToggleLive() {
    setBusy(true);
    setError(null);

    const res = await setBatchLive(batchId, week, !live);
    setBusy(false);

    if (!res.ok) {
      setError(res.error);
    } else {
      setLive(!live);
    }
  }

  return (
    <div className="admin-card">
      <div className="admin-week-body">
        <label className="af-field">
          <span>Instructor name</span>
          <input
            value={instructor}
            onChange={(e) => setInstructor(e.target.value)}
            placeholder="e.g. Chidi Okonkwo"
            disabled={busy}
          />
        </label>

        <label className="af-field">
          <span>Meet link</span>
          <input
            value={meetLink}
            onChange={(e) => setMeetLink(e.target.value)}
            placeholder="https://meet.google.com/..."
            disabled={busy}
          />
          <em className="af-hint">
            Share this with students when the batch is live. Can be blank.
          </em>
        </label>

        <label className="af-field">
          <span>Next class at</span>
          <input
            type="datetime-local"
            value={nextClass}
            onChange={(e) => setNextClass(e.target.value)}
            disabled={busy}
          />
        </label>

        <label className="af-checkbox">
          <input
            type="checkbox"
            checked={live}
            onChange={onToggleLive}
            disabled={busy}
          />
          <span>{live ? "🔴 This batch is live" : "⚪ Go live"}</span>
        </label>

        {error && <p className="af-submit-error">{error}</p>}
        {success && <p className="af-submit-note">{success}</p>}

        <button className="af-submit" onClick={onSave} disabled={busy}>
          {busy ? "Saving…" : "Save session"}
        </button>
      </div>
    </div>
  );
}
