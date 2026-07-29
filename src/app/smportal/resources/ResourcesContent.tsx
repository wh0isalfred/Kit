"use client";

import { useState, useMemo } from "react";
import { getSummerFileUrl } from "../../summer/summer-session";
import { ResourceIcon, KIND_STYLE, DEFAULT_STYLE, normalizeUrl } from "@/components/site/ResourceIcon";
import type { PortalResource } from "../PortalContent";

export type ResourceWithSize = PortalResource & { sizeBytes: number | null };
export type ResourceStats = {
  total: number;
  weeks: number;
  videos: number;
  documents: number;
  code: number;
};

const KIND_LABELS: Record<string, string> = {
  slides: "Slides",
  video: "Video",
  recording: "Recording",
  code: "Code",
  homework: "Homework",
  file: "File",
};

function formatSize(bytes: number | null): string | null {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* Shared click/open behaviour for both the list and grid layouts.
   Homework resources navigate to /smportal/homework/[id] instead of
   opening a URL or file. */
function useResourceOpen(r: ResourceWithSize) {
  const [busy, setBusy] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    /* Homework has a dedicated detail page */
    if (r.kind === "homework") {
      window.location.href = `/smportal/homework/${r.id}`;
      return;
    }

    if (r.url) {
      window.open(normalizeUrl(r.url), "_blank", "noopener,noreferrer");
      return;
    }
    if (r.storage_path) {
      setBusy(true);
      setError(null);
      const res = await getSummerFileUrl(r.storage_path);
      setBusy(false);
      if (res.ok) window.open(res.url, "_blank", "noopener,noreferrer");
      else setError(res.error);
      return;
    }
    if (r.code_body) setShowCode((s) => !s);
  }

  return { open, busy, showCode, error };
}

export default function ResourcesContent({
  resources,
  stats,
}: {
  cohortYear: number;
  resources: ResourceWithSize[];
  stats: ResourceStats;
}) {
  const [query, setQuery] = useState("");
  const [weekFilter, setWeekFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [view, setView] = useState<"list" | "grid">("list");
  // Default-open the most recent week rather than landing on an
  // all-collapsed page with nothing visible.
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(() => {
    if (resources.length === 0) return new Set();
    return new Set([Math.max(...resources.map((r) => r.week))]);
  });

  const hasActiveFilter = query.trim() !== "" || weekFilter !== "all" || typeFilter !== "all";

  const weekNumbers = useMemo(
    () => Array.from(new Set(resources.map((r) => r.week))).sort((a, b) => a - b),
    [resources]
  );
  const kinds = useMemo(() => Array.from(new Set(resources.map((r) => r.kind))), [resources]);

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      if (weekFilter !== "all" && String(r.week) !== weekFilter) return false;
      if (typeFilter !== "all" && r.kind !== typeFilter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const hit =
          r.title.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [resources, weekFilter, typeFilter, query]);

  const byWeek = useMemo(() => {
    const map = new Map<number, ResourceWithSize[]>();
    for (const r of filtered) {
      const arr = map.get(r.week) ?? [];
      arr.push(r);
      map.set(r.week, arr);
    }
    const entries = Array.from(map.entries());
    entries.sort((a, b) => (sort === "newest" ? b[0] - a[0] : a[0] - b[0]));
    return entries;
  }, [filtered, sort]);

  function toggleWeek(week: number) {
    setOpenWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(week)) next.delete(week);
      else next.add(week);
      return next;
    });
  }

  return (
    <div className="smp">
      <header className="smpr-top">
        <a href="/smportal" className="smp-home" aria-label="Back to portal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          KIT
        </a>
        <div className="smpr-title">
          <h1>All resources</h1>
          <p>Browse and access all learning materials from every week.</p>
        </div>
      </header>

      {/* Stats — pure counts over resources already fetched, nothing new needed from the backend */}
      <div className="smpr-stats">
        <div className="smpr-stat">
          <span className="smp-res-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4z" /><path d="M4 9h16" /></svg>
          </span>
          <div>
            <div className="smpr-stat-num">{stats.total}</div>
            <div className="smpr-stat-label">Total resources</div>
          </div>
        </div>
        <div className="smpr-stat">
          <span className="smp-res-icon green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
          </span>
          <div>
            <div className="smpr-stat-num">{stats.weeks}</div>
            <div className="smpr-stat-label">Total weeks</div>
          </div>
        </div>
        <div className="smpr-stat">
          <span className="smp-res-icon green"><ResourceIcon kind="video" /></span>
          <div>
            <div className="smpr-stat-num">{stats.videos}</div>
            <div className="smpr-stat-label">Videos</div>
          </div>
        </div>
        <div className="smpr-stat">
          <span className="smp-res-icon blue"><ResourceIcon kind="slides" /></span>
          <div>
            <div className="smpr-stat-num">{stats.documents}</div>
            <div className="smpr-stat-label">Documents</div>
          </div>
        </div>
        <div className="smpr-stat">
          <span className="smp-res-icon purple"><ResourceIcon kind="code" /></span>
          <div>
            <div className="smpr-stat-num">{stats.code}</div>
            <div className="smpr-stat-label">Code files</div>
          </div>
        </div>
      </div>

      {/* Search + filters — all client-side over data already loaded */}
      <div className="smpr-bar">
        <div className="smpr-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search resources..." />
        </div>
        <select value={weekFilter} onChange={(e) => setWeekFilter(e.target.value)}>
          <option value="all">All weeks</option>
          {weekNumbers.map((w) => (
            <option key={w} value={w}>Week {w}</option>
          ))}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All types</option>
          {kinds.map((k) => (
            <option key={k} value={k}>{KIND_LABELS[k] ?? k}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as "newest" | "oldest")}>
          <option value="newest">Sort: Newest first</option>
          <option value="oldest">Sort: Oldest first</option>
        </select>
        <div className="smpr-view-toggle">
          <button className={view === "grid" ? "on" : ""} aria-label="Grid view" onClick={() => setView("grid")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></svg>
          </button>
          <button className={view === "list" ? "on" : ""} aria-label="List view" onClick={() => setView("list")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
      </div>

      {/* Weeks — collapsed by default, expand on click */}
      {byWeek.length === 0 ? (
        <div className="smp-empty">
          <p>No resources match your filters.</p>
        </div>
      ) : (
        byWeek.map(([week, items]) => {
          const isOpen = hasActiveFilter || openWeeks.has(week);
          return (
            <div key={week} className="smpr-week">
              <button className="smpr-week-head" onClick={() => toggleWeek(week)}>
                <span className="smpr-week-title">WEEK {week}</span>
                <span className="smpr-week-count">
                  {items.length} resource{items.length === 1 ? "" : "s"}
                </span>
                <svg
                  className={`smpr-chevron ${isOpen ? "open" : ""}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {isOpen && (
                <div className={view === "grid" ? "smp-res-grid smpr-week-body" : "smpr-list smpr-week-body"}>
                  {items.map((r) =>
                    view === "grid" ? <GridCard key={r.id} resource={r} /> : <ListRow key={r.id} resource={r} />
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Footer */}
      <div className="smpr-footer">
        <div>
          <strong>Can&apos;t find what you&apos;re looking for?</strong>
          <p>Contact your instructor or reach out to support.</p>
        </div>
        <a href="mailto:kitph@gmail.com" className="smp-help-btn" style={{ width: "auto", padding: "10px 18px" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4h6v6M20 4L10 14M20 14v6H4V4h6" /></svg>
          Contact support
        </a>
      </div>
    </div>
  );
}

function ListRow({ resource: r }: { resource: ResourceWithSize }) {
  const { open, busy, showCode, error } = useResourceOpen(r);
  const style = KIND_STYLE[r.kind] ?? DEFAULT_STYLE;
  const isInlineCode = !r.url && !r.storage_path && !!r.code_body;
  const label = busy ? "Opening…" : isInlineCode ? (showCode ? "Hide" : "Show") : style.verb;
  const size = formatSize(r.sizeBytes);

  return (
    <div className="smpr-row">
      <span className={`smp-res-icon ${style.accent}`}>
        <ResourceIcon kind={r.kind} />
      </span>
      <div>
        <div className="smpr-row-title">{r.title}</div>
        <div className="smpr-row-kind">{KIND_LABELS[r.kind] ?? r.kind}</div>
      </div>
      <div className="smpr-row-desc">{r.description}</div>
      <div className="smpr-row-size">{size ?? "—"}</div>
      <button className={`smpr-row-action ${style.accent}`} onClick={open} disabled={busy}>
        {label}
      </button>
      {error && <p className="smp-res-error">{error}</p>}
      {showCode && r.code_body && (
        <pre className="smp-code" style={{ gridColumn: "1 / -1" }}>
          <code>{r.code_body}</code>
        </pre>
      )}
    </div>
  );
}

function GridCard({ resource: r }: { resource: ResourceWithSize }) {
  const { open, busy, showCode, error } = useResourceOpen(r);
  const style = KIND_STYLE[r.kind] ?? DEFAULT_STYLE;
  const isInlineCode = !r.url && !r.storage_path && !!r.code_body;
  const label = busy ? "Opening…" : isInlineCode ? (showCode ? "Hide code" : "Show code") : style.verb;

  return (
    <div>
      <button className="smp-res" onClick={open} disabled={busy}>
        <span className={`smp-res-icon ${style.accent}`}>
          <ResourceIcon kind={r.kind} />
        </span>
        <span className="smp-res-title">{r.title}</span>
        <span className={`smp-res-action ${style.accent}`}>{label}</span>
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
