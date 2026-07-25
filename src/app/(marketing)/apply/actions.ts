"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { initializeTransaction } from "@/lib/paystack";

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
 * Validate -> insert `applications` -> initialise a Paystack
 * transaction -> return a checkout URL for the client to redirect to.
 *
 * The insert goes through the `submit_application` RPC, not a direct
 * table insert. `applications` has RLS enabled with no anon policy —
 * deliberately, since it holds parent email/phone and a child's DOB
 * and school, and any anon-readable policy on that table would be a
 * PII leak. The SECURITY DEFINER function is the only public write
 * path, and it returns nothing but the new id.
 *
 * Nothing here is trusted from the client except as a starting point:
 * the course and its price are re-fetched server-side, the RPC
 * re-checks that the course is live, and the table's own insert
 * triggers re-validate age eligibility and recompute the charge. This
 * function can be wrong and the database still won't accept a
 * tampered application.
 *
 * This function never marks anything paid. Only the verified webhook
 * at /api/paystack/webhook does that.
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
  /* Coarse outer bound only — deliberately wider than the term
     programme's 10–15, because Summer has no track split and may
     legitimately take a 16-year-old. The course-specific age band is
     enforced by the DB trigger on insert, which is the real source of
     truth; this just catches obvious nonsense before a round trip. */
  if (age < 10 || age > 16) {
    return { ok: false, error: "KIT doesn't currently have a track for that age." };
  }

  // Look up the course server-side. Never trust a client-sent price
  // or a client-sent "this course is open" assumption.
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("slug, code, title, type, status, price_kobo, price_monthly_kobo, instalments")
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

  /* Request metadata for the audit trail. Behind Vercel the real
     client IP is the first entry in x-forwarded-for; the rest are
     proxies. Both are best-effort — never let a missing header block
     an application. */
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? null;
  const userAgent = headerList.get("user-agent") ?? null;

  const { data: applicationId, error: insertError } = await supabase.rpc(
    "submit_application",
    {
      p_student_name: input.studentName,
      p_student_dob: input.dob,
      p_student_gender: input.gender,
      p_student_school: input.school,
      p_parent_name: input.parentName,
      p_parent_email: input.email,
      p_parent_phone: input.phone,
      p_parent_relationship: input.relationship,
      p_course_slug: input.courseSlug,
      p_plan: isSummer ? null : input.plan,
      p_amount_due_kobo: amountDueKobo,
      p_amount_total_kobo: amountTotalKobo,
      p_referral_source: input.referral,
      p_notes: input.notes,
      p_consent_given: input.consent,
      p_source: "website",
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
    }
  );

  if (insertError || !applicationId) {
    /* Likely causes: the age-eligibility trigger rejecting this
       course/age combination, the amount-tamper trigger, or the RPC's
       own live-course check. Postgres messages aren't reliably
       parseable for exact cause, so this stays generic rather than
       guessing wrong at the parent. */
    console.error("submitApplication insert:", insertError?.message);
    return {
      ok: false,
      error:
        "We couldn't submit that application. Double-check the date of birth and program, then try again — or contact us if it keeps happening.",
    };
  }

  /* From here on the application row EXISTS and is safe. Every
     failure path below returns ok:true with checkoutUrl:null rather
     than an error — losing a saved application because Paystack had a
     bad minute would be far worse than asking admin to chase payment
     manually. The parent should never have to fill this form twice. */

  if (!process.env.PAYSTACK_SECRET_KEY) {
    // No keys configured yet (local dev before setup).
    return { ok: true, applicationId, checkoutUrl: null };
  }

  const init = await initializeTransaction({
    email: input.email,
    amountKobo: amountDueKobo,
    applicationId,
    studentName: input.studentName,
    courseTitle: course.title,
  });

  if (!init.ok) {
    console.error("submitApplication paystack init:", init.error);
    return { ok: true, applicationId, checkoutUrl: null };
  }

  /* Store the reference before the parent is redirected. If the
     webhook never arrives, this is what lets admin match a Paystack
     dashboard entry back to this application by hand. Goes through an
     RPC for the same RLS reason as the insert. */
  const { error: refError } = await supabase.rpc("set_application_payment_ref", {
    p_application_id: applicationId,
    p_payment_ref: init.reference,
  });

  if (refError) {
    // Non-fatal — the webhook carries application_id in its metadata
    // and doesn't depend on this column. Log and continue.
    console.error("submitApplication payment_ref:", refError.message);
  }

  return {
    ok: true,
    applicationId,
    checkoutUrl: init.authorizationUrl,
  };
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