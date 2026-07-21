"use client";

import { useState } from "react";
import ApplicationRow, { type BatchOption, type QueueItem } from "./ApplicationRow";

type Tab = "pending" | "approved" | "rejected";

export default function ApplicationsView({
  pending,
  decided,
  batches,
  summerSlugs,
}: {
  pending: QueueItem[];
  decided: QueueItem[];
  batches: BatchOption[];
  summerSlugs: string[];
}) {
  const [tab, setTab] = useState<Tab>("pending");

  const approved = decided.filter((d) => d.status === "approved");
  const rejected = decided.filter((d) => d.status === "rejected");

  const shown = tab === "pending" ? pending : tab === "approved" ? approved : rejected;

  const awaitingPayment = pending.filter((p) => p.needs_payment_check).length;
  const readyToApprove = pending.filter((p) => p.approvable).length;

  return (
    <>
      <header className="admin-head">
        <div>
          <h1>Applications</h1>
          <p>
            {pending.length === 0
              ? "Nothing waiting for review."
              : `${pending.length} pending · ${readyToApprove} ready to approve · ${awaitingPayment} awaiting payment`}
          </p>
        </div>
      </header>

      <div className="admin-tabs">
        <button
          className={`admin-tab ${tab === "pending" ? "on" : ""}`}
          onClick={() => setTab("pending")}
        >
          Pending {pending.length > 0 && `(${pending.length})`}
        </button>
        <button
          className={`admin-tab ${tab === "approved" ? "on" : ""}`}
          onClick={() => setTab("approved")}
        >
          Approved {approved.length > 0 && `(${approved.length})`}
        </button>
        <button
          className={`admin-tab ${tab === "rejected" ? "on" : ""}`}
          onClick={() => setTab("rejected")}
        >
          Rejected {rejected.length > 0 && `(${rejected.length})`}
        </button>
      </div>

      {shown.length === 0 ? (
        <div className="admin-card">
          <div className="admin-empty">
            <p>
              {tab === "pending"
                ? "No applications waiting."
                : `No ${tab} applications.`}
            </p>
            {tab === "pending" && <em>The form is live at /apply.</em>}
          </div>
        </div>
      ) : (
        <div className="admin-queue">
          {shown.map((a) => (
            <ApplicationRow
              key={a.id}
              application={a}
              batches={batches}
              isSummer={summerSlugs.includes(a.course_slug)}
            />
          ))}
        </div>
      )}
    </>
  );
}
