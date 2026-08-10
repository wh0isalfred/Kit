"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getSummerFileUrl, signOutSummer, checkIntoClass } from "../summer/summer-session";
import { ResourceIcon, KIND_STYLE, DEFAULT_STYLE, normalizeUrl } from "@/components/site/ResourceIcon";

export type PortalResource = {
  id: string;
  week: number;
  day_number: number | null;
  title: string;
  description: string | null;
  kind: string;
  url: string | null;
  storage_path: string | null;
  code_body: string | null;
  code_language: string | null;
  submission_type: "link" | "file" | null;
  submitted_at: string | null;
  submission_url: string | null;
  submission_storage_path: string | null;
};

export type PortalWeek = { week: number; resources: PortalResource[] };

export type CurrentWeek = {
  week: number;
  class_title: string | null;
  class_note: string | null;
  instructor: string | null;
  meet_link: string | null;
  next_class_at: string | null;
} | null;

/* ── "Add to calendar" — a real .ics file, generated client-side.
   No backend needed since we already have title + start time. One
   assumption, flagged: there's no class-duration field anywhere in
   the schema, so this assumes a 1-hour block. If class length is
   ever tracked, swap the hardcoded 60 for the real value. ── */
function downloadIcs(title: string, startIso: string) {
  const start = new Date(startIso);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//KIT Port Harcourt//Summer Camp//EN",
    "BEGIN:VEVENT",
    `UID:${start.getTime()}@kitph`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${title.replace(/\r?\n/g, " ")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "kit-class.ics";
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Countdown to next_class_at, only active while NOT live. isLive
   now comes from the student's own batch session (set_batch_live),
   not a cohort-wide flag — still admin-set, not clock-derived (ADR
   002), so this never contradicts it; it just goes quiet once isLive
   is true or the time has passed. ── */
function useCountdownLabel(target: string | null, active: boolean) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!target || !active) {
      setLabel(null);
      return;
    }
    const targetMs = new Date(target).getTime();

    function tick() {
      const diff = targetMs - Date.now();
      if (diff <= 0) {
        setLabel(null);
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      if (days > 0) setLabel(`Live in ${days}d ${hours}h`);
      else if (hours > 0) setLabel(`Live in ${hours}h ${mins}m`);
      else setLabel(`Live in ${mins}m`);
    }

    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [target, active]);

  return label;
}

