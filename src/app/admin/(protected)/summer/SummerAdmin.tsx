"use client";

import { useState } from "react";
import { saveCohort, saveWeek, setActiveCohort } from "./actions";

export type Cohort = {
  year: number;
  label: string;
  current_week: number;
  starts_on: string | null;
  ends_on: string | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  active: boolean;
  prize_kobo: number | null;
};

export type Week = {
  cohort_year: number;
  week: number;
  published: boolean;
  class_title: string | null;
  class_note: string | null;
  meet_link: string | null;
  next_class_at: string | null;
  updated_at: string | null;
};

/* <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" with no
   zone. Postgres hands back a full ISO timestamptz. These two
   convert between the shapes without pulling in a date library. */
const toLocalInput = (iso: string | null) =>
  iso ? new Date(iso).toISOString().slice(0, 16) : "";
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

export default function SummerAdmin({
  cohorts,
  weeks,
  rosterCount,
}: {
  cohorts: Cohort[];
  weeks: Week[];
  rosterCount: number;
}) {
  const active = cohorts.find((c) => c.active) ?? cohorts[0];

  if (!active) {
    return (
      <p className="admin-warn">
        No summer cohort exists yet. One row must be inserted into{" "}
        <code>summer_cohorts</code> before this screen can do anything.
      </p>
    );
  }

  return (
    <>
      <CohortForm cohort={active} rosterCount={rosterCount} />

      {cohorts.length > 1 && (
        <section className="admin-section">
          <h2>Other cohorts</h2>
          {cohorts
            .filter((c) => c.year !== active.year)
            .map((c) => (
              <InactiveCohort key={c.year} cohort={c} />
            ))}
        </section>
      )}

      <section className="admin-section">
        <h2>Weekly content — {active.label}</h2>
        <p className="admin-hint">
          An unpublished week shows &ldquo;materials coming soon&rdquo; in the
          portal rather than empty sections. Publish a week only once it has
          real content.
        </p>
        {[1, 2, 3].map((n) => (
          <WeekForm
            key={n}
            cohortYear={active.year}
            week={weeks.find((w) => w.week === n) ?? null}
            weekNumber={n}
            isCurrent={active.current_week === n}
          />
        ))}
      </section>
    </>
  );
}

function CohortForm({ cohort, rosterCount }: { cohort: Cohort; rosterCount: number }) {
  const [label, setLabel] = useState(cohort.label);
  const [currentWeek, setCurrentWeek] = useState(cohort.current_week);
  const [startsOn, setStartsOn] = useState(cohort.starts_on ?? "");
  const [endsOn, setEndsOn] = useState(cohort.ends_on ?? "");
  const [regOpens, setRegOpens] = useState(toLocalInput(cohort.registration_opens_at));
  const [regCloses, setRegCloses] = useState(toLocalInput(cohort.registration_closes_at));
  const [prize, setPrize] = useState(
    cohort.prize_kobo !== null ? String(cohort.prize_kobo / 100) : ""
  );

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSave() {
    setBusy(true); setErr(null); setMsg(null);
    const res = await saveCohort({
      year: cohort.year,
      label,
      currentWeek,
      startsOn: startsOn || null,
      endsOn: endsOn || null,
      registrationOpensAt: fromLocalInput(regOpens),
      registrationClosesAt: fromLocalInput(regCloses),
      prizeNaira: prize ? Number(prize) : null,
    });
    setBusy(false);
    if (res.ok) setMsg("Saved. The homepage will reflect this immediately.");
    else setErr(res.error);
  }

  const datesMissing = !startsOn || !endsOn || !regCloses;

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <h2>{cohort.year} cohort</h2>
        <span className="admin-pill admin-pill-on">Active</span>
        <span className="admin-hint">
          {rosterCount} student{rosterCount === 1 ? "" : "s"} on the roster
        </span>
      </div>

      {datesMissing && (
        <p className="admin-warn">
          Dates are incomplete, so the homepage countdown is hidden. Fill in the
          camp dates and registration close to turn it on.
        </p>
      )}

      <div className="af-row">
        <label className="af-field">
          <span>Cohort label</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} />
          <em className="af-hint">Shown to students in the portal.</em>
        </label>

        <label className="af-field">
          <span>Current week</span>
          <select
            value={currentWeek}
            onChange={(e) => setCurrentWeek(Number(e.target.value))}
          >
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>Week {n}</option>
            ))}
          </select>
          <em className="af-hint">
            Which week the portal shows. Controlled by hand so a slipped week
            doesn&apos;t break the portal.
          </em>
        </label>
      </div>

      <div className="af-row">
        <label className="af-field">
          <span>Camp starts</span>
          <input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
        </label>
        <label className="af-field">
          <span>Camp ends</span>
          <input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
        </label>
      </div>

      <div className="af-row">
        <label className="af-field">
          <span>Registration opens</span>
          <input
            type="datetime-local"
            value={regOpens}
            onChange={(e) => setRegOpens(e.target.value)}
          />
        </label>
        <label className="af-field">
          <span>Registration closes</span>
          <input
            type="datetime-local"
            value={regCloses}
            onChange={(e) => setRegCloses(e.target.value)}
          />
          <em className="af-hint">This drives the homepage countdown.</em>
        </label>
      </div>

      <label className="af-field">
        <span>Team prize (₦)</span>
        <input
          type="number"
          value={prize}
          onChange={(e) => setPrize(e.target.value)}
          placeholder="30000"
        />
      </label>

      {err && <p className="af-submit-error">{err}</p>}
      {msg && <p className="admin-result">{msg}</p>}

      <button className="af-submit" onClick={onSave} disabled={busy}>
        {busy ? "Saving…" : "Save cohort"}
      </button>
    </section>
  );
}

