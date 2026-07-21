"use client";

import { useState } from "react";
import {
  approveApplication,
  enrolSummerStudent,
  markApplicationPaid,
  rejectApplication,
} from "./actions";

export type QueueItem = {
  id: string;
  student_name: string;
  age_at_application: number;
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  course_title: string;
  course_slug: string;
  plan: string | null;
  amount_due_naira: number;
  amount_total_naira: number;
  payment_status: string;
  payment_ref: string | null;
  status: string;
  source: string;
  created_at: string;
  approvable: boolean;
  needs_payment_check: boolean;
};

export type BatchOption = {
  id: string;
  cohort_label: string;
  course_slug: string;
  capacity: number;
  status: string;
  seats_used: number;
};

const naira = (n: number) => `₦${Number(n).toLocaleString("en-NG")}`;

export default function ApplicationRow({
  application: a,
  batches,
  isSummer,
}: {
  application: QueueItem;
  batches: BatchOption[];
  isSummer: boolean;
}) {
  const [batchId, setBatchId] = useState("");
  const [reason, setReason] = useState("");
  const [payNote, setPayNote] = useState("");
  const [mode, setMode] = useState<"idle" | "reject" | "pay">("idle");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eligible = batches.filter(
    (b) =>
      b.course_slug === a.course_slug &&
      b.status !== "completed" &&
      b.status !== "cancelled" &&
      b.capacity - b.seats_used > 0
  );

  async function run<T>(fn: () => Promise<T>, onOk: (r: T) => string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fn();
      const r = res as { ok: boolean; error?: string };
      if (!r.ok) setError(r.error ?? "Something went wrong.");
      else setDone(onOk(res));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="admin-app">
      <div className="admin-app-top">
        <div className="admin-app-who">
          <div className="admin-app-name">
            <h3>{a.student_name}</h3>
            <span className="admin-app-age">age {a.age_at_application}</span>
            <span className={`admin-pill stat-${a.status}`}>{a.status}</span>
          </div>

          <p className="admin-app-course">
            {a.course_title}
            {a.plan && ` · ${a.plan}`}
          </p>

          <div className="admin-app-contact">
            <span>{a.parent_name}</span>
            <span>{a.parent_email}</span>
            <span>{a.parent_phone}</span>
          </div>
        </div>

        <div className="admin-app-money">
          <span className="admin-app-amount">{naira(a.amount_due_naira)}</span>
          {a.amount_total_naira !== a.amount_due_naira && (
            <span className="admin-app-total">
              of {naira(a.amount_total_naira)} total
            </span>
          )}
          <span className={`admin-pill pay-${a.payment_status}`}>
            {a.payment_status === "paid" ? "Paid" : "Awaiting payment"}
          </span>
          <span className="admin-app-total">
            {new Date(a.created_at).toLocaleDateString("en-NG", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {a.needs_payment_check && !done && (
        <p className="admin-app-note">
          Payment hasn&apos;t been confirmed, so this can&apos;t be approved yet.
          Check the Paystack dashboard
          {a.payment_ref && (
            <>
              {" "}
              for reference <code>{a.payment_ref}</code>
            </>
          )}
          , or record a bank transfer below.
        </p>
      )}

      {done && <div className="admin-app-result">{done}</div>}
      {error && <div className="admin-app-result bad">{error}</div>}

      {!done && a.status === "pending" && (
        <div className="admin-app-actions">
          {/* ── Payment not yet recorded ───────────────────── */}
          {!a.approvable && mode !== "reject" && (
            <>
              {mode === "pay" ? (
                <>
                  <div className="admin-reject-row">
                    <input
                      placeholder="Reference or note (e.g. GTB transfer 21 Jul)"
                      value={payNote}
                      onChange={(e) => setPayNote(e.target.value)}
                    />
                  </div>
                  <button
                    className="admin-btn admin-btn-primary"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => markApplicationPaid(a.id, payNote),
                        () => "Payment recorded. You can approve this now."
                      )
                    }
                  >
                    {busy ? "Recording…" : "Confirm payment"}
                  </button>
                  <button className="admin-btn admin-btn-ghost" onClick={() => setMode("idle")}>
                    Cancel
                  </button>
                </>
              ) : (
                <button className="admin-btn admin-btn-navy" onClick={() => setMode("pay")}>
                  Record payment manually
                </button>
              )}
            </>
          )}

          {/* ── Summer: no batch needed ────────────────────── */}
          {a.approvable && isSummer && mode !== "reject" && (
            <button
              className="admin-btn admin-btn-primary"
              disabled={busy}
              onClick={() =>
                run(enrolSummerStudent.bind(null, a.id), (r) => {
                  const res = r as { ok: true; summerId: string; name: string };
                  return `Enrolled. ${res.name}'s Summer ID is ${res.summerId} — this is their login credential, send it to the parent.`;
                })
              }
            >
              {busy ? "Enrolling…" : "Enrol in summer camp"}
            </button>
          )}

          {/* ── 12-week: batch required ────────────────────── */}
          {a.approvable && !isSummer && mode !== "reject" && (
            <>
              <select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
                <option value="">Assign to a batch…</option>
                {eligible.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.cohort_label} — {b.capacity - b.seats_used} seat
                    {b.capacity - b.seats_used === 1 ? "" : "s"} left
                  </option>
                ))}
              </select>

              {eligible.length === 0 && (
                <span className="admin-warn-inline">
                  No batch with space for {a.course_title}. Create one first.
                </span>
              )}

              <button
                className="admin-btn admin-btn-primary"
                disabled={busy || !batchId}
                onClick={() =>
                  run(approveApplication.bind(null, a.id, batchId), (r) => {
                    const res = r as {
                      ok: true;
                      kitId: string;
                      batchLabel: string;
                      emailSent: boolean;
                    };
                    return res.emailSent
                      ? `Approved. KIT ID ${res.kitId} in ${res.batchLabel}. Login email sent.`
                      : `Approved. KIT ID ${res.kitId} in ${res.batchLabel}. Login email NOT sent — no mail service configured yet, so send details manually or retry from Students.`;
                  })
                }
              >
                {busy ? "Approving…" : "Approve"}
              </button>
            </>
          )}

          {/* ── Reject ────────────────────────────────────── */}
          {mode === "reject" ? (
            <>
              <div className="admin-reject-row">
                <input
                  placeholder="Reason — recorded in the audit log"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  autoFocus
                />
              </div>
              <button
                className="admin-btn admin-btn-danger"
                disabled={busy}
                onClick={() =>
                  run(rejectApplication.bind(null, a.id, reason), (r) => {
                    const res = r as { ok: true; refundDue: boolean; refundNaira: number };
                    return res.refundDue
                      ? `Rejected. A refund of ${naira(res.refundNaira)} is owed — issue it manually in Paystack. Nothing here does that automatically.`
                      : "Rejected. No payment was taken, so no refund is owed.";
                  })
                }
              >
                {busy ? "Rejecting…" : "Confirm rejection"}
              </button>
              <button className="admin-btn admin-btn-ghost" onClick={() => setMode("idle")}>
                Cancel
              </button>
            </>
          ) : (
            <button
              className="admin-btn admin-btn-ghost"
              style={{ marginLeft: "auto" }}
              onClick={() => setMode("reject")}
            >
              Reject
            </button>
          )}
        </div>
      )}
    </article>
  );
}
