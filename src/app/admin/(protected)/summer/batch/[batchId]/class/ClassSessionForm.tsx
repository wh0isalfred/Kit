"use client";

import { useEffect, useState } from "react";
import { saveBatchSession, setBatchLive, getBatchWeekContentAdmin, saveBatchWeekContentAdmin } from "../../../batch-actions";

export type ClassSession = {
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

export default function ClassSessionForm({
  batchId,
  initialWeek,
  sessions,
}: {
  batchId: string;
  initialWeek: number;
  sessions: ClassSession[];
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

      {/* key forces a remount on week change — same reason the old
          BatchSessionManager keyed on `${batchId}-${week}`: form state
          shouldn't leak from one week's session into another's. */}
      <ClassSessionInner key={`${batchId}-${week}`} batchId={batchId} week={week} session={session} />
    </>
  );
}

function ClassSessionInner({
  batchId,
  week,
  session,
}: {
  batchId: string;
  week: number;
  session: ClassSession | null;
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

  // Ticks so "running for X min" and the 2-hour stale warning (doc 06
  // §IV) stay current without a reload — same interval GoLiveControl used.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

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
    if (!res.ok) setError(res.error);
    else setSuccess("Session saved");
  }

  async function onToggleLive() {
    setLiveBusy(true);
    setError(null);

    const res = await setBatchLive(batchId, week, !live);
    setLiveBusy(false);

    if (!res.ok) {
      setError(res.error);
    } else {
      setLive(!live);
      // Optimistic — same pattern the old toggle used (no refetch after
      // save). The real timestamp comes from set_batch_live server-side.
      setLiveStartedAt(!live ? new Date().toISOString() : null);
    }
  }

  const liveMins =
    live && liveStartedAt ? Math.floor((now - new Date(liveStartedAt).getTime()) / 60000) : null;

  // Not live — nudge if a class is scheduled within the hour, same
  // window GoLiveControl used. Reads the live form field directly
  // rather than a server-passed prop, since this form can edit
  // next_class_at before saving it.
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
          {/* Live toggle — largest element on the page per doc 06 §IV.
              Adapted from GoLiveControl.tsx (previously wired to the
              superseded cohort-wide set_summer_live and not rendered
              anywhere) onto set_batch_live instead. */}
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

      {/* NEW — the piece admin was missing. Same component/mechanics
          as the teacher build's BatchWeekContentCard, ported here so
          admin and teacher finally show the same thing on this tab.
          Own card, own save — batch_week_content is a separate table
          from summer_batch_sessions, so saving one never risks the
          other. */}
      <BatchWeekContentCard batchId={batchId} week={week} />
    </>
  );
}

/**
 * Per-batch week title/note (migration 0040) — the feature that
 * replaced what used to be cohort-wide content. Ported from the
 * teacher build's identical component, swapped to admin's own
 * gated actions (getBatchWeekContentAdmin/saveBatchWeekContentAdmin)
 * instead of the teacher versions, which would reject an admin caller
 * since admin has no row in `teachers`.
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

    getBatchWeekContentAdmin(batchId, week).then((res) => {
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

    const res = await saveBatchWeekContentAdmin({
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
