"use client";

import { useState } from "react";
import { createBatch, updateBatch, deleteBatch } from "./batch-actions";

export type BatchForManagement = {
  id: string;
  cohort_label: string;
  capacity: number;
  status: string;
  seats_used: number;
};

export default function BatchManagement({
  courseSlug,
  year,
  batches: initialBatches,
}: {
  courseSlug: string;
  year: number;
  batches: BatchForManagement[];
}) {
  const [batches, setBatches] = useState(initialBatches);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <h2>Batches</h2>
        <span className="admin-hint">{batches.length} batch{batches.length === 1 ? "" : "es"}</span>
      </div>

      <p className="admin-hint">
        Batches group students into cohorts that run the same curriculum at different times.
        Each batch has its own instructor, meet link, and schedule.
      </p>

      {batches.length === 0 && !adding && (
        <div className="admin-empty">
          <p>No batches yet for this cohort.</p>
          <em>Create one to start enrolling students.</em>
        </div>
      )}

      {batches.map((batch) =>
        editing === batch.id ? (
          <BatchForm
            key={batch.id}
            courseSlug={courseSlug}
            year={year}
            batch={batch}
            batches={batches}
            onDone={() => {
              setEditing(null);
              setError(null);
            }}
            onError={setError}
          />
        ) : (
          <BatchCard
            key={batch.id}
            batch={batch}
            onEdit={() => setEditing(batch.id)}
            onDelete={async () => {
              const res = await deleteBatch(batch.id);
              if (res.ok) {
                setBatches(batches.filter((b) => b.id !== batch.id));
              } else {
                setError(res.error);
              }
            }}
          />
        )
      )}

      {adding ? (
        <BatchForm
          courseSlug={courseSlug}
          year={year}
          batch={null}
          batches={batches}
          onDone={() => {
            setAdding(false);
            setError(null);
          }}
          onError={setError}
          onSave={(newBatch) => {
            setBatches([...batches, newBatch]);
            setAdding(false);
          }}
        />
      ) : (
        <div className="admin-add-row">
          <button className="admin-btn admin-btn-navy" onClick={() => setAdding(true)}>
            + Add batch
          </button>
        </div>
      )}

      {error && <p className="af-submit-error">{error}</p>}
    </section>
  );
}

function BatchCard({
  batch,
  onEdit,
  onDelete,
}: {
  batch: BatchForManagement;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const spotsLeft = batch.capacity - batch.seats_used;
  const full = spotsLeft <= 0;

  return (
    <div className="admin-card">
      <div className="admin-batch-head">
        <div>
          <h3>{batch.cohort_label}</h3>
          <p className="admin-batch-meta">
            {batch.seats_used} of {batch.capacity} spots filled
            {full && <span className="admin-pill admin-pill-danger"> Full</span>}
          </p>
        </div>
        <span className={`admin-pill stat-${batch.status}`}>{batch.status}</span>
      </div>

      <div className="admin-batch-bar">
        <div className="admin-batch-fill" style={{ width: `${(batch.seats_used / batch.capacity) * 100}%` }} />
      </div>

      {confirming ? (
        <div className="admin-batch-confirm">
          <p>Delete {batch.cohort_label}? This cannot be undone.</p>
          <button
            className="admin-btn admin-btn-danger admin-btn-sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onDelete();
              setBusy(false);
            }}
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
          <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setConfirming(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="admin-batch-actions">
          <button className="admin-btn admin-btn-navy admin-btn-sm" onClick={onEdit}>
            Edit
          </button>
          <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setConfirming(true)}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function BatchForm({
  courseSlug,
  year,
  batch,
  batches,
  onDone,
  onError,
  onSave,
}: {
  courseSlug: string;
  year: number;
  batch: BatchForManagement | null;
  batches: BatchForManagement[];
  onDone: () => void;
  onError: (error: string) => void;
  onSave?: (batch: BatchForManagement) => void;
}) {
  const [label, setLabel] = useState(batch?.cohort_label ?? "");
  const [capacity, setCapacity] = useState(batch?.capacity ?? 15);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSaveClick() {
    if (!label.trim()) {
      setErr("A batch label is required.");
      return;
    }
    if (capacity < 1) {
      setErr("Capacity must be at least 1.");
      return;
    }

    setBusy(true);
    setErr(null);

    /* For new batches, auto-assign cohort_number as next sequential number */
    const cohortNumber = batch ? batch.capacity : batches.length + 1;

    const res = batch
      ? await updateBatch(batch.id, label, capacity)
      : await createBatch(courseSlug, year, cohortNumber, label, capacity);

    setBusy(false);

    if (!res.ok) {
      setErr(res.error);
      onError(res.error);
    } else {
      if (onSave && !batch) {
        onSave({
          id: res.id!,
          cohort_label: label,
          capacity,
          status: "active",
          seats_used: 0,
        });
      }
      onDone();
    }
  }

  return (
    <div className="admin-card">
      <div className="admin-week-body">
        <label className="af-field">
          <span>Batch label</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Morning cohort, Afternoon cohort"
          />
          <em className="af-hint">Shown to students when they enrol.</em>
        </label>

        <label className="af-field">
          <span>Capacity</span>
          <input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(Math.max(1, Number(e.target.value)))}
            min="1"
            max="50"
          />
          <em className="af-hint">Maximum students in this batch.</em>
        </label>

        {err && <p className="af-submit-error">{err}</p>}

        <div className="admin-batch-form-actions">
          <button className="af-submit" onClick={onSaveClick} disabled={busy}>
            {busy ? "Saving…" : batch ? "Save changes" : "Create batch"}
          </button>
          <button className="admin-btn admin-btn-ghost" onClick={onDone}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
