"use client";

import { useState } from "react";
import { getTeacherResourceFileUrl } from "./actions";

type TeacherResource = {
  id: string;
  week: number;
  day_number: number | null;
  title: string;
  description: string | null;
  kind: string;
  url: string | null;
  storage_path: string | null;
  published: boolean;
  submission_type: "link" | "file" | null;
  batch_id: string | null;
  sort_order: number;
};

const KIND_ICON: Record<string, string> = {
  link: "🔗",
  video: "🎬",
  recording: "📹",
  slides: "📊",
  file: "📄",
  homework: "✏️",
  code: "💻",
};

const iconFor = (kind: string) => KIND_ICON[kind] ?? "📄";

/**
 * Mirrors BatchResourceRow's exact visual anatomy (icon, title line,
 * meta line with shared/batch-only tag, published pill) — same
 * classes, same information hierarchy, so a teacher sees the identical
 * fact set an admin does. Everything interactive (Edit, Delete, the
 * "add resource" row) is simply absent, not disabled — this is a
 * genuinely different affordance, not a read-only-styled version of
 * the write UI, per the read-only decision for this tab.
 *
 * Unpublished resources ARE shown here (unlike the student portal,
 * which hides them entirely) — a teacher needs to see draft content
 * exists and know it's not live yet, the same reason admin's own list
 * shows drafts with a dimmed treatment rather than hiding them.
 */
export default function TeacherResourceList({
  batchLabel,
  resources,
}: {
  batchLabel: string;
  resources: TeacherResource[];
}) {
  const sorted = [...resources].sort((a, b) => {
    if (a.week !== b.week) return a.week - b.week;
    const ad = a.day_number ?? 99;
    const bd = b.day_number ?? 99;
    if (ad !== bd) return ad - bd;
    return a.sort_order - b.sort_order;
  });

  if (sorted.length === 0) {
    return (
      <div className="admin-empty">
        <p>No resources visible to this batch yet.</p>
        <em>Your admin manages what shows up here.</em>
      </div>
    );
  }

  return (
    <div className="admin-res-list">
      {sorted.map((r) => (
        <TeacherResourceRow key={r.id} resource={r} batchLabel={batchLabel} />
      ))}
    </div>
  );
}

function TeacherResourceRow({
  resource: r,
  batchLabel,
}: {
  resource: TeacherResource;
  batchLabel: string;
}) {
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const isShared = r.batch_id === null;

  async function onOpenFile() {
    if (!r.storage_path) return;
    setOpening(true);
    setOpenError(null);

    const res = await getTeacherResourceFileUrl(r.storage_path);
    setOpening(false);

    if (!res.ok) {
      setOpenError(res.error);
      return;
    }

    // Open in a new tab rather than navigating away from the
    // Resources list — the signed URL's `download` option (set
    // server-side) is what actually forces a download instead of
    // inline rendering, this is just where the click lands.
    window.open(res.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className={`admin-res ${r.published ? "" : "draft"}`}>
      <span className="admin-res-icon">{iconFor(r.kind)}</span>

      <div className="admin-res-body">
        <p className="admin-res-title">
          Week {r.week}
          {r.day_number != null ? ` · Day ${r.day_number}` : " · Anytime"} — {r.title}
        </p>
        <p className="admin-res-meta">
          {r.kind}
          {r.kind === "homework" && ` · submit via ${r.submission_type ?? "not set"}`}
          {" · "}
          <span className={isShared ? "admin-res-tag-shared" : "admin-res-tag-batch"}>
            {isShared ? "Shared" : `${batchLabel} only`}
          </span>
        </p>
        {openError && <p className="af-hint" style={{ color: "#b3261e" }}>{openError}</p>}
      </div>

      <div className="admin-res-actions">
        <span className={`admin-pill ${r.published ? "admin-pill-on" : ""}`}>
          {r.published ? "Published" : "Draft"}
        </span>

        {r.url && (
          <a
            href={r.url}
            target="_blank"
            rel="noreferrer"
            className="admin-btn admin-btn-ghost admin-btn-sm"
          >
            Open
          </a>
        )}

        {!r.url && r.storage_path && (
          <button
            className="admin-btn admin-btn-ghost admin-btn-sm"
            onClick={onOpenFile}
            disabled={opening}
          >
            {opening ? "Opening…" : "Open"}
          </button>
        )}
      </div>
    </div>
  );
}
