"use client";

import { useEffect, useState } from "react";
import {
  getBatchesForTeacherAssignment,
  grantBatchAccess,
  revokeBatchAccess,
} from "./actions";
import type { TeacherBatchOption } from "./actions";

/**
 * Every checkbox writes independently — grantBatchAccess / revokeBatchAccess
 * are each a single insert or delete, not part of a bulk save. A
 * partial failure this way is never ambiguous about which grants
 * actually landed (doc 08 §7). No "Save" button on this panel at all,
 * deliberately: each toggle IS the save.
 */
export default function TeacherBatchPanel({
  teacherId,
  onCountChange,
}: {
  teacherId: string;
  onCountChange: (count: number) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [batches, setBatches] = useState<TeacherBatchOption[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getBatchesForTeacherAssignment(teacherId).then((res) => {
      if (cancelled) return;
      if (!res.ok) setError(res.error);
      else setBatches(res.batches);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [teacherId]);

  async function toggle(batch: TeacherBatchOption) {
    setPendingId(batch.id);
    setError(null);

    // Optimistic — flip immediately, roll back on failure. Same
    // pattern as the homework queue's Return action (doc 06 §V.a).
    const nextAssigned = !batch.assigned;
    setBatches((prev) =>
      prev.map((b) => (b.id === batch.id ? { ...b, assigned: nextAssigned } : b))
    );

    const res = nextAssigned
      ? await grantBatchAccess(teacherId, batch.id)
      : await revokeBatchAccess(teacherId, batch.id);

    if (!res.ok) {
      setBatches((prev) =>
        prev.map((b) => (b.id === batch.id ? { ...b, assigned: !nextAssigned } : b))
      );
      setError(res.error);
    } else {
      // Read the count off the functional updater's own `prev`, not
      // the `batches` closed over at the top of this function — that
      // value is stale by the time this `await` resolves, and two
      // toggles in quick succession would otherwise race.
      setBatches((prev) => {
        const count = prev.filter((b) => b.assigned).length;
        onCountChange(count);
        return prev;
      });
    }

    setPendingId(null);
  }

  if (loading) {
    return <div className="admin-app-note">Loading batches…</div>;
  }

  if (error && batches.length === 0) {
    return <div className="admin-app-result bad">{error}</div>;
  }

  if (batches.length === 0) {
    return (
      <div className="admin-empty">
        <p>No batches exist yet.</p>
      </div>
    );
  }

  const summer = batches.filter((b) => b.programme_type === "summer");
  const term = batches.filter((b) => b.programme_type === "term");

  return (
    <div className="admin-app-note" style={{ display: "block" }}>
      {error && <div className="admin-app-result bad">{error}</div>}

      {summer.length > 0 && (
        <BatchGroup
          label="Summer"
          pillClass="prog-summer"
          batches={summer}
          pendingId={pendingId}
          onToggle={toggle}
        />
      )}
      {term.length > 0 && (
        <BatchGroup
          label="12-Week"
          pillClass="prog-term"
          batches={term}
          pendingId={pendingId}
          onToggle={toggle}
        />
      )}
    </div>
  );
}

function BatchGroup({
  label,
  pillClass,
  batches,
  pendingId,
  onToggle,
}: {
  label: string;
  pillClass: string;
  batches: TeacherBatchOption[];
  pendingId: string | null;
  onToggle: (b: TeacherBatchOption) => void;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <span className={`admin-pill ${pillClass}`} style={{ marginBottom: 8, display: "inline-flex" }}>
        {label}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
        {batches.map((b) => (
          <label
            key={b.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13.5,
              opacity: pendingId === b.id ? 0.6 : 1,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={b.assigned}
              disabled={pendingId === b.id}
              onChange={() => onToggle(b)}
            />
            {b.cohort_label}
            <span className="admin-muted">— {b.course_title}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
