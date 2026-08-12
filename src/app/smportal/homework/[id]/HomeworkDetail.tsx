"use client";

import { useState, useRef } from "react";
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
  const [dragOver, setDragOver] = useState(false);

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

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onUpload(f);
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

  const turnInDisabled =
    busy ||
    uploading ||
    (item.submission_type === "link" && !linkValue.trim()) ||
    (item.submission_type === "file" && !pendingPath);

  return (
    <div className="hw">
      <a href="/smportal/homework" className="smp-home" aria-label="Back to homework">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Homework
      </a>

      <div className="hw-grid">
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
            <>
              {item.submission_type === "link" && (
                <label className="hw-field-label" htmlFor="hw-link-input">
                  Your link
                  <div className="hw-link-wrap">
                    <LinkIcon />
                    <input
                      id="hw-link-input"
                      className="hw-link-input"
                      type="url"
                      placeholder="https://your-live-site.com"
                      value={linkValue}
                      onChange={(e) => setLinkValue(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                </label>
              )}

              {item.submission_type === "file" && (
                <div>
                  {pendingName ? (
                    <div className="hw-file-chip">
                      <FileIcon />
                      <span className="hw-file-chip-name">{pendingName}</span>
                      <button
                        className="hw-file-remove"
                        aria-label="Remove file"
                        onClick={() => { setPendingPath(null); setPendingName(null); }}
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  ) : uploading ? (
                    <div className="hw-dropzone hw-dropzone-uploading">
                      <span className="hw-spinner" aria-hidden="true" />
                      <span>Uploading…</span>
                    </div>
                  ) : (
                    <>
                      <label
                        className={`hw-dropzone${dragOver ? " hw-dropzone-over" : ""}`}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={onDrop}
                      >
                        <input
                          type="file"
                          className="hw-dropzone-input"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) onUpload(f);
                          }}
                        />
                        <span className="hw-dropzone-icon"><UploadIcon /></span>
                        <span className="hw-dropzone-text">
                          <span className="hw-dropzone-link">Click here to choose a file</span>, or Drag and drop your file here
                        </span>
                      </label>
                      <p className="hw-dropzone-hint">Any file type, up to 25MB</p>
                    </>
                  )}
                </div>
              )}

              <button
                className="hw-turnin"
                disabled={turnInDisabled}
                onClick={onTurnIn}
              >
                {busy ? "Turning in…" : "Turn in"}
              </button>
              {turnInDisabled && !busy && !uploading && (
                <p className="hw-turnin-hint">
                  {item.submission_type === "file"
                    ? "Choose a file above to turn in your work"
                    : "Paste a link to turn in your work"}
                </p>
              )}

              {error && <p className="hw-error">{error}</p>}
            </>
          )}
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

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4M12 4L7 9M12 4l5 5" />
      <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  );
}