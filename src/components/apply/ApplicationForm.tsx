"use client";

import { useState } from "react";

/* ────────────────────────────────────────────────────────────
   PRICING + OPTIONS
   In Phase 2 these come from the `courses` table. For now they
   live here so there is one place to change them.
   Amounts are in naira. Paystack expects kobo (× 100) — that
   conversion happens server-side, not here.
   ──────────────────────────────────────────────────────────── */
type ProgramType = "term" | "summer";

type Program = {
  slug: string;
  label: string;
  type: ProgramType;
};

const programs: Program[] = [
  { slug: "web-development", label: "Web Development", type: "term" },
  { slug: "python", label: "Python Programming", type: "term" },
  { slug: "game-development", label: "3D Game Development", type: "term" },
  { slug: "summer", label: "Summer Tech Camp", type: "summer" },
];

type PlanKey = "monthly" | "upfront";

const plans: Record<PlanKey, { label: string; note: string; dueNow: number; total: number }> = {
  monthly: {
    label: "Monthly",
    note: "₦27,000 × 3 months",
    dueNow: 27000,
    total: 81000,
  },
  upfront: {
    label: "Pay once",
    note: "₦75,000 — save ₦6,000",
    dueNow: 75000,
    total: 75000,
  },
};

const SUMMER_PRICE = 15000;

const genderOptions = ["Male", "Female", "Prefer not to say"];
const relationshipOptions = ["Mother", "Father", "Guardian", "Other"];
const referralOptions = [
  "Instagram",
  "WhatsApp",
  "A friend or family member",
  "My child's school",
  "Google search",
  "Other",
];

/* ── helpers ─────────────────────────────────────────────── */

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

