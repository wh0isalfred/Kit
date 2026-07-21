"use client";

import { useState } from "react";
import {
  deleteResource,
  moveResource,
  saveResource,
  toggleResourcePublished,
  uploadResourceFile,
  type ResourceKind,
} from "./resource-actions";

export type Resource = {
  id: string;
  cohort_year: number;
  week: number;
  day_number: number | null;
  title: string;
  description: string | null;
  kind: string;
  url: string | null;
  storage_path: string | null;
  code_body: string | null;
  code_language: string | null;
  published: boolean;
  available_from: string | null;
  sort_order: number;
};

const KINDS: { value: ResourceKind; label: string; icon: string }[] = [
  { value: "link", label: "Link", icon: "🔗" },
  { value: "video", label: "Video", icon: "🎬" },
  { value: "recording", label: "Class recording", icon: "📹" },
  { value: "slides", label: "Slides", icon: "📊" },
  { value: "file", label: "File", icon: "📄" },
  { value: "homework", label: "Homework", icon: "✏️" },
  { value: "code", label: "Code snippet", icon: "💻" },
];

const iconFor = (kind: string) =>
  KINDS.find((k) => k.value === kind)?.icon ?? "📄";

const toLocalInput = (iso: string | null) =>
  iso ? new Date(iso).toISOString().slice(0, 16) : "";
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

export default function SummerResources({
  cohortYear,
  currentWeek,
  weeksWithContent,
  resources,
}: {
  cohortYear: number;
  currentWeek: number;
  weeksWithContent: number[];
  resources: Resource[];
}) {
  const [week, setWeek] = useState(currentWeek);
  const [adding, setAdding] = useState<number | null | "none">("none");
  const [editing, setEditing] = useState<string | null>(null);

  const weekResources = resources.filter((r) => r.week === week);

  /* Days present in the data, plus "anytime" (null). Only days that
     actually have something are shown, so an empty week isn't five
     empty headers. */
  const days = Array.from(
    new Set(weekResources.map((r) => r.day_number))
  ).sort((a, b) => {
    if (a === null) return 1;   // "anytime" last
    if (b === null) return -1;
    return a - b;
  });

  const weekExists = weeksWithContent.includes(week);

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <h2>Resources</h2>
        <span className="admin-hint">
          {resources.length} total · {resources.filter((r) => r.published).length}{" "}
          published
        </span>
      </div>

      <p className="admin-hint">
        Students see weeks up to the current week, newest first. Week{" "}
        {currentWeek} is showing now — anything in a later week stays hidden
        even if published, so you can prepare ahead.
      </p>

      <div className="admin-tabs">
        {[1, 2, 3].map((n) => {
          const count = resources.filter((r) => r.week === n).length;
          return (
            <button
              key={n}
              className={`admin-tab ${week === n ? "on" : ""}`}
              onClick={() => {
                setWeek(n);
                setAdding("none");
                setEditing(null);
              }}
            >
              Week {n}
              {count > 0 && ` (${count})`}
              {n === currentWeek && " ·"}
            </button>
          );
        })}
      </div>

      {!weekExists && (
        <p className="admin-warn">
          Week {week} has no content row yet. Save its details in the section
          above first — resources attach to a week that exists.
        </p>
      )}

      {weekResources.length === 0 && weekExists && (
        <div className="admin-empty">
          <p>Nothing in week {week} yet.</p>
          <em>Add slides, links, recordings, or code below.</em>
        </div>
      )}

      {days.map((day) => (
        <div key={day ?? "anytime"} className="admin-day">
          <div className="admin-day-head">
            <h3>{day === null ? "Anytime" : `Day ${day}`}</h3>
            <button
              className="admin-btn admin-btn-ghost admin-btn-sm"
              onClick={() => {
                setAdding(day);
                setEditing(null);
              }}
            >
              + Add here
            </button>
          </div>

          <div className="admin-res-list">
            {weekResources
              .filter((r) => r.day_number === day)
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((r) =>
                editing === r.id ? (
                  <ResourceForm
                    key={r.id}
                    cohortYear={cohortYear}
                    week={week}
                    existing={r}
                    nextSort={r.sort_order}
                    onDone={() => setEditing(null)}
                  />
                ) : (
                  <ResourceCard
                    key={r.id}
                    resource={r}
                    onEdit={() => {
                      setEditing(r.id);
                      setAdding("none");
                    }}
                  />
                )
              )}
          </div>

          {adding === day && (
            <ResourceForm
              cohortYear={cohortYear}
              week={week}
              defaultDay={day}
              nextSort={weekResources.length}
              onDone={() => setAdding("none")}
            />
          )}
        </div>
      ))}

      {weekExists && adding === "none" && (
        <div className="admin-add-row">
          <button className="admin-btn admin-btn-navy" onClick={() => setAdding(null)}>
            + Add resource
          </button>
        </div>
      )}

      {adding !== "none" && !days.includes(adding as number | null) && (
        <ResourceForm
          cohortYear={cohortYear}
          week={week}
          defaultDay={adding as number | null}
          nextSort={weekResources.length}
          onDone={() => setAdding("none")}
        />
      )}
    </section>
  );
}

