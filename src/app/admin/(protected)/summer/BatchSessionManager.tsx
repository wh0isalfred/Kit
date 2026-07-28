"use client";

import { useState } from "react";
import { saveBatchSession, setBatchLive } from "./actions";

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

const toLocalInput = (iso: string | null) =>
  iso ? new Date(iso).toISOString().slice(0, 16) : "";
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

export default function BatchSessionManager({
  batches,
  sessions,
}: {
  batches: BatchOption[];
  sessions: BatchSession[];
}) {
  const [batchId, setBatchId] = useState(batches[0]?.id ?? "");
  const [week, setWeek] = useState(1);

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
  const [nextAt, setNextAt] = useState(toLocalInput(session?.next_class_at ?? null));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [liveBusy, setLiveBusy] = useState(false);
  const [liveErr, setLiveErr] = useState<string | null>(null);
  const isLive = session?.is_live ?? false;

  async function onSave() {
    setBusy(true); setErr(null); setMsg(null);
    const res = await saveBatchSession({
      batchId,
      week,
      instructor,
      meetLink,
      nextClassAt: fromLocalInput(nextAt),
    });
    setBusy(false);
    if (res.ok) setMsg("Saved.");
    else setErr(res.error);
  }

  async function toggleLive(live: boolean) {
    setLiveBusy(true);
    setLiveErr(null);
    const res = await setBatchLive(batchId, week, live);
    setLiveBusy(false);
    if (!res.ok) setLiveErr(res.error);
  }

  return (
    <div className="admin-card">
      <div className="admin-week-body">
        <label className="af-field">
          <span>Instructor</span>
          <input
            value={instructor}
            onChange={(e) => setInstructor(e.target.value)}
            placeholder="e.g. Tolu Adeyemi"
          />
        </label>

        <div className="af-row">
          <label className="af-field">
            <span>Meet link</span>
            <input
              value={meetLink}
              onChange={(e) => setMeetLink(e.target.value)}
              placeholder="https://meet.google.com/…"
            />
          </label>
          <label className="af-field">
            <span>Next class at</span>
            <input
              type="datetime-local"
              value={nextAt}
              onChange={(e) => setNextAt(e.target.value)}
            />
          </label>
        </div>

        {err && <p className="af-submit-error">{err}</p>}
        {msg && <p className="admin-result">{msg}</p>}

        <button className="af-submit" onClick={onSave} disabled={busy}>
          {busy ? "Saving…" : "Save session details"}
        </button>

        <div className="admin-live" style={{ marginTop: 16 }}>
          <div className="admin-live-status">
            <span className={`admin-live-dot ${isLive ? "" : "off"}`} />
            <div>
              <strong>{isLive ? "Class is live" : "Class is off"}</strong>
            </div>
          </div>
          <button
            className={`admin-btn ${isLive ? "admin-btn-danger" : "admin-btn-primary"}`}
            disabled={liveBusy}
            onClick={() => toggleLive(!isLive)}
          >
            {liveBusy ? "…" : isLive ? "End class" : "Go live"}
          </button>
          {liveErr && <p className="af-submit-error">{liveErr}</p>}
        </div>
      </div>
    </div>
  );
}
