"use client";

import { useState } from "react";
import { submitApplication, type PlanKey } from "@/app/(marketing)/apply/actions";
import type { CourseRow } from "@/lib/courses";
import Reveal from "@/components/site/Reveal";
import { COUNTRY_CODES } from "@/lib/countries";
import { regionFor, currencyFor } from "@/lib/pricing";

/* ────────────────────────────────────────────────────────────
   Courses come from the database (the `courses` table) via the
   `courses` prop, fetched server-side and passed down by the apply
   page. Prices are read straight off each course row, pre-converted
   by the public_courses view (price_naira / price_gbp) — so there's
   no kobo or pence math in this file.

   Region (and therefore currency) is derived from the COUNTRY the
   parent selects, not from parsing their phone number. Dial codes are
   ambiguous: +7 is both Russia and Kazakhstan, +39 is both Italy and
   Vatican City. The dropdown value is unambiguous.

   Prices update reactively — change country or course in either order
   and the displayed amount follows immediately.
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
  countryCode: string; // ISO 3166-1 alpha-2, e.g. "NG", "GB"
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
  countryCode: "NG", // Nigeria — still the primary market, a default not a forced value
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

  const region = regionFor(f.countryCode);
  const currency = currencyFor(region);
  const isEurope = region === "EU";

  const dialFor = (code: string) =>
    COUNTRY_CODES.find((c) => c.code === code)?.dial ?? "+234";

  const priceOnce = isEurope
    ? selected?.price_gbp ?? null
    : selected?.price_naira ?? null;
  const priceMonthly = isEurope
    ? selected?.price_monthly_gbp ?? null
    : selected?.price_monthly_naira ?? null;

  const dueNow = isSummer
    ? priceOnce
    : isTerm && f.plan
      ? f.plan === "monthly"
        ? priceMonthly
        : priceOnce
      : null;

  // Major-unit values straight from the view — no kobo/pence math here.
  const money = (n: number) =>
    currency === "GBP"
      ? `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `₦${n.toLocaleString("en-NG")}`;

  // A course with no GBP price simply isn't sold in Europe.
  const unavailableInRegion = !!selected && isEurope && priceOnce === null;

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
    // NOTE: 10–15 matches the term programme's advertised range. The DB
    // trigger on `applications` is the actual source of truth; this is a
    // client-side pre-filter only.
    else if (age < 10 || age > 15) e.dob = "KIT is for ages 10–15";

    if (!f.gender) e.gender = "Select an option";
    if (!f.parentName.trim()) e.parentName = "Enter your name";
    if (!f.relationship) e.relationship = "Select an option";

    if (!f.email.trim()) e.email = "Enter an email address";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()))
      e.email = "That email doesn't look right";

    // Generic international check, not a Nigeria-specific digit count —
    // national number lengths vary too much to validate precisely
    // without a much heavier library than this form needs.
    const digits = f.phone.replace(/\D/g, "");
    if (!digits) e.phone = "Enter a phone number";
    else if (digits.length < 4 || digits.length > 14)
      e.phone = "Enter a valid phone number";

    if (!f.program) e.program = "Choose a program";
    else if (unavailableInRegion) e.program = "Not available in your country yet";

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
        phone: `${dialFor(f.countryCode)}${f.phone.replace(/\D/g, "")}`,
        countryCode: f.countryCode,
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

      // No checkout URL: either the parent will be contacted directly
      // (European applicants, until Stripe is wired) or Paystack init
      // didn't return one. Either way the application IS saved.
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Reveal as="div" className="af af-success">
        <h2>Application received</h2>
        <p className="af-sub">
          Thanks — we&apos;ve got {f.studentName || "your child"}&apos;s application
          for {selected?.title ?? "the program"}. We&apos;ll be in touch about payment
          and next steps shortly.
        </p>
      </Reveal>
    );
  }

  return (
    <Reveal as="div" className="af">
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
            <select
              className="af-phone-select"
              value={f.countryCode}
              onChange={(ev) => set("countryCode", ev.target.value)}
              aria-label="Country"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name} ({c.dial})
                </option>
              ))}
            </select>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="706 577 2394"
              value={f.phone}
              onChange={(ev) => set("phone", ev.target.value)}
            />
          </div>
          <em className="af-hint">
            Your country sets the currency you&apos;ll be charged in.
          </em>
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

      {unavailableInRegion && (
        <p className="af-submit-error">
          {selected?.title} isn&apos;t open to applicants outside Nigeria yet.
          Please contact us and we&apos;ll help.
        </p>
      )}

      {isTerm && selected && !unavailableInRegion && (
        <div className="af-plans">
          <span className="af-plans-label">Payment Plan</span>
          <div className="af-plan-grid">
            {(["monthly", "upfront"] as PlanKey[])
              .filter((key) => key !== "monthly" || priceMonthly !== null)
              .map((key) => {
                const isMonthly = key === "monthly";
                const due = isMonthly ? priceMonthly! : priceOnce!;
                const monthlyTotal = (priceMonthly ?? 0) * 3;
                const savings = monthlyTotal - (priceOnce ?? 0);

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
                        ? `${money(due)} × 3 months`
                        : savings > 0
                          ? `${money(due)} — save ${money(savings)}`
                          : money(due)}
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
          <strong>{money(dueNow)}</strong>
          {isTerm && f.plan === "monthly" && priceMonthly !== null && (
            <em>
              Months 2 and 3 invoiced separately — {money(priceMonthly * 3)} total
            </em>
          )}
          {isEurope && <em>Charged in GBP.</em>}
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
    </Reveal>
  );
}