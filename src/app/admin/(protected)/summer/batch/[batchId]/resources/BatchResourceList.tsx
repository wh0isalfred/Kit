"use client";

import { useState } from "react";
import {
  saveResource,
  deleteBatchResource,
  uploadResourceFile,
  type BatchResource,
  type ResourceKind,
} from "../../../resource-actions";

const KINDS: { value: ResourceKind; label: string; icon: string }[] = [
  { value: "link", label: "Link", icon: "🔗" },
  { value: "video", label: "Video", icon: "🎬" },
  { value: "recording", label: "Class recording", icon: "📹" },
  { value: "slides", label: "Slides", icon: "📊" },
  { value: "file", label: "File", icon: "📄" },
  { value: "homework", label: "Homework", icon: "✏️" },
  { value: "code", label: "Code snippet", icon: "💻" },
];

const iconFor = (kind: string) => KINDS.find((k) => k.value === kind)?.icon ?? "📄";

const toLocalInput = (iso: string | null) =>
  iso ? new Date(iso).toISOString().slice(0, 16) : "";
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

export default function BatchResourceList({
  batchId,
  batchLabel,
  cohortYear,
  initialResources,
  initialError,
}: {
  batchId: string;
  batchLabel: string;
  cohortYear: number;
  initialResources: BatchResource[];
  initialError: string | null;
}) {
  const [resources, setResources] = useState(initialResources);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError);

  const sorted = [...resources].sort((a, b) => {
    if (a.week !== b.week) return a.week - b.week;
    const ad = a.day_number ?? 99;
    const bd = b.day_number ?? 99;
    if (ad !== bd) return ad - bd;
    return a.sort_order - b.sort_order;
  });

  function upsertLocal(updated: BatchResource) {
    setResources((prev) => {
      const exists = prev.some((r) => r.id === updated.id);
      return exists ? prev.map((r) => (r.id === updated.id ? updated : r)) : [...prev, updated];
    });
  }

  function removeLocal(id: string) {
    setResources((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <section>
      {error && <p className="af-submit-error">{error}</p>}

      {sorted.length === 0 && !adding && (
        <div className="admin-empty">
          <p>No resources visible to this batch yet.</p>
          <em>Add one below, or check the cohort-level Resources section on /admin/summer for shared curriculum.</em>
        </div>
      )}

      <div className="admin-res-list">
        {sorted.map((r) =>
          editingId === r.id ? (
            <BatchResourceForm
              key={r.id}
              batchId={batchId}
              batchLabel={batchLabel}
              cohortYear={cohortYear}
              existing={r}
              onDone={() => setEditingId(null)}
              onSaved={upsertLocal}
              onError={setError}
            />
          ) : (
            <BatchResourceRow
              key={r.id}
              resource={r}
              batchLabel={batchLabel}
              onEdit={() => {
                setEditingId(r.id);
                setAdding(false);
              }}
              onDeleted={() => removeLocal(r.id)}
              onError={setError}
            />
          )
        )}
      </div>

      {adding ? (
        <BatchResourceForm
          batchId={batchId}
          batchLabel={batchLabel}
          cohortYear={cohortYear}
          existing={null}
          onDone={() => setAdding(false)}
          onSaved={(r) => {
            upsertLocal(r);
            setAdding(false);
          }}
          onError={setError}
        />
      ) : (
        <div className="admin-add-row">
          <button
            className="admin-btn admin-btn-navy"
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
          >
            + Add resource
          </button>
        </div>
      )}
    </section>
  );
}

function BatchResourceRow({
  resource: r,
  batchLabel,
  onEdit,
  onDeleted,
  onError,
}: {
  resource: BatchResource;
  batchLabel: string;
  onEdit: () => void;
  onDeleted: () => void;
  onError: (e: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const isShared = r.batch_id === null;

  async function onDelete() {
    setBusy(true);
    const res = await deleteBatchResource(r.id);
    setBusy(false);
    if (res.ok) onDeleted();
    else onError(res.error);
    setConfirming(false);
  }

  return (
    <div className={`admin-res ${r.published ? "" : "draft"}`}>
      <span className="admin-res-icon">{iconFor(r.kind)}</span>

      <div className="admin-res-body">
        <p className="admin-res-title">
          Week {r.week}{r.day_number != null ? ` · Day ${r.day_number}` : " · Anytime"} — {r.title}
        </p>
        <p className="admin-res-meta">
          {r.kind}
          {r.kind === "homework" && ` · submit via ${r.submission_type ?? "not set"}`}
          {" · "}
          <span className={isShared ? "admin-res-tag-shared" : "admin-res-tag-batch"}>
            {isShared ? "Shared" : `${batchLabel} only`}
          </span>
        </p>
      </div>

      <div className="admin-res-actions">
        <span className={`admin-pill ${r.published ? "admin-pill-on" : ""}`}>
          {r.published ? "Published" : "Draft"}
        </span>

        <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={onEdit}>
          Edit
        </button>

        {isShared ? (
          <a href="/admin/summer" className="admin-hint admin-res-cohort-link">
            Delete from cohort Resources →
          </a>
        ) : confirming ? (
          <>
            <button className="admin-btn admin-btn-danger admin-btn-sm" disabled={busy} onClick={onDelete}>
              {busy ? "Deleting…" : "Confirm delete"}
            </button>
            <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setConfirming(true)}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function BatchResourceForm({
  batchId,
  batchLabel,
  cohortYear,
  existing,
  onDone,
  onSaved,
  onError,
}: {
  batchId: string;
  batchLabel: string;
  cohortYear: number;
  existing: BatchResource | null;
  onDone: () => void;
  onSaved: (r: BatchResource) => void;
  onError: (e: string) => void;
}) {
  const [week, setWeek] = useState(existing?.week ?? 1);
  const [day, setDay] = useState<number | null>(existing?.day_number ?? null);
  const [kind, setKind] = useState<ResourceKind>((existing?.kind as ResourceKind) ?? "link");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [url, setUrl] = useState(existing?.url ?? "");
  const [storagePath, setStoragePath] = useState(existing?.storage_path ?? null);
  const [fileName, setFileName] = useState<string | null>(
    existing?.storage_path ? existing.storage_path.split("/").pop() ?? null : null
  );
  const [codeBody, setCodeBody] = useState(existing?.code_body ?? "");
  const [codeLanguage, setCodeLanguage] = useState(existing?.code_language ?? "");
  const [submissionType, setSubmissionType] = useState<"link" | "file" | null>(
    existing?.submission_type ?? null
  );
  const [published, setPublished] = useState(existing?.published ?? false);
  const [availableFrom, setAvailableFrom] = useState(toLocalInput(existing?.available_from ?? null));

  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmingSharedSave, setConfirmingSharedSave] = useState(false);

  const usesUrl = ["link", "video", "recording"].includes(kind);
  const usesFile = ["file", "slides", "homework"].includes(kind);
  const usesCode = kind === "code";
  const isEditingShared = existing !== null && existing.batch_id === null;
  // New resources default to "this batch only" (doc 06 §IV rationale).
  // Not re-editable for an existing row — moving something between
  // shared and batch-only is a bigger decision than this form makes.
  const resolvedBatchId = existing ? existing.batch_id : batchId;

  async function onUpload(file: File) {
    setUploading(true);
    setErr(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("cohortYear", String(cohortYear));
    fd.append("week", String(week));
    const res = await uploadResourceFile(fd);
    setUploading(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setStoragePath(res.path);
    setFileName(res.name);
    if (!title.trim()) setTitle(res.name.replace(/\.[^.]+$/, ""));
  }

  async function doSave() {
    setBusy(true);
    setErr(null);

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
      sortOrder: existing?.sort_order ?? 0,
      submissionType,
      batchId: resolvedBatchId,
    });

    setBusy(false);

    if (!res.ok) {
      setErr(res.error);
      onError(res.error);
      return;
    }

    onSaved({
      id: res.id ?? existing!.id,
      cohort_year: cohortYear,
      week,
      day_number: day,
      title,
      description: description || null,
      kind,
      url: url || null,
      storage_path: storagePath,
      code_body: usesCode ? codeBody : null,
      code_language: usesCode ? codeLanguage || "text" : null,
      published,
      available_from: fromLocalInput(availableFrom),
      sort_order: existing?.sort_order ?? 0,
      submission_type: kind === "homework" ? submissionType : null,
      batch_id: resolvedBatchId,
    });
    onDone();
  }

  function onSaveClick() {
    if (!title.trim()) {
      setErr("Give it a title.");
      return;
    }
    if (isEditingShared && !confirmingSharedSave) {
      setConfirmingSharedSave(true);
      return;
    }
    doSave();
  }

  return (
    <div className="admin-res-form">
      {existing === null && (
        <p className="admin-hint">
          Adding as <strong>{batchLabel} only</strong>. For shared curriculum visible to every batch, use the Resources section on /admin/summer instead.
        </p>
      )}

      {isEditingShared && (
        <p className="admin-warn">
          This is shared curriculum — changes apply to every batch, not just {batchLabel}.
        </p>
      )}

      <div className="af-row">
        <label className="af-field">
          <span>Week</span>
          <select value={week} onChange={(e) => setWeek(Number(e.target.value))}>
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>Week {n}</option>
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
        <span>Type</span>
        <select value={kind} onChange={(e) => setKind(e.target.value as ResourceKind)}>
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>{k.icon} {k.label}</option>
          ))}
        </select>
      </label>

      <label className="af-field">
        <span>Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Extra grid worksheet" />
      </label>

      <label className="af-field">
        <span>Description (optional)</span>
        <input value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>

      {usesUrl && (
        <label className="af-field">
          <span>Link</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </label>
      )}

      {usesFile && (
        <div className="af-field">
          <span>{kind === "homework" ? "Task instructions / starter file (optional)" : "File"}</span>
          {fileName ? (
            <div className="admin-file-chip">
              <span>📎 {fileName}</span>
              <button type="button" onClick={() => { setStoragePath(null); setFileName(null); }}>
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
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Or paste a link instead" />
        </div>
      )}

      {kind === "homework" && (
        <label className="af-field">
          <span>How should students submit their work?</span>
          <select
            value={submissionType ?? ""}
            onChange={(e) => setSubmissionType(e.target.value === "" ? null : (e.target.value as "link" | "file"))}
          >
            <option value="">Not needed — view only</option>
            <option value="link">A link</option>
            <option value="file">A file upload</option>
          </select>
        </label>
      )}

      {usesCode && (
        <>
          <label className="af-field">
            <span>Language</span>
            <input value={codeLanguage} onChange={(e) => setCodeLanguage(e.target.value)} />
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

      <label className="af-field">
        <span>Reveal at (optional)</span>
        <input type="datetime-local" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} />
      </label>

      <label className="af-consent">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
        <span>Published — students can see this</span>
      </label>

      {err && <p className="af-submit-error">{err}</p>}

      <div className="admin-res-form-actions">
        {confirmingSharedSave ? (
          <>
            <button className="admin-btn admin-btn-danger" onClick={doSave} disabled={busy}>
              {busy ? "Saving…" : "Yes, apply to all batches"}
            </button>
            <button className="admin-btn admin-btn-ghost" onClick={() => setConfirmingSharedSave(false)}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button className="admin-btn admin-btn-primary" onClick={onSaveClick} disabled={busy || uploading}>
              {busy ? "Saving…" : existing ? "Save changes" : "Add resource"}
            </button>
            <button className="admin-btn admin-btn-ghost" onClick={onDone}>
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}