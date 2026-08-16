"use client";

import { useState } from "react";
import { createTeacher, setTeacherActive, resendTeacherInvite } from "./actions";
import type { TeacherListItem } from "./actions";
import TeacherBatchPanel from "./TeacherBatchPanel";

export default function TeachersView({ teachers: initial }: { teachers: TeacherListItem[] }) {
  const [teachers, setTeachers] = useState(initial);
  const [showAdd, setShowAdd] = useState(false);
  const [openTeacherId, setOpenTeacherId] = useState<string | null>(null);

  const active = teachers.filter((t) => t.active);
  const inactive = teachers.filter((t) => !t.active);

  return (
    <>
      <header className="admin-head">
        <div>
          <h1>Teachers</h1>
          <p>
            {teachers.length === 0
              ? "No teachers yet."
              : `${active.length} active · ${inactive.length} inactive`}
          </p>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={() => setShowAdd(true)}>
          Add teacher
        </button>
      </header>

      {showAdd && (
        <AddTeacherForm
          onClose={() => setShowAdd(false)}
          onCreated={(t) => {
            setTeachers((prev) => [t, ...prev]);
            setShowAdd(false);
          }}
        />
      )}

      {teachers.length === 0 ? (
        <div className="admin-card">
          <div className="admin-empty">
            <p>No teachers yet.</p>
            <em>Add one to start assigning batches.</em>
          </div>
        </div>
      ) : (
        <div className="admin-queue">
          {teachers.map((t) => (
            <TeacherRow
              key={t.id}
              teacher={t}
              open={openTeacherId === t.id}
              onToggleOpen={() =>
                setOpenTeacherId((cur) => (cur === t.id ? null : t.id))
              }
              onActiveChange={(active) =>
                setTeachers((prev) =>
                  prev.map((x) => (x.id === t.id ? { ...x, active } : x))
                )
              }
              onBatchCountChange={(batch_count) =>
                setTeachers((prev) =>
                  prev.map((x) => (x.id === t.id ? { ...x, batch_count } : x))
                )
              }
            />
          ))}
        </div>
      )}
    </>
  );
}

function TeacherRow({
  teacher: t,
  open,
  onToggleOpen,
  onActiveChange,
  onBatchCountChange,
}: {
  teacher: TeacherListItem;
  open: boolean;
  onToggleOpen: () => void;
  onActiveChange: (active: boolean) => void;
  onBatchCountChange: (count: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function toggleActive() {
    setBusy(true);
    setError(null);
    const res = await setTeacherActive(t.id, !t.active);
    if (!res.ok) setError(res.error);
    else onActiveChange(!t.active);
    setBusy(false);
  }

  async function handleResend() {
    setBusy(true);
    setError(null);
    const res = await resendTeacherInvite(t.email);
    if (!res.ok) setError(res.error);
    else setResent(true);
    setBusy(false);
  }

  return (
    <article className="admin-app">
      <div className="admin-app-top">
        <div className="admin-app-who">
          <div className="admin-app-name">
            <h3>{t.name}</h3>
            {t.role_title && <span className="admin-app-age">{t.role_title}</span>}
            <span className={`admin-pill ${t.active ? "admin-pill-on" : ""}`}>
              {t.active ? "Active" : "Inactive"}
            </span>
            {!t.user_id && <span className="admin-pill">Invite pending</span>}
          </div>

          <div className="admin-app-contact">
            <span>{t.email}</span>
            {t.phone && <span>{t.phone}</span>}
          </div>
        </div>

        <div className="admin-app-money">
          <span className="admin-app-amount">
            {t.batch_count} {t.batch_count === 1 ? "batch" : "batches"}
          </span>
        </div>
      </div>

      {error && <div className="admin-app-result bad">{error}</div>}
      {resent && !error && (
        <div className="admin-app-result">Invite resent to {t.email}.</div>
      )}

      <div className="admin-app-actions">
        <button className="admin-btn admin-btn-navy" onClick={onToggleOpen} disabled={busy}>
          {open ? "Hide batches" : "Manage batches"}
        </button>

        {!t.user_id && (
          <button className="admin-btn admin-btn-ghost" onClick={handleResend} disabled={busy}>
            {busy ? "Sending…" : "Resend invite"}
          </button>
        )}

        <button
          className="admin-btn admin-btn-ghost"
          style={{ marginLeft: "auto" }}
          onClick={toggleActive}
          disabled={busy}
        >
          {busy ? "…" : t.active ? "Deactivate" : "Reactivate"}
        </button>
      </div>

      {open && (
        <TeacherBatchPanel teacherId={t.id} onCountChange={onBatchCountChange} />
      )}
    </article>
  );
}

function AddTeacherForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (t: TeacherListItem) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await createTeacher({ name, email, phone, roleTitle });
    setBusy(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    onCreated({
      id: res.id,
      user_id: null,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || null,
      role_title: roleTitle.trim() || null,
      active: true,
      created_at: new Date().toISOString(),
      batch_count: 0,
    });
  }

  return (
    <div className="admin-card admin-card-slim" style={{ marginBottom: 20 }}>
      <div className="admin-card-head">
        <h2>Add teacher</h2>
      </div>

      <div className="admin-res-form">
        <div className="admin-res-form" style={{ display: "grid", gap: 12 }}>
          <div className="af-field">
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </div>
          <div className="af-row">
            <div className="af-field">
              <label>Work email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@kitacademy.net"
              />
            </div>
            <div className="af-field">
              <label>Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div className="af-field">
            <label>Role title</label>
            <input
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="e.g. Lead Instructor — optional"
            />
          </div>
        </div>

        {error && <div className="admin-app-result bad">{error}</div>}

        <div className="admin-res-form-actions">
          <button className="admin-btn admin-btn-primary" onClick={submit} disabled={busy}>
            {busy ? "Sending invite…" : "Add teacher & send invite"}
          </button>
          <button className="admin-btn admin-btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