/* ── Card ─────────────────────────────────────────────────── */

function ResourceCard({
  resource: r,
  onEdit,
}: {
  resource: Resource;
  onEdit: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const scheduled =
    r.available_from && new Date(r.available_from) > new Date()
      ? new Date(r.available_from).toLocaleString("en-NG", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  return (
    <div className={`admin-res ${r.published ? "" : "draft"}`}>
      <span className="admin-res-icon">{iconFor(r.kind)}</span>

      <div className="admin-res-body">
        <p className="admin-res-title">{r.title}</p>
        {r.description && <p className="admin-res-desc">{r.description}</p>}
        <p className="admin-res-meta">
          {r.kind}
          {r.url && ` · ${shortUrl(r.url)}`}
          {r.storage_path && " · uploaded file"}
          {scheduled && ` · reveals ${scheduled}`}
        </p>
      </div>

      <div className="admin-res-actions">
        <button
          className={`admin-pill ${r.published ? "admin-pill-on" : ""} admin-pill-btn`}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await toggleResourcePublished(r.id, !r.published);
            setBusy(false);
          }}
        >
          {r.published ? "Published" : "Draft"}
        </button>

        <button className="admin-icon-btn" onClick={() => moveResource(r.id, "up")} title="Move up">
          ↑
        </button>
        <button className="admin-icon-btn" onClick={() => moveResource(r.id, "down")} title="Move down">
          ↓
        </button>
        <button className="admin-icon-btn" onClick={onEdit} title="Edit">
          ✎
        </button>

        {confirming ? (
          <>
            <button
              className="admin-btn admin-btn-danger admin-btn-sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await deleteResource(r.id);
              }}
            >
              Delete
            </button>
            <button className="admin-icon-btn" onClick={() => setConfirming(false)}>
              ✕
            </button>
          </>
        ) : (
          <button
            className="admin-icon-btn danger"
            onClick={() => setConfirming(true)}
            title="Delete"
          >
            🗑
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Form ─────────────────────────────────────────────────── */

function ResourceForm({
  cohortYear,
  week,
  existing,
  defaultDay = null,
  nextSort,
  onDone,
}: {
  cohortYear: number;
  week: number;
  existing?: Resource;
  defaultDay?: number | null;
  nextSort: number;
  onDone: () => void;
}) {
  const [kind, setKind] = useState<ResourceKind>(
    (existing?.kind as ResourceKind) ?? "link"
  );
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [day, setDay] = useState<number | null>(
    existing?.day_number ?? defaultDay
  );
  const [url, setUrl] = useState(existing?.url ?? "");
  const [storagePath, setStoragePath] = useState(existing?.storage_path ?? null);
  const [fileName, setFileName] = useState<string | null>(
    existing?.storage_path ? existing.storage_path.split("/").pop() ?? null : null
  );
  const [codeBody, setCodeBody] = useState(existing?.code_body ?? "");
  const [codeLanguage, setCodeLanguage] = useState(existing?.code_language ?? "");
  const [published, setPublished] = useState(existing?.published ?? false);
  const [availableFrom, setAvailableFrom] = useState(
    toLocalInput(existing?.available_from ?? null)
  );

  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usesUrl = ["link", "video", "recording"].includes(kind);
  const usesFile = ["file", "slides", "homework"].includes(kind);
  const usesCode = kind === "code";

  async function onUpload(file: File) {
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("cohortYear", String(cohortYear));
    fd.append("week", String(week));
    const res = await uploadResourceFile(fd);
    setUploading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setStoragePath(res.path);
    setFileName(res.name);
    if (!title.trim()) setTitle(res.name.replace(/\.[^.]+$/, ""));
  }

  async function onSave() {
    setBusy(true);
    setError(null);
    const res = await saveResource({
      id: existing?.id,
      cohortYear,
      week,
      dayNumber: day,
      title,
      description,
      kind,
      url,
      storagePath,
      codeBody,
      codeLanguage,
      published,
      availableFrom: fromLocalInput(availableFrom),
      sortOrder: existing?.sort_order ?? nextSort,
    });
    setBusy(false);
    if (!res.ok) setError(res.error);
    else onDone();
  }

  return (
    <div className="admin-res-form">
      <div className="af-row">
        <label className="af-field">
          <span>Type</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as ResourceKind)}>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.icon} {k.label}
              </option>
            ))}
          </select>
        </label>

        <label className="af-field">
          <span>Day</span>
          <select
            value={day === null ? "" : String(day)}
            onChange={(e) => setDay(e.target.value === "" ? null : Number(e.target.value))}
          >
            <option value="">Anytime this week</option>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <option key={d} value={d}>Day {d}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="af-field">
        <span>Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Intro to HTML — slides"
        />
      </label>

      <label className="af-field">
        <span>Description (optional)</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this is, or what to do with it"
        />
      </label>

      {usesUrl && (
        <label className="af-field">
          <span>Link</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=…"
          />
          <em className="af-hint">
            Put videos on YouTube (unlisted) or Drive rather than uploading —
            storage here is limited.
          </em>
        </label>
      )}

      {usesFile && (
        <div className="af-field">
          <span>File</span>
          {fileName ? (
            <div className="admin-file-chip">
              <span>📎 {fileName}</span>
              <button
                type="button"
                onClick={() => {
                  setStoragePath(null);
                  setFileName(null);
                }}
              >
                Remove
              </button>
            </div>
          ) : (
            <input
              type="file"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
              }}
            />
          )}
          {uploading && <em className="af-hint">Uploading…</em>}
          <em className="af-hint">
            Max 25MB. Or paste a link instead:
          </em>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://drive.google.com/…"
          />
        </div>
      )}

      {usesCode && (
        <>
          <label className="af-field">
            <span>Language</span>
            <input
              value={codeLanguage}
              onChange={(e) => setCodeLanguage(e.target.value)}
              placeholder="html, css, javascript, python"
            />
          </label>
          <label className="af-field">
            <span>Code</span>
            <textarea
              rows={7}
              value={codeBody}
              onChange={(e) => setCodeBody(e.target.value)}
              style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13 }}
            />
          </label>
        </>
      )}

      <div className="af-row">
        <label className="af-field">
          <span>Reveal at (optional)</span>
          <input
            type="datetime-local"
            value={availableFrom}
            onChange={(e) => setAvailableFrom(e.target.value)}
          />
          <em className="af-hint">
            Leave blank to show as soon as it&apos;s published.
          </em>
        </label>
      </div>

      <label className="af-consent">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
        />
        <span>Published — students can see this</span>
      </label>

      {error && <p className="af-submit-error">{error}</p>}

      <div className="admin-res-form-actions">
        <button className="admin-btn admin-btn-primary" onClick={onSave} disabled={busy || uploading}>
          {busy ? "Saving…" : existing ? "Save changes" : "Add resource"}
        </button>
        <button className="admin-btn admin-btn-ghost" onClick={onDone}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function shortUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 30);
  }
}
