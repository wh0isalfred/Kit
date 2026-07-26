"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSummerFileUrl, signOutSummer } from "../summer/summer-session";

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
};

export type PortalWeek = { week: number; resources: PortalResource[] };

export type CurrentWeek = {
  week: number;
  class_title: string | null;
  class_note: string | null;
  meet_link: string | null;
  next_class_at: string | null;
} | null;

const kindIcon = (kind: string) => {
  switch (kind) {
    case "video": return "🎬";
    case "recording": return "📹";
    case "slides": return "📊";
    case "file": return "📄";
    case "homework": return "✏️";
    case "code": return "💻";
    default: return "🔗";
  }
};

export default function PortalContent({
  studentName,
  cohortYear,
  currentWeek,
  weekGroups,
  isLive,
}: {
  studentName: string;
  cohortYear: number;
  currentWeek: CurrentWeek;
  weekGroups: PortalWeek[];
  isLive: boolean;  
}) {
  const router = useRouter();
  const firstName = studentName.split(" ")[0];

  const nextClass = currentWeek?.next_class_at
    ? new Date(currentWeek.next_class_at)
    : null;


  async function signOut() {
    await signOutSummer();
    router.push("/summer");
    router.refresh();
  }

  return (
    <div className="pt">
      {/* ── Top bar ─────────────────────────────────── */}
      <header className="pt-top">
        <div className="pt-top-left">
          <a href="/" className="pt-home" aria-label="Back to KIT home">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            KIT
          </a>
          <div>
            <h1>
              Hello, {firstName}! <span className="pt-wave">👋</span>
            </h1>
            <p>Welcome back. Learn, build, and have fun this summer.</p>
          </div>
        </div>
        <button className="pt-signout" onClick={signOut}>
          Sign out
        </button>
      </header>

      <div className="pt-grid">
        {/* ── Main column ───────────────────────────── */}
        <div className="pt-main">
          {/* Hero */}
          <section className="pt-hero">
            <div className="pt-hero-copy">
              <span className="pt-hero-tag">Summer Tech Camp {cohortYear}</span>
              <h2>
                Learn. Build.<br />
                <span className="pt-hero-accent">Create. Shine.</span>
              </h2>
              <p>Your summer journey to becoming a tech creator.</p>
               {currentWeek?.meet_link && isLive && (
                  <a className="pt-hero-btn live" href={currentWeek.meet_link}
                    target="_blank" rel="noopener noreferrer">
                    Join live class now
                  </a>
                )}
            </div>
            <div className="pt-hero-art" aria-hidden>
              <div className="pt-hero-blob" />
              <span className="pt-hero-emoji">🚀</span>
            </div>
          </section>

          {/* Resources by week */}
          <section className="pt-section">
            <div className="pt-section-head">
              <h3>Your resources</h3>
            </div>

            {weekGroups.length === 0 ? (
              <div className="pt-empty">
                <span className="pt-empty-emoji">📚</span>
                <p>Your first resources will appear here soon.</p>
                <em>Check back after your first class!</em>
              </div>
            ) : (
              weekGroups.map((wg) => (
                <div key={wg.week} className="pt-week">
                  <div className="pt-week-label">
                    Week {wg.week}
                    {currentWeek?.week === wg.week && (
                      <span className="pt-week-now">This week</span>
                    )}
                  </div>
                  <div className="pt-res-grid">
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
        <aside className="pt-side">
          {/* Today's class */}
          <section className="pt-card pt-class">
            <div className="pt-card-head">
              <h3>Today&apos;s class</h3>
              {isLive && (
                <span className="pt-live-badge">
                  <span className="pt-live-pulse" />
                  LIVE NOW!
                </span>
              )}
            </div>

            {currentWeek?.class_title ? (
              <>
                <div className="pt-class-icon">💻</div>
                <p className="pt-class-title">{currentWeek.class_title}</p>
                {currentWeek.class_note && (
                  <p className="pt-class-note">{currentWeek.class_note}</p>
                )}
                {nextClass && (
                  <p className="pt-class-time">
                    {nextClass.toLocaleString("en-NG", {
                      weekday: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
                {currentWeek.meet_link && (
                  <a
                    className={`pt-class-btn ${isLive ? "live" : ""}`}
                    href={currentWeek.meet_link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {isLive ? "Join live class now" : "Class link"}
                  </a>
                )}
              </>
            ) : (
              <div className="pt-empty pt-empty-sm">
                <p>No class scheduled yet.</p>
                <em>Your next session will show up here.</em>
              </div>
            )}
          </section>

          {/* Student ID card */}
          <section className="pt-card pt-idcard">
            <div className="pt-id-avatar">{firstName.slice(0, 1)}</div>
            <div>
              <p className="pt-id-name">{studentName}</p>
              <p className="pt-id-year">Summer Camp {cohortYear}</p>
            </div>
          </section>

          {/* Help */}
          <section className="pt-card pt-help">
            <h3>Need help?</h3>
            <p>Stuck on something, or missed a class? We&apos;re here.</p>
            <a href="mailto:kitph@gmail.com" className="pt-help-btn">
              Ask a question
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

  async function open() {
    // External link — just go.
    if (r.url) {
      window.open(r.url, "_blank", "noopener,noreferrer");
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

  return (
    <div className="pt-res">
      <button className="pt-res-main" onClick={open} disabled={busy}>
        <span className="pt-res-icon">{kindIcon(r.kind)}</span>
        <span className="pt-res-text">
          <span className="pt-res-title">{r.title}</span>
          {r.description && <span className="pt-res-desc">{r.description}</span>}
          <span className="pt-res-kind">
            {busy ? "Opening…" : r.code_body ? (showCode ? "Hide code" : "Show code") : r.kind}
          </span>
        </span>
      </button>

      {error && <p className="pt-res-error">{error}</p>}

      {showCode && r.code_body && (
        <pre className="pt-code">
          <code>{r.code_body}</code>
        </pre>
      )}
    </div>
  );
}
