"use client";

import { useEffect, useState } from "react";
import { setSummerLive } from "./actions";

/**
 * The go-live control for the admin summer screen. Place it near the
 * cohort settings — it's a per-session action, distinct from editing
 * dates.
 *
 * Two states:
 *   · not live → a "Go live" button, plus a nudge if next_class_at
 *     is close ("class is scheduled to start in 8 minutes")
 *   · live → an "End class" button and a running timer, so a
 *     forgotten-on session is visible at a glance
 */
export default function GoLiveControl({
  cohortYear,
  isLive,
  liveStartedAt,
  nextClassAt,
}: {
  cohortYear: number;
  isLive: boolean;
  liveStartedAt: string | null;
  nextClassAt: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Tick once a minute so the timer and the nudge stay current
  // without a reload.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  async function toggle(live: boolean) {
    setBusy(true);
    setError(null);
    const res = await setSummerLive(cohortYear, live);
    setBusy(false);
    if (!res.ok) setError(res.error);
  }

  if (isLive) {
    const mins = liveStartedAt
      ? Math.floor((now - new Date(liveStartedAt).getTime()) / 60000)
      : null;

    return (
      <div className="admin-live admin-live-on">
        <div className="admin-live-status">
          <span className="admin-live-dot" />
          <div>
            <strong>Class is live</strong>
            {mins !== null && (
              <em>
                {mins < 1 ? "just started" : `running for ${mins} min`}
              </em>
            )}
          </div>
        </div>
        <button
          className="admin-btn admin-btn-danger"
          disabled={busy}
          onClick={() => toggle(false)}
        >
          {busy ? "Ending…" : "End class"}
        </button>
        {error && <p className="af-submit-error">{error}</p>}
      </div>
    );
  }

  // Not live — is a class scheduled soon? Nudge if within the hour.
  let nudge: string | null = null;
  if (nextClassAt) {
    const diffMin = Math.round((new Date(nextClassAt).getTime() - now) / 60000);
    if (diffMin > 0 && diffMin <= 60) {
      nudge = `Class is scheduled to start in ${diffMin} minute${diffMin === 1 ? "" : "s"}.`;
    } else if (diffMin <= 0 && diffMin > -120) {
      nudge = `Class was scheduled ${Math.abs(diffMin)} minute${Math.abs(diffMin) === 1 ? "" : "s"} ago.`;
    }
  }

  return (
    <div className="admin-live">
      <div className="admin-live-status">
        <span className="admin-live-dot off" />
        <div>
          <strong>Class is off</strong>
          {nudge && <em>{nudge}</em>}
        </div>
      </div>
      <button
        className="admin-btn admin-btn-primary"
        disabled={busy}
        onClick={() => toggle(true)}
      >
        {busy ? "Starting…" : "Go live"}
      </button>
      {error && <p className="af-submit-error">{error}</p>}
    </div>
  );
}