function InactiveCohort({ cohort }: { cohort: Cohort }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function activate() {
    setBusy(true); setErr(null);
    const res = await setActiveCohort(cohort.year);
    setBusy(false);
    if (!res.ok) setErr(res.error);
  }

  return (
    <div className="admin-card admin-card-slim">
      <span>{cohort.year} — {cohort.label}</span>
      <button onClick={activate} disabled={busy}>
        {busy ? "Switching…" : "Make active"}
      </button>
      {err && <p className="af-submit-error">{err}</p>}
    </div>
  );
}

function WeekForm({
  cohortYear,
  week,
  weekNumber,
  isCurrent,
}: {
  cohortYear: number;
  week: Week | null;
  weekNumber: number;
  isCurrent: boolean;
}) {
  const [open, setOpen] = useState(isCurrent);
  const [published, setPublished] = useState(week?.published ?? false);
  const [title, setTitle] = useState(week?.class_title ?? "");
  const [note, setNote] = useState(week?.class_note ?? "");
  const [meet, setMeet] = useState(week?.meet_link ?? "");
  const [nextAt, setNextAt] = useState(toLocalInput(week?.next_class_at ?? null));

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSave() {
    setBusy(true); setErr(null); setMsg(null);
    const res = await saveWeek({
      cohortYear,
      week: weekNumber,
      published,
      classTitle: title,
      classNote: note,
      meetLink: meet,
      nextClassAt: fromLocalInput(nextAt),
    });
    setBusy(false);
    if (res.ok) setMsg("Saved.");
    else setErr(res.error);
  }

  return (
    <div className="admin-card">
      <button className="admin-week-head" onClick={() => setOpen(!open)}>
        <strong>Week {weekNumber}</strong>
        {isCurrent && <span className="admin-pill admin-pill-on">Current</span>}
        <span className={`admin-pill ${published ? "admin-pill-on" : ""}`}>
          {published ? "Published" : "Draft"}
        </span>
        <span className="admin-week-title">{title || "Untitled"}</span>
      </button>

      {open && (
        <div className="admin-week-body">
          <label className="af-field">
            <span>Class title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Building your first website"
            />
          </label>

          <label className="af-field">
            <span>Note to students</span>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>

          <div className="af-row">
            <label className="af-field">
              <span>Meet link</span>
              <input
                value={meet}
                onChange={(e) => setMeet(e.target.value)}
                placeholder="https://meet.google.com/…"
              />
            </label>
            <label className="af-field">
              <span>Next class at</span>
              <input
                type="datetime-local"
                value={nextAt}
                onChange={(e) => setNextAt(e.target.value)}
              />
            </label>
          </div>

          <label className="af-consent">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            <span>Published — visible to summer students</span>
          </label>

          {err && <p className="af-submit-error">{err}</p>}
          {msg && <p className="admin-result">{msg}</p>}

          <button className="af-submit" onClick={onSave} disabled={busy}>
            {busy ? "Saving…" : `Save week ${weekNumber}`}
          </button>
        </div>
      )}
    </div>
  );
}
