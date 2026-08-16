"use client";

import { useEffect, useState } from "react";
import {
  saveTeacherBatchSession,
  setTeacherBatchLive,
  getBatchWeekContent,
  saveBatchWeekContent,
} from "../actions";

export type TeacherClassSession = {
  batch_id: string;
  week: number;
  instructor: string | null;
  meet_link: string | null;
  next_class_at: string | null;
  is_live: boolean;
  live_started_at: string | null;
};

const toLocalInput = (iso: string | null) =>
  iso ? new Date(iso).toISOString().slice(0, 16) : "";
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

/**
 * Same week-selector-plus-remount pattern as admin's ClassSessionForm
 * — the `key` forces a fresh mount on week change so form state never
 * leaks from one week into another, same reasoning as the original
 * (which itself inherited it from the even older BatchSessionManager).
 */
export default function TeacherClassForm({
  batchId,
  initialWeek,
  sessions,
}: {
  batchId: string;
  initialWeek: number;
  sessions: TeacherClassSession[];
}) {
  const [week, setWeek] = useState(initialWeek);
  const session = sessions.find((s) => s.week === week) ?? null;

  return (
    <>
      <label className="af-field class-week-select">
        <span>Week</span>
        <select value={week} onChange={(e) => setWeek(Number(e.target.value))}>
          {[1, 2, 3].map((n) => (
            <option key={n} value={n}>Week {n}</option>
          ))}
        </select>
      </label>

      <TeacherClassInner key={`${batchId}-${week}`} batchId={batchId} week={week} session={session} />
    </>
  );
}

function TeacherClassInner({
  batchId,
  week,
  session,
}: {
  batchId: string;
  week: number;
  session: TeacherClassSession | null;
}) {
  const [instructor, setInstructor] = useState(session?.instructor ?? "");
  const [meetLink, setMeetLink] = useState(session?.meet_link ?? "");
  const [nextClass, setNextClass] = useState(toLocalInput(session?.next_class_at ?? null));
  const [live, setLive] = useState(session?.is_live ?? false);
  const [liveStartedAt, setLiveStartedAt] = useState(session?.live_started_at ?? null);
  const [busy, setBusy] = useState(false);
  const [liveBusy, setLiveBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Same 30s tick as admin's version — keeps "running for X min" and
  // the 2-hour stale warning current without a reload.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  async function onSave() {
    setBusy(true);
    setError(null);
    setSuccess(null);

    const res = await saveTeacherBatchSession({
      batch_id: batchId,
      week,
      instructor: instructor.trim() || null,
      meet_link: meetLink.trim() || null,
      next_class_at: fromLocalInput(nextClass),
    });

    setBusy(false);
    if (!res.ok) setError(res.error);
    else setSuccess("Session saved");
  }

  async function onToggleLive() {
    setLiveBusy(true);
    setError(null);

    const res = await setTeacherBatchLive(batchId, week, !live);
    setLiveBusy(false);

    if (!res.ok) {
      setError(res.error);
    } else {
      setLive(!live);
      setLiveStartedAt(!live ? new Date().toISOString() : null);
    }
  }

  const liveMins =
    live && liveStartedAt ? Math.floor((now - new Date(liveStartedAt).getTime()) / 60000) : null;

  let nudge: string | null = null;
  if (!live && nextClass) {
    const diffMin = Math.round((new Date(nextClass).getTime() - now) / 60000);
    if (diffMin > 0 && diffMin <= 60) {
      nudge = `Class is scheduled to start in ${diffMin} minute${diffMin === 1 ? "" : "s"}.`;
    } else if (diffMin <= 0 && diffMin > -120) {
      nudge = `Class was scheduled ${Math.abs(diffMin)} minute${Math.abs(diffMin) === 1 ? "" : "s"} ago.`;
    }
  }

  return (
    <>
      <div className="admin-card">
        <div className="admin-week-body">
          <div className={`admin-live${live ? " admin-live-on" : ""}`}>
            <div className="admin-live-status">
              <span className={`admin-live-dot${live ? "" : " off"}`} />
              <div>
                <strong>{live ? "Class is live" : "Class is off"}</strong>
                {live && liveMins !== null && (
                  <em>{liveMins < 1 ? "just started" : `running for ${liveMins} min`}</em>
                )}
                {!live && nudge && <em>{nudge}</em>}
              </div>
            </div>
            <button
              className={`admin-btn ${live ? "admin-btn-danger" : "admin-btn-primary"}`}
              disabled={liveBusy}
              onClick={onToggleLive}
            >
              {liveBusy ? (live ? "Ending…" : "Starting…") : live ? "End class" : "Go live"}
            </button>
          </div>

          {live && liveMins !== null && liveMins > 120 && (
            <p className="admin-warn">
              This batch has been live for {Math.floor(liveMins / 60)}h {liveMins % 60}m. Did class end?
            </p>
          )}

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
            <em className="af-hint">Share this with students when the batch is live. Can be blank.</em>
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

          {error && <p className="af-submit-error">{error}</p>}
          {success && <p className="af-submit-success">{success}</p>}

          <button className="af-submit" onClick={onSave} disabled={busy}>
            {busy ? "Saving…" : "Save session"}
          </button>
        </div>
      </div>

      {/* Kept as its own card, its own save — a separate table
          (batch_week_content, 0040), separate save action, so saving
          the session never risks the week content and vice versa.
          Fetched client-side rather than passed down from the page,
          since it's genuinely independent data with its own loading
          moment, not something worth blocking the whole tab's first
          paint on. */}
      <BatchWeekContentCard batchId={batchId} week={week} />
    </>
  );
}

/**
 * The actual new feature this whole build exists for: per-batch week
 * title/note, replacing what used to be cohort-wide (doc 01 §23, doc
 * 06 §VIII). Two batches in the same week number can now show
 * completely different material, independently.
 */
function BatchWeekContentCard({ batchId, week }: { batchId: string; week: number }) {
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [published, setPublished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSuccess(null);

    getBatchWeekContent(batchId, week).then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setError(res.error);
      } else {
        setTitle(res.content?.title ?? "");
        setNote(res.content?.note_to_students ?? "");
        setPublished(res.content?.published ?? false);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [batchId, week]);

  async function onSave() {
    setBusy(true);
    setError(null);
    setSuccess(null);

    const res = await saveBatchWeekContent({
      batch_id: batchId,
      week_number: week,
      title,
      note_to_students: note,
      published,
    });

    setBusy(false);
    if (!res.ok) setError(res.error);
    else setSuccess("Week content saved");
  }

  if (loading) {
    return (
      <div className="admin-card">
        <div className="admin-app-note">Loading week content…</div>
      </div>
    );
  }

  return (
    <div className="admin-card">
      <div className="admin-week-body">
        <div className="admin-week-head">
          <strong>Week {week} content</strong>
          {published ? (
            <span className="admin-pill admin-pill-on">Published</span>
          ) : (
            <span className="admin-pill">Draft — hidden from students</span>
          )}
        </div>

        <label className="af-field">
          <span>Class title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's this week actually covering?"
            disabled={busy}
          />
        </label>

        <label className="af-field">
          <span>Note to students</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything they should know before class — bring a laptop, come early, etc."
            disabled={busy}
          />
        </label>

        <label className="af-consent">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            disabled={busy}
          />
          <span>Published — visible to this batch&apos;s students</span>
        </label>

        {error && <p className="af-submit-error">{error}</p>}
        {success && <p className="af-submit-success">{success}</p>}

        <button className="af-submit" onClick={onSave} disabled={busy}>
          {busy ? "Saving…" : `Save week ${week}`}
        </button>
      </div>
    </div>
  );
}