function ageFrom(dob: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

type Fields = {
  studentName: string;
  dob: string;
  gender: string;
  school: string;
  parentName: string;
  relationship: string;
  email: string;
  phone: string;
  program: string;
  plan: PlanKey | "";
  referral: string;
  notes: string;
  consent: boolean;
};

const empty: Fields = {
  studentName: "",
  dob: "",
  gender: "",
  school: "",
  parentName: "",
  relationship: "",
  email: "",
  phone: "",
  program: "",
  plan: "",
  referral: "",
  notes: "",
  consent: false,
};

type Errors = Partial<Record<keyof Fields, string>>;

export default function ApplicationForm() {
  const [f, setF] = useState<Fields>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const selected = programs.find((p) => p.slug === f.program);
  const isTerm = selected?.type === "term";
  const isSummer = selected?.type === "summer";

  const dueNow = isSummer
    ? SUMMER_PRICE
    : isTerm && f.plan
      ? plans[f.plan].dueNow
      : null;

  function set<K extends keyof Fields>(key: K, value: Fields[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): Errors {
    const e: Errors = {};

    if (!f.studentName.trim()) e.studentName = "Enter the student's name";

    const age = ageFrom(f.dob);
    if (!f.dob) e.dob = "Enter a date of birth";
    else if (age === null) e.dob = "That date isn't valid";
    else if (age < 10 || age > 16) e.dob = "KIT is for ages 10–16";

    if (!f.gender) e.gender = "Select an option";
    if (!f.parentName.trim()) e.parentName = "Enter your name";
    if (!f.relationship) e.relationship = "Select an option";

    if (!f.email.trim()) e.email = "Enter an email address";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()))
      e.email = "That email doesn't look right";

    const digits = f.phone.replace(/\D/g, "");
    if (!digits) e.phone = "Enter a phone number";
    else if (digits.length !== 10) e.phone = "Enter 10 digits after +234";

    if (!f.program) e.program = "Choose a program";
    if (isTerm && !f.plan) e.plan = "Choose a payment plan";
    if (!f.referral) e.referral = "Select an option";
    if (!f.consent) e.consent = "Please confirm before submitting";

    return e;
  }

  async function onSubmit() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      document
        .querySelector(".field-error")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    try {
      /* Next step: a Server Action that
         1. inserts into `applications` with status 'pending_payment'
         2. initializes a Paystack transaction for `dueNow`
         3. returns the checkout URL to redirect to
         The webhook is what marks the row paid — not the redirect. */
      console.log("Application payload", { ...f, dueNow });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="af">
      <h2>Student Application Form</h2>
      <p className="af-sub">Please fill in the details below to get started.</p>

      {/* 1 ───────────────────────────────────────────── */}
      <h3 className="af-legend">1. Student Information</h3>
      <div className="af-row">
        <label className="af-field">
          <span>Full Name</span>
          <input
            type="text"
            placeholder="Nathan Okoye"
            value={f.studentName}
            onChange={(ev) => set("studentName", ev.target.value)}
          />
          {errors.studentName && <em className="field-error">{errors.studentName}</em>}
        </label>

        <label className="af-field">
          <span>Date of Birth</span>
          <input
            type="date"
            value={f.dob}
            onChange={(ev) => set("dob", ev.target.value)}
          />
          {errors.dob && <em className="field-error">{errors.dob}</em>}
        </label>
      </div>

      <div className="af-row">
        <label className="af-field">
          <span>Gender</span>
          <select value={f.gender} onChange={(ev) => set("gender", ev.target.value)}>
            <option value="">Select gender</option>
            {genderOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          {errors.gender && <em className="field-error">{errors.gender}</em>}
        </label>

        <label className="af-field">
          <span>School (Optional)</span>
          <input
            type="text"
            placeholder="BlueBell International"
            value={f.school}
            onChange={(ev) => set("school", ev.target.value)}
          />
        </label>
      </div>

      {/* 2 ───────────────────────────────────────────── */}
      <h3 className="af-legend">2. Parent / Guardian Information</h3>
      <div className="af-row">
        <label className="af-field">
          <span>Full Name</span>
          <input
            type="text"
            placeholder="Mrs. Onyema Okoye"
            value={f.parentName}
            onChange={(ev) => set("parentName", ev.target.value)}
          />
          {errors.parentName && <em className="field-error">{errors.parentName}</em>}
        </label>

        <label className="af-field">
          <span>Relationship</span>
          <select
            value={f.relationship}
            onChange={(ev) => set("relationship", ev.target.value)}
          >
            <option value="">Select relationship</option>
            {relationshipOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          {errors.relationship && <em className="field-error">{errors.relationship}</em>}
        </label>
      </div>

      <div className="af-row">
        <label className="af-field">
          <span>Email Address</span>
          <input
            type="email"
            placeholder="example@gmail.com"
            value={f.email}
            onChange={(ev) => set("email", ev.target.value)}
          />
          <em className="af-hint">Login details are sent here once approved.</em>
          {errors.email && <em className="field-error">{errors.email}</em>}
        </label>

        <label className="af-field">
          <span>Phone Number</span>
          <div className="af-phone">
            <span className="af-phone-pre">🇳🇬 +234</span>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="706 577 2394"
              value={f.phone}
              onChange={(ev) => set("phone", ev.target.value)}
            />
          </div>
          {errors.phone && <em className="field-error">{errors.phone}</em>}
        </label>
      </div>

      {/* 3 ───────────────────────────────────────────── */}
      <h3 className="af-legend">3. Program Interest</h3>
      <div className="af-row">
        <label className="af-field">
          <span>Select Program</span>
          <select
            value={f.program}
            onChange={(ev) => {
              set("program", ev.target.value);
              set("plan", "");
            }}
          >
            <option value="">Choose a program</option>
            {programs.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.label}
              </option>
            ))}
          </select>
          {errors.program && <em className="field-error">{errors.program}</em>}
        </label>

        <label className="af-field">
          <span>How did you hear about KIT?</span>
          <select value={f.referral} onChange={(ev) => set("referral", ev.target.value)}>
            <option value="">Select an option</option>
            {referralOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          {errors.referral && <em className="field-error">{errors.referral}</em>}
        </label>
      </div>

      {isTerm && (
        <div className="af-plans">
          <span className="af-plans-label">Payment Plan</span>
          <div className="af-plan-grid">
            {(Object.keys(plans) as PlanKey[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`af-plan ${f.plan === key ? "on" : ""}`}
                onClick={() => set("plan", key)}
                aria-pressed={f.plan === key}
              >
                <span className="af-plan-name">{plans[key].label}</span>
                <span className="af-plan-note">{plans[key].note}</span>
              </button>
            ))}
          </div>
          {errors.plan && <em className="field-error">{errors.plan}</em>}
        </div>
      )}

      {/* 4 ───────────────────────────────────────────── */}
      <h3 className="af-legend">4. Additional Information</h3>
      <label className="af-field">
        <span>Tell us about your child (optional)</span>
        <textarea
          rows={3}
          placeholder="Interests, hobbies, or anything we should know…"
          value={f.notes}
          onChange={(ev) => set("notes", ev.target.value)}
        />
      </label>

      {dueNow !== null && (
        <div className="af-total">
          <span>Due today</span>
          <strong>{naira(dueNow)}</strong>
          {isTerm && f.plan === "monthly" && (
            <em>Months 2 and 3 invoiced separately — {naira(plans.monthly.total)} total</em>
          )}
        </div>
      )}

      <label className="af-consent">
        <input
          type="checkbox"
          checked={f.consent}
          onChange={(ev) => set("consent", ev.target.checked)}
        />
        <span>I confirm that the information provided is accurate.</span>
      </label>
      {errors.consent && <em className="field-error">{errors.consent}</em>}

      <button
        type="button"
        className="af-submit"
        onClick={onSubmit}
        disabled={submitting}
      >
        {submitting ? "Redirecting to payment…" : "Submit Application"}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  );
}
