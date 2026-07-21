"use client";

import { useState } from "react";
import { submitApplication, type PlanKey } from "@/app/apply/actions";
import type { CourseRow } from "@/lib/courses";

/* ────────────────────────────────────────────────────────────
   Courses now come from the database (the `courses` table) via
   the `courses` prop, fetched server-side and passed down by the
   apply page:

     import { getLiveCourses } from "@/lib/courses";
     // in the page component:
     const courses = await getLiveCourses();
     <ApplicationForm courses={courses} />

   This component assumes `courses` is ALREADY filtered to
   status === 'live' — getLiveCourses() does that. Prices are read
   straight off each course row (price_naira / price_monthly_naira,
   pre-converted by the public_courses view — see src/lib/courses.ts),
   so there's no separate pricing table and no kobo math in this file.
   ──────────────────────────────────────────────────────────── */

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
  program: string; // course slug
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

export default function ApplicationForm({ courses }: { courses: CourseRow[] }) {
  const [f, setF] = useState<Fields>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const selected = courses.find((c) => c.slug === f.program);
  const isTerm = selected?.type === "term";
  const isSummer = selected?.type === "summer";

  const dueNow = isSummer
    ? (selected?.price_naira ?? null)
    : isTerm && f.plan
      ? f.plan === "monthly"
        ? (selected?.price_monthly_naira ?? null)
        : (selected?.price_naira ?? null)
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
    // NOTE: 10–15 here matches the term programme's current
    // advertised range. Whether Summer should allow up to 16 (it has
    // no track split, so no structural reason not to) is still open
    // — see the flag in chat about whether `courses.track` or
    // separate age_min/age_max columns are the real enrollment gate.
    // Either way, the DB trigger on `applications` is the actual
    // source of truth; this is a client-side pre-filter only.
    else if (age < 10 || age > 15) e.dob = "KIT is for ages 10–15";

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
    setSubmitError(null);
    try {
      const result = await submitApplication({
        studentName: f.studentName,
        dob: f.dob,
        gender: f.gender,
        school: f.school,
        parentName: f.parentName,
        relationship: f.relationship,
        email: f.email,
        phone: `+234${f.phone.replace(/\D/g, "")}`,
        courseSlug: f.program,
        plan: isTerm ? (f.plan as PlanKey) : null,
        referral: f.referral,
        notes: f.notes,
        consent: f.consent,
      });

      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

      // Paystack isn't wired up yet — the application is saved, just
      // no checkout redirect to send them to. Swap this for the
      // redirect above once PAYSTACK_SECRET_KEY exists.
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="af af-success">
        <h2>Application received</h2>
        <p className="af-sub">
          Thanks — we&apos;ve got {f.studentName || "your child"}&apos;s application
          for {selected?.title ?? "the program"}. We&apos;ll be in touch about payment
          and next steps shortly.
        </p>
      </div>
    );
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
            {courses.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title}
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

      {isTerm && selected && (
        <div className="af-plans">
          <span className="af-plans-label">Payment Plan</span>
          <div className="af-plan-grid">
            {(["monthly", "upfront"] as PlanKey[])
              .filter((key) => key !== "monthly" || selected.price_monthly_naira)
              .map((key) => {
                const isMonthly = key === "monthly";
                const due = isMonthly
                  ? selected.price_monthly_naira!
                  : selected.price_naira;
                const monthlyTotal = (selected.price_monthly_naira ?? 0) * 3;
                const upfrontPrice = selected.price_naira;
                const savings = monthlyTotal - upfrontPrice;

                return (
                  <button
                    key={key}
                    type="button"
                    className={`af-plan ${f.plan === key ? "on" : ""}`}
                    onClick={() => set("plan", key)}
                    aria-pressed={f.plan === key}
                  >
                    <span className="af-plan-name">
                      {isMonthly ? "Monthly" : "Pay once"}
                    </span>
                    <span className="af-plan-note">
                      {isMonthly
                        ? `${naira(due)} × 3 months`
                        : savings > 0
                          ? `${naira(due)} — save ${naira(savings)}`
                          : naira(due)}
                    </span>
                  </button>
                );
              })}
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
          {isTerm && f.plan === "monthly" && selected?.price_monthly_naira && (
            <em>
              Months 2 and 3 invoiced separately —{" "}
              {naira(selected.price_monthly_naira * 3)} total
            </em>
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

      {submitError && <p className="af-submit-error">{submitError}</p>}

      <button
        type="button"
        className="af-submit"
        onClick={onSubmit}
        disabled={submitting}
      >
        {submitting ? "Submitting…" : "Submit Application"}
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
