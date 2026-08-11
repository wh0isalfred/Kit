"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getSummerFileUrl,
  turnInHomework,
  unsubmitHomework,
  uploadSubmissionFile,
} from "../../../summer/summer-session";

export type HomeworkItem = {
  id: string;
  week: number;
  title: string;
  description: string | null;
  submission_type: "link" | "file" | null;
  // The assignment's OWN attachment (instructions/starter), distinct
  // from the student's submission.
  url: string | null;
  storage_path: string | null;
};

export type MySubmission = {
  status: "turned_in" | "returned";
  url: string | null;
  storage_path: string | null;
  submitted_at: string | null;
  feedback: string | null;
  returned_at: string | null;
} | null;

export default function HomeworkDetail({
  item,
  submission,
}: {
  item: HomeworkItem;
  submission: MySubmission;
}) {
  const router = useRouter();

  const [linkValue, setLinkValue] = useState(submission?.url ?? "");
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTurnedIn = submission?.status === "turned_in";
  const isReturned = submission?.status === "returned";

  async function openAttachment(path: string) {
    const res = await getSummerFileUrl(path);
    if (res.ok) window.open(res.url, "_blank", "noopener,noreferrer");
    else setError(res.error);
  }

  async function onUpload(file: File) {
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("resourceId", item.id);
    const res = await uploadSubmissionFile(fd);
    setUploading(false);
    if (res.ok) {
      setPendingPath(res.path);
      setPendingName(res.name);
    } else {
      setError(res.error);
    }
  }

  async function onTurnIn() {
    setBusy(true);
    setError(null);
    const res = await turnInHomework({
      resourceId: item.id,
      url: item.submission_type === "link" ? linkValue : undefined,
      storagePath: item.submission_type === "file" ? pendingPath ?? undefined : undefined,
    });
    setBusy(false);
    if (res.ok) {
      setPendingPath(null);
      setPendingName(null);
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  async function onUnsubmit() {
    setBusy(true);
    setError(null);
    const res = await unsubmitHomework(item.id);
    setBusy(false);
    if (res.ok) router.refresh();
    else setError(res.error);
  }

  return (
    <div className="hw">
      <a href="/smportal/homework" className="smp-home" aria-label="Back to homework">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Homework
      </a>

      <div className="hw-grid">
        {/* Instructions */}
        <div className="hw-main">
          <span className="hw-week">Week {item.week}</span>
          <h1>{item.title}</h1>
          {item.description && <p className="hw-desc">{item.description}</p>}

          {(item.url || item.storage_path) && (
            <div className="hw-attachment">
              <div className="hw-attachment-label">Attached</div>
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="hw-attachment-item">
                  <AttachIcon /> Open instructions link
                </a>
              )}
              {item.storage_path && (
                <button className="hw-attachment-item" onClick={() => openAttachment(item.storage_path!)}>
                  <AttachIcon /> Open attached file
                </button>
              )}
            </div>
          )}
        </div>

        {/* Your work panel */}
        <aside className="hw-work">
          <div className="hw-work-head">
            <h2>Your work</h2>
            <span className={`hw-status hw-status-${submission?.status ?? "assigned"}`}>
              {isReturned ? "Returned" : isTurnedIn ? "Turned in" : "Assigned"}
            </span>
          </div>

          {item.submission_type === null ? (
            <p className="hw-none">This task doesn&apos;t need anything turned in.</p>
          ) : isReturned ? (
            // Returned: read-only, shows feedback. Resubmitting is
            // possible but that discards the feedback, so it's a
            // deliberate second action, not the default.
            <>
              <SubmittedView submission={submission!} openAttachment={openAttachment} />
              {submission?.feedback && (
                <div className="hw-feedback">
                  <div className="hw-feedback-label">Teacher feedback</div>
                  <p>{submission.feedback}</p>
                </div>
              )}
            </>
          ) : isTurnedIn ? (
            <>
              <SubmittedView submission={submission!} openAttachment={openAttachment} />
              <button className="hw-unsubmit" disabled={busy} onClick={onUnsubmit}>
                {busy ? "…" : "Unsubmit"}
              </button>
              {error && <p className="hw-error">{error}</p>}
            </>
          ) : (
            // Assigned — the submission form
            <>
              {item.submission_type === "link" && (
                <input
                  className="hw-link-input"
                  type="url"
                  placeholder="Paste your link (e.g. your live site)"
                  value={linkValue}
                  onChange={(e) => setLinkValue(e.target.value)}
                  disabled={busy}
                />
              )}

              {item.submission_type === "file" && (
                <div>
                  {pendingName ? (
                    <div className="hw-file-chip">
                      <span>📎 {pendingName}</span>
                      <button onClick={() => { setPendingPath(null); setPendingName(null); }}>Remove</button>
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
                  {uploading && <p className="hw-hint">Uploading…</p>}
                </div>
              )}

              <button
                className="hw-turnin"
                disabled={
                  busy ||
                  uploading ||
                  (item.submission_type === "link" && !linkValue.trim()) ||
                  (item.submission_type === "file" && !pendingPath)
                }
                onClick={onTurnIn}
              >
                {busy ? "Turning in…" : "Turn in"}
              </button>
            </>
          )}

          {error && <p className="hw-error">{error}</p>}
        </aside>
      </div>
    </div>
  );
}

function SubmittedView({
  submission,
  openAttachment,
}: {
  submission: NonNullable<MySubmission>;
  openAttachment: (path: string) => void;
}) {
  return (
    <div className="hw-submitted">
      {submission.url && (
        <a href={submission.url} target="_blank" rel="noopener noreferrer" className="hw-submitted-item">
          <AttachIcon /> {submission.url}
        </a>
      )}
      {submission.storage_path && (
        <button className="hw-submitted-item" onClick={() => openAttachment(submission.storage_path!)}>
          <AttachIcon /> {submission.storage_path.split("/").pop()}
        </button>
      )}
      {submission.submitted_at && (
        <p className="hw-hint">
          Turned in{" "}
          {new Date(submission.submitted_at).toLocaleString("en-NG", {
            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}

function AttachIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.19-9.19a3.5 3.5 0 014.95 4.95l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
    </svg>
  );
}
