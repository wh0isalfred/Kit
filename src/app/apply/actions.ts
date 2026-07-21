"use server";

import { createClient } from "@/lib/supabase/server";

export type PlanKey = "monthly" | "upfront";

export type ApplicationInput = {
  studentName: string;
  dob: string; // yyyy-mm-dd, from the <input type="date">
  gender: string;
  school: string;
  parentName: string;
  relationship: string;
  email: string;
  phone: string; // full number, e.g. "+2347065772394"
  courseSlug: string;
  plan: PlanKey | null; // null for summer, which has no plan
  referral: string;
  notes: string;
  consent: boolean;
};

export type ApplicationResult =
  | { ok: true; applicationId: string; checkoutUrl: string | null }
  | { ok: false; error: string };

/**
 * Validate -> insert `applications` -> (once Paystack keys exist)
 * initialise a transaction -> return a checkout URL.
 *
 * Nothing here is trusted from the client except as a starting
 * point: the course and its price are re-fetched server-side, and
 * the DB's own insert trigger re-validates age eligibility and
 * recomputes the charge independently. This function can be wrong
 * and the database still won't accept a tampered application — see
 * Doc 2 §6.1 for why that layering matters.
 */
export async function submitApplication(
  input: ApplicationInput
): Promise<ApplicationResult> {
  const supabase = await createClient();

  if (!input.consent) {
    return { ok: false, error: "Consent is required to submit an application." };
  }

  const age = ageFromDob(input.dob);
  if (age === null) {
    return { ok: false, error: "That date of birth doesn't look right." };
  }
  // Coarse pre-filter only — 10/16 is the widest anything on the site
  // should ever accept. The course-specific bound is enforced by the
  // DB trigger below, which is the actual source of truth.
  if (age < 10 || age > 16) {
    return { ok: false, error: "KIT doesn't currently have a track for that age." };
  }

  // Look up the course server-side. Never trust a client-sent price
  // or a client-sent "this course is open" assumption.
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("slug, code, type, status, price_kobo, price_monthly_kobo")
    .eq("slug", input.courseSlug)
    .single();

  if (courseError || !course || course.status !== "live") {
    return { ok: false, error: "That program isn't open for applications right now." };
  }

  const isSummer = course.type === "summer";

  const amountDueKobo = isSummer
    ? course.price_kobo
    : input.plan === "monthly"
      ? course.price_monthly_kobo
      : course.price_kobo;

  const amountTotalKobo = isSummer
    ? course.price_kobo
    : input.plan === "monthly"
      ? (course.price_monthly_kobo ?? 0) * 3
      : course.price_kobo;

  if (!amountDueKobo) {
    return { ok: false, error: "That payment plan isn't available for this program." };
  }

  const { data: application, error: insertError } = await supabase
    .from("applications")
    .insert({
      student_name: input.studentName,
      student_dob: input.dob,
      student_gender: input.gender || null,
      student_school: input.school || null,
      parent_name: input.parentName,
      parent_email: input.email,
      parent_phone: input.phone,
      parent_relationship: input.relationship || null,
      course_slug: input.courseSlug,
      plan: isSummer ? null : input.plan,
      amount_due_kobo: amountDueKobo,
      amount_total_kobo: amountTotalKobo,
      referral_source: input.referral || null,
      notes: input.notes || null,
      consent_given: input.consent,
      consent_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !application) {
    // Most likely candidates: the age-eligibility trigger or the
    // amount-tamper trigger firing (Doc 2 §4.1). Postgres error
    // messages aren't reliably parseable for exact cause, so this
    // gives a generic-but-honest message rather than guessing wrong.
    console.error("submitApplication insert:", insertError?.message);
    return {
      ok: false,
      error:
        "We couldn't submit that application. Double-check the date of birth and program, then try again — or contact us if it keeps happening.",
    };
  }

  // Payment isn't wired up yet — no Paystack keys configured. The
  // application is saved regardless; this just decides whether we
  // can send the parent straight to checkout.
  const checkoutUrl = process.env.PAYSTACK_SECRET_KEY
    ? await initializePaystackTransaction({
        applicationId: application.id,
        email: input.email,
        amountKobo: amountDueKobo,
      })
    : null;

  return { ok: true, applicationId: application.id, checkoutUrl };
}

function ageFromDob(dob: string): number | null {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

/**
 * TODO: implement once PAYSTACK_SECRET_KEY is set in the environment.
 *
 * Initialise a Paystack transaction for amountKobo, tagging
 * applicationId in the transaction metadata so the webhook
 * (/api/paystack/webhook, not yet built) can find this row again on
 * the way back. Return `authorization_url` for the redirect.
 *
 * Never mark the application paid here or in the redirect handler —
 * only the verified webhook does that. See Doc 2 §6.2.
 */
async function initializePaystackTransaction(_args: {
  applicationId: string;
  email: string;
  amountKobo: number;
}): Promise<string | null> {
  return null;
}