export default function PortalContent({
  studentName,
  cohortYear,
  cohortStartsOn,
  cohortEndsOn,
  batchId,
  currentWeek,
  weekGroups,
  isLive,
}: {
  studentName: string;
  cohortYear: number;
  cohortStartsOn?: string | null;
  cohortEndsOn?: string | null;
  batchId: string | null;
  currentWeek: CurrentWeek;
  weekGroups: PortalWeek[];
  isLive: boolean;
}) {
  const router = useRouter();
  const firstName = studentName.split(" ")[0];

  const nextClass = currentWeek?.next_class_at
    ? new Date(currentWeek.next_class_at)
    : null;

  const countdown = useCountdownLabel(currentWeek?.next_class_at ?? null, !isLive);

  // Dashboard homework summary. Same limitation as the per-item pill on
  // each ResourceCard: PortalResource only carries submitted_at, not the
  // full turned_in/returned status (that needs get_my_submissions, which
  // this component doesn't have — it's a client component fed by props).
  // So "pending" here means "not yet turned in," and everything turned in
  // is lumped together rather than split out into returned. The homework
  // index page (/smportal/homework) has the accurate breakdown; this is a
  // quick nudge, not the source of truth.
  const homeworkStats = useMemo(() => {
    const items = weekGroups.flatMap((wg) => wg.resources).filter(
      (r) => r.kind === "homework" && r.submission_type !== null
    );
    return {
      total: items.length,
      pending: items.filter((r) => !r.submitted_at).length,
    };
  }, [weekGroups]);

  const dateRange =
    cohortStartsOn && cohortEndsOn
      ? `${new Date(cohortStartsOn).toLocaleDateString("en-NG", {
          day: "numeric",
          month: "short",
        })} – ${new Date(cohortEndsOn).toLocaleDateString("en-NG", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`
      : null;

  async function signOut() {
    await signOutSummer();
    router.push("/summer");
    router.refresh();
  }

  // Fire-and-forget — the click should still open the meet link
  // immediately, not wait on the network round-trip. Silently does
  // nothing if the student has no batch yet (shouldn't happen for
  // anyone enrolled after batches went live, but pre-batch accounts
  // may still exist per the migration's nullable batch_id).
  function handleJoinClick() {
    if (batchId && currentWeek?.week) {
      checkIntoClass(batchId, currentWeek.week);
    }
  }

  return (
    <div className="smp">
      {/* ── Top bar ─────────────────────────────────── */}
      <header className="smp-top">
        <div className="smp-top-left">
          <a href="/" className="smp-home" aria-label="Back to KIT home">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            KIT
          </a>
          <div className="smp-greeting">
            <h1>Hello, {firstName}. 👋</h1>
            <p>Welcome back. Learn, build, and have fun this summer.</p>
          </div>
        </div>
        <div className="smp-top-right">
          <button className="smp-signout" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <div className="smp-grid">
        {/* ── Main column ───────────────────────────── */}
        <div>
          {/* Hero */}
          <section className="smp-hero">
            <div className="smp-hero-copy">
              <span className="smp-hero-tag">Summer Program  {cohortYear}</span>
              <h2>
                Learn. Build.<br />
                <span className="smp-hero-accent">Create. Shine.</span>
              </h2>
              <p>Your summer journey to becoming a tech creator.</p>

              <div className="smp-hero-meta">
                {dateRange && (
                  <span className="smp-hero-date">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    {dateRange}
                  </span>
                )}
                {/* Stub link — the week-overview page doesn't exist yet,
                    same "build the link now, page later" approach as
                    View all resources below. */}
                
              </div>
            </div>

            <div className="smp-hero-art">
              <Image
                src="/smportalHeroImage.webp"
                alt=""
                width={760}
                height={563}
                aria-hidden="true"
                style={{ width: "100%", height: "auto" }}
              />
            </div>
          </section>

          {/* Resources */}
          <section>
            <div className="smp-section-head">
              <h3>Your resources</h3>
              <a href="/smportal/resources" className="smp-view-all">
                View all resources
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>
            </div>

            {weekGroups.length === 0 ? (
              <div className="smp-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 5a2 2 0 012-2h5v18H6a2 2 0 01-2-2V5z" />
                  <path d="M20 5a2 2 0 00-2-2h-5v18h5a2 2 0 002-2V5z" />
                </svg>
                <p>Your first resources will appear here soon.</p>
                <em>Check back after your first class!</em>
              </div>
            ) : (
              weekGroups.map((wg) => (
                <div key={wg.week} style={{ marginBottom: 24 }}>
                  <div className="smp-week-label">
                    Week {wg.week}
                    {currentWeek?.week === wg.week && (
                      <span className="smp-week-now">This week</span>
                    )}
                  </div>
                  <div className="smp-res-grid">
                    {wg.resources.map((r) => (
                      <ResourceCard key={r.id} resource={r} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        </div>

        {/* ── Side column ───────────────────────────── */}
        <aside className="smp-side">
          {/* Today's class */}
          <section className="smp-card">
            <div className="smp-card-head">
              <h3>Today&apos;s class</h3>
              {isLive ? (
                <span className="smp-live-badge">
                  <span className="smp-live-dot" />
                  LIVE
                </span>
              ) : (
                countdown && (
                  <span className="smp-status-upcoming">
                    <span className="smp-status-dot" />
                    {countdown}
                  </span>
                )
              )}
            </div>

            {currentWeek?.class_title ? (
              <>
                <div className="smp-class-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="12" rx="1.5" />
                    <path d="M2 19h20" />
                  </svg>
                </div>
                <p className="smp-class-title">{currentWeek.class_title}</p>
                {currentWeek.class_note && (
                  <p className="smp-class-note">{currentWeek.class_note}</p>
                )}
                {currentWeek.instructor && (
                  <div className="smp-class-meta">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="8" r="3.2" />
                      <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" />
                    </svg>
                    Instructor: {currentWeek.instructor}
                  </div>
                )}
                {nextClass && (
                  <div className="smp-class-meta">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 3" />
                    </svg>
                    {nextClass.toLocaleString("en-NG", {
                      weekday: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}

                {currentWeek.meet_link && (
                  <a
                    className={`smp-join ${isLive ? "live" : ""}`}
                    href={currentWeek.meet_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleJoinClick}
                  >
                    {isLive ? "Join class — live now" : "Join class"}
                  </a>
                )}

                {nextClass && (
                  <button
                    className="smp-cal"
                    onClick={() =>
                      downloadIcs(currentWeek.class_title ?? "KIT class", currentWeek.next_class_at!)
                    }
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    Add to calendar
                  </button>
                )}
              </>
            ) : (
              <div className="smp-class-empty">
                No class scheduled yet. Your next session will show up here.
              </div>
            )}
          </section>

          {/* Homework — the entry point into /smportal/homework. Individual
              ResourceCards already link to specific assignments; this is
              the missing "browse everything" path, previously only
              reachable by typing the URL directly. */}
          {homeworkStats.total > 0 && (
            <section className="smp-card">
              <div className="smp-card-head">
                <h3>Homework</h3>
                {homeworkStats.pending > 0 && (
                  <span className="smp-hw-pill smp-hw-pill-assigned">
                    {homeworkStats.pending} pending
                  </span>
                )}
              </div>
              <p className="smp-hw-summary">
                {homeworkStats.pending === 0
                  ? "All caught up — nice work."
                  : `${homeworkStats.pending} of ${homeworkStats.total} not turned in yet.`}
              </p>
              <a href="/smportal/homework" className="smp-help-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
                View all homework
              </a>
            </section>
          )}

          {/* Student ID card */}
          <section className="smp-card smp-id">
            <div className="smp-id-avatar">{firstName.slice(0, 1)}</div>
            <div>
              <p className="smp-id-name">{studentName}</p>
              <p className="smp-id-year">Summer Camp {cohortYear}</p>
            </div>
          </section>

          {/* Help */}
          <section className="smp-card">
            <div className="smp-help-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 13a9 9 0 0118 0" />
                <path d="M21 13v5a2 2 0 01-2 2h-1v-7h3z" />
                <path d="M3 13v5a2 2 0 002 2h1v-7H3z" />
              </svg>
            </div>
            <h3>Need help?</h3>
            <p>Stuck on something, or missed a class? We&apos;re here.</p>
            <a href="mailto:kitph@gmail.com" className="smp-help-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 4h6v6M20 4L10 14M20 14v6H4V4h6" />
              </svg>
              Contact support
            </a>
          </section>
        </aside>
      </div>
    </div>
  );
}

/* ── Resource card ────────────────────────────────── */

function ResourceCard({ resource: r }: { resource: PortalResource }) {
  const [busy, setBusy] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const style = KIND_STYLE[r.kind] ?? DEFAULT_STYLE;
  const isInlineCode = !r.url && !r.storage_path && !!r.code_body;

  // Homework is a different beast from every other resource kind —
  // it's the one thing on this card the student acts on more than
  // once (turn in, unsubmit, resubmit) and can end up in a returned
  // state with feedback attached. That whole lifecycle already lives
  // correctly on /smportal/homework/[id] (HomeworkDetail.tsx), so
  // this card doesn't reimplement it — it just links there and shows
  // a status pill. One place owns the turn-in/unsubmit/returned
  // logic instead of two copies drifting apart.
  const isHomework = r.kind === "homework" && r.submission_type !== null;
  const homeworkStatus: "assigned" | "turned_in" | "returned" = r.submitted_at
    ? "turned_in"
    : "assigned";
  // Note: this card only ever sees "assigned" or "turned_in" from
  // get_summer_resources' submitted_at column — "returned" isn't
  // distinguishable from here without also threading status/feedback
  // through PortalResource. That's fine: the homework page itself
  // shows the accurate state the moment the student opens it, and
  // this pill is a summary nudge, not the source of truth.

  async function open() {
    // External link — just go.
    if (r.url) {
      window.open(normalizeUrl(r.url), "_blank", "noopener,noreferrer");
      return;
    }
    // Stored file — mint a signed URL first.
    if (r.storage_path) {
      setBusy(true);
      setError(null);
      const res = await getSummerFileUrl(r.storage_path);
      setBusy(false);
      if (res.ok) window.open(res.url, "_blank", "noopener,noreferrer");
      else setError(res.error);
      return;
    }
    // Inline code — toggle it open.
    if (r.code_body) setShowCode((s) => !s);
  }

  if (isHomework) {
    return (
      <a href={`/smportal/homework/${r.id}`} className="smp-res smp-res-homework">
        <span className={`smp-res-icon ${style.accent}`}>
          <ResourceIcon kind={r.kind} />
        </span>
        <span className="smp-res-title">{r.title}</span>
        <span className={`smp-hw-pill smp-hw-pill-${homeworkStatus}`}>
          {homeworkStatus === "turned_in" ? "Turned in" : "Assigned"}
        </span>
      </a>
    );
  }

  const label = busy
    ? "Opening…"
    : isInlineCode
    ? showCode
      ? "Hide code"
      : "Show code"
    : style.verb;

  return (
    <div>
      <button className="smp-res" onClick={open} disabled={busy}>
        <span className={`smp-res-icon ${style.accent}`}>
          <ResourceIcon kind={r.kind} />
        </span>
        <span className="smp-res-title">{r.title}</span>
        <span className={`smp-res-action ${style.accent}`}>
          {label}
          {!busy && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {isInlineCode ? (
                <path d="M6 9l6 6 6-6" />
              ) : style.verb === "Download" ? (
                <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
              ) : (
                <path d="M5 12h14M13 6l6 6-6 6" />
              )}
            </svg>
          )}
        </span>
      </button>

      {error && <p className="smp-res-error">{error}</p>}

      {showCode && r.code_body && (
        <pre className="smp-code">
          <code>{r.code_body}</code>
        </pre>
      )}
    </div>
  );
}
