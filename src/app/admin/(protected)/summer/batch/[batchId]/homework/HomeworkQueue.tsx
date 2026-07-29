"use client";

import { useState, useEffect } from "react";
import { returnHomework, getSubmissionFileUrl, type GradingQueueItem } from "../../../batch-actions";
import ByAssignmentView from "./ByAssignmentView";
import type { HomeworkAssignment } from "../../../batch-actions";

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/i;

function relativeTime(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function isStale(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() > 3 * 24 * 60 * 60 * 1000;
}

export default function HomeworkQueue({
  batchId,
  initialQueue,
  initialError,
  assignments,
}: {
  batchId: string;
  initialQueue: GradingQueueItem[];
  initialError: string | null;
  assignments: HomeworkAssignment[];
}) {
  const [view, setView] = useState<"queue" | "by-assignment">("queue");
  const [queue, setQueue] = useState(initialQueue);

  return (
    <div className="hw-queue-tab">
      <div className="hw-queue-segmented">
        <button
          className={`hw-queue-seg${view === "queue" ? " hw-queue-seg-active" : ""}`}
          onClick={() => setView("queue")}
        >
          Needs grading ({queue.length})
        </button>
        <button
          className={`hw-queue-seg${view === "by-assignment" ? " hw-queue-seg-active" : ""}`}
          onClick={() => setView("by-assignment")}
        >
          By assignment
        </button>
      </div>

      {initialError && <p className="hw-review-error">Failed to load queue: {initialError}</p>}

      {view === "queue" ? (
        <QueueView queue={queue} setQueue={setQueue} />
      ) : (
        <ByAssignmentView batchId={batchId} assignments={assignments} />
      )}
    </div>
  );
}

function QueueView({
  queue,
  setQueue,
}: {
  queue: GradingQueueItem[];
  setQueue: (q: GradingQueueItem[]) => void;
}) {
  if (queue.length === 0) {
    return (
      <div className="hw-review-empty">
        <p><strong>Nothing waiting.</strong> Everyone in this batch is up to date on graded work.</p>
        <em>Check who hasn&apos;t submitted using the By assignment view above.</em>
      </div>
    );
  }

  function moveToBottom(id: string) {
    const item = queue.find((q) => q.submission_id === id);
    if (!item) return;
    setQueue([...queue.filter((q) => q.submission_id !== id), item]);
  }

  function remove(id: string) {
    setQueue(queue.filter((q) => q.submission_id !== id));
  }

  function restore(item: GradingQueueItem) {
    // Back at the front — it was next in line before the failed
    // attempt, and the queue is FIFO by design.
    setQueue([item, ...queue.filter((q) => q.submission_id !== item.submission_id)]);
  }

  return (
    <div className="hw-queue-list">
      {queue.map((item) => (
        <QueueCard
          key={item.submission_id}
          item={item}
          onSkip={() => moveToBottom(item.submission_id)}
          onRemove={() => remove(item.submission_id)}
          onRestore={() => restore(item)}
        />
      ))}
    </div>
  );
}

function QueueCard({
  item,
  onSkip,
  onRemove,
  onRestore,
}: {
  item: GradingQueueItem;
  onSkip: () => void;
  onRemove: () => void;
  onRestore: () => void;
}) {
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);

  const isImage = item.submission_type === "file" && !!item.storage_path && IMAGE_EXT.test(item.storage_path);

  useEffect(() => {
    if (isImage && item.storage_path) {
      (async () => {
        setFileLoading(true);
        const res = await getSubmissionFileUrl(item.storage_path!);
        setFileLoading(false);
        if (res.ok) setFileUrl(res.url);
        else setError(res.error);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onOpenFile() {
    if (!item.storage_path) return;
    if (fileUrl) {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
      return;
    }
    setFileLoading(true);
    setError(null);
    const res = await getSubmissionFileUrl(item.storage_path);
    setFileLoading(false);
    if (res.ok) {
      setFileUrl(res.url);
      window.open(res.url, "_blank", "noopener,noreferrer");
    } else {
      setError(res.error);
    }
  }

  async function onReturn() {
    setBusy(true);
    setError(null);

    onRemove();

    const res = await returnHomework(item.submission_id, feedback);
    if (!res.ok) {
      setBusy(false);
      setError(res.error);
      onRestore();
    }
  }

  const stale = isStale(item.submitted_at);

  return (
    <div className={`hw-queue-card${stale ? " hw-queue-card-stale" : ""}`}>
      <div className="hw-queue-card-head">
        <div>
          <strong>{item.student_name}</strong>{" "}
          <span className="hw-queue-summer-id">{item.summer_id}</span>
        </div>
        <span className="hw-queue-week">
          Week {item.week}{item.day_number != null && ` · Day ${item.day_number}`}
        </span>
      </div>

      <div className="hw-queue-card-sub">
        <span>{item.resource_title}</span>
        <em>turned in {relativeTime(item.submitted_at)}</em>
      </div>

      <div className="hw-queue-submission">
        {item.submission_type === "link" && item.url ? (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="hw-review-link">
            🔗 {item.url}
          </a>
        ) : item.submission_type === "file" && item.storage_path ? (
          isImage ? (
            fileUrl ? (
              <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                <img src={fileUrl} alt="Submission preview" className="hw-queue-preview" />
              </a>
            ) : (
              <p className="hw-hint">{fileLoading ? "Loading preview…" : "Preview unavailable"}</p>
            )
          ) : (
            <button className="hw-queue-file-btn" onClick={onOpenFile} disabled={fileLoading}>
              📎 {fileLoading ? "Opening…" : item.storage_path.split("/").pop()}
            </button>
          )
        ) : null}
      </div>

      <textarea
        className="hw-review-textarea"
        rows={3}
        placeholder="Feedback (optional)…"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        disabled={busy}
      />

      {error && <p className="hw-review-error">{error}</p>}

      <div className="hw-queue-actions">
        <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={onSkip} disabled={busy}>
          Skip
        </button>
        <button className="admin-btn admin-btn-navy admin-btn-sm" onClick={onReturn} disabled={busy}>
          {busy ? "Returning…" : "Return"}
        </button>
      </div>
    </div>
  );
}