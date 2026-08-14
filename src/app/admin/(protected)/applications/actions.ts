"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, EMAIL_FROM } from "@/lib/email/resend";
// Hosted rather than attached: a screen recording will exceed the
// ~25MB most mail servers accept, and a bounced email means the parent
// gets nothing. A link also plays instantly on a phone.
const WALKTHROUGH_VIDEO_URL = "https://youtu.be/jRHRV94NXQs";
const PORTAL_URL = "https://www.kitacademy.net/smportal";

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Not authorised");
  return supabase;
}

const revalidate = () => {
  revalidatePath("/admin");
  revalidatePath("/admin/applications");
  revalidatePath("/admin/students");
};

/* ────────────────────────────────────────────────────────────
   MARK PAID — the manual/bank-transfer path
   ────────────────────────────────────────────────────────────
   approve_application() refuses anything not already 'paid', and
   until now the ONLY thing that could set that was the Paystack
   webhook. That left no route at all for a bank transfer, which is
   what many Nigerian parents actually use — and no way to test the
   approve chain before Paystack is live.

   This is deliberately separate from the webhook and writes an
   audit row, because "admin said the money arrived" and "Paystack
   confirmed the money arrived" are different claims and the audit
   log should be able to tell them apart.
   ──────────────────────────────────────────────────────────── */
export async function markApplicationPaid(
  applicationId: string,
  note: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await assertAdmin();

  const { data: app, error: readError } = await supabase
    .from("applications")
    .select("id, student_name, payment_status, amount_due_kobo")
    .eq("id", applicationId)
    .single();

  if (readError || !app) return { ok: false, error: "Application not found." };
  if (app.payment_status === "paid") return { ok: true }; // already done

  const { error } = await supabase
    .from("applications")
    .update({
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      payment_ref: note.trim() ? `manual:${note.trim()}` : "manual",
    })
    .eq("id", applicationId)
    .neq("payment_status", "paid");

  if (error) return { ok: false, error: error.message };

  await supabase.rpc("write_audit", {
    p_action: "payment_marked_manual",
    p_entity: "applications",
    p_entity_id: applicationId,
    p_summary: `Payment for ${app.student_name} recorded manually${
      note.trim() ? `: ${note.trim()}` : ""
    }`,
    p_detail: { amount_kobo: app.amount_due_kobo, method: "manual" },
  });

  revalidate();
  return { ok: true };
}

/* ── APPROVE (12-week) ────────────────────────────────────── */
/* Untouched. The welcome email is summer-only, confirmed — this flow
   sends its own "your KIT account is ready" email via
   provisionStudentAccount() below, which already covers the same
   ground for the 12-week program. */

export type ApproveResult =
  | { ok: true; kitId: string; batchLabel: string; emailSent: boolean }
  | { ok: false; error: string };

export async function approveApplication(
  applicationId: string,
  batchId: string
): Promise<ApproveResult> {
  const supabase = await assertAdmin();

  const { data, error } = await supabase.rpc("approve_application", {
    p_application_id: applicationId,
    p_batch_id: batchId,
  });

  if (error || !data?.[0]) {
    return {
      ok: false,
      error: friendlyError(error?.message ?? "Approval failed."),
    };
  }

  const { student_id, kit_id, batch_label, email } = data[0];
  const emailSent = await provisionStudentAccount({
    studentId: student_id,
    email,
    kitId: kit_id,
  });

  revalidate();
  return { ok: true, kitId: kit_id, batchLabel: batch_label, emailSent };
}

/* ── ENROL / APPROVE (summer) ─────────────────────────────── */
/* Summer needs no batch — enrol_summer_student() generates the
   Summer ID, which IS the student's credential. Approving a summer
   application automatically sends the welcome email (below) — that's
   the ONLY automatic email on this path. The Summer ID itself is
   being sent manually for now, not by this code. */

export type EnrolResult =
  | { ok: true; summerId: string; name: string; emailSent: boolean }
  | { ok: false; error: string };

export async function enrolSummerStudent(
  applicationId: string,
  batchId: string
): Promise<EnrolResult> {
  const supabase = await assertAdmin();

  const { data, error } = await supabase.rpc("enrol_summer_student", {
    p_application_id: applicationId,
    p_batch_id: batchId,
  });

  if (error || !data?.[0]) {
    return { ok: false, error: friendlyError(error?.message ?? "Enrolment failed.") };
  }

  const { summer_id, name, summer_student_id } = data[0];

  // Email 1 of 2 — immediate welcome + device checklist.
  const emailSent = await sendWelcomeEmail(supabase, {
    applicationId,
    name,
  });

  // Email 2 of 2 — Student ID + portal walkthrough, scheduled 15
  // minutes out via Resend so the two don't land together.
  // Deliberately not awaited into `emailSent` — that flag reports the
  // welcome email specifically, and a failure here is recorded by a
  // NULL id_email_sent_at rather than by blocking enrolment.
  await sendStudentIdEmail(supabase, {
    applicationId,
    summerStudentId: summer_student_id,
    studentName: name,
    summerId: summer_id,
  });

  revalidate();
  revalidatePath("/admin/summer");
  return { ok: true, summerId: summer_id, name, emailSent };
}

/* Mr. / Mrs. / Mr./Mrs. by parent_relationship. Values are constrained
   by a CHECK constraint on applications — 'Father' | 'Mother' |
   'Guardian' | 'Other' | NULL — confirmed directly against the
   constraint definition, not guessed. Guardian, Other, and an
   unexpected/null value all fall through to "Mr./Mrs." since gender
   isn't knowable for those. */
function parentPrefix(relationship: string | null): string {
  switch (relationship) {
    case "Father":
      return "Mr.";
    case "Mother":
      return "Mrs.";
    default:
      return "Mr./Mrs.";
  }
}

/* Reads parent_email, parent_name, and parent_relationship off the
   linked `applications` row and sends the welcome email. This ONLY
   covers enrolment from a paid application — enrol_summer_student()
   also supports a bare-roster-import path (called with
   p_name/p_cohort_year instead of p_application_id per the handoff
   doc), which has no applications row to read contact info from. If
   that path is exposed as a separate admin action elsewhere, it
   needs its own email wiring. */
async function sendWelcomeEmail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  args: { applicationId: string; name: string }
): Promise<boolean> {
  const { data: app, error: readError } = await supabase
    .from("applications")
    .select("parent_email, parent_name, parent_relationship")
    .eq("id", args.applicationId)
    .single();

  if (readError || !app?.parent_email) {
    console.error(
      "welcome email: no parent_email for application",
      args.applicationId,
      readError?.message
    );
    return false;
  }

  // No name on file → plain "Parent," with no title, rather than a
  // dangling "Mr./Mrs. ," with nothing after it.
  const parentGreeting = app.parent_name?.trim()
    ? `${parentPrefix(app.parent_relationship)} ${app.parent_name.trim()}`
    : "Parent";

  const { error: sendError } = await resend.emails.send({
    from: EMAIL_FROM,
    to: app.parent_email,
    subject: "Welcome to KIT!",
    html: `
  <p>Dear <strong>${parentGreeting}</strong>,</p>
  <p><strong>Welcome to KIT</strong>, and thank you for enrolling <strong>${args.name}</strong>.</p>
  <p>At KIT, we focus on helping children think, create, and solve problems with technology, not just consume it.</p>
  <p>We're excited to see what ${args.name} builds.</p>
  <p>To get started, <strong>please make sure your child has:</strong></p>
  <ul>
    <li>A laptop or desktop (Windows or macOS)</li>
    <li>A stable internet connection</li>
    <li>Google Chrome</li>
    <li>A notebook and pen</li>
  </ul>
  <p>Please have the device charged or plugged in before each class.</p>
  <p>You'll receive another email shortly with everything you need&mdash;Student ID, portal access, and how classes and assignments work. Once that arrives, you're all set.</p>
  <p>If you have any questions, please feel free to reply here or reach out to the KIT team on WhatsApp.</p>
  <p><strong>We're glad to have you with us.</strong></p>
  <p>&mdash; The KIT Team</p>
`,
  });

  if (sendError) {
    console.error("welcome email: Resend send failed:", sendError.message);
    return false;
  }

  return true;

  
}
/**
 * Email 2 of 2 — the Student ID and portal walkthrough.
 *
 * Scheduled 15 minutes out via Resend's native scheduling, purely so
 * the parent isn't hit with two emails in the same second. No cron, no
 * queue table — Resend holds it.
 *
 * Deliberately best-effort, like the welcome email: a failure here
 * must never block enrolment. But unlike the welcome email, this one
 * carries the student's ONLY credential, so a failure is recorded (or
 * rather, not recorded) in summer_students.id_email_sent_at — a NULL
 * there means that family cannot log in and needs chasing.
 */
async function sendStudentIdEmail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  args: { applicationId: string; summerStudentId: string; studentName: string; summerId: string }
): Promise<boolean> {
  const { data: app, error: readError } = await supabase
    .from("applications")
    .select("parent_email, parent_name, parent_relationship")
    .eq("id", args.applicationId)
    .single();

  if (readError || !app?.parent_email) {
    console.error(
      "student ID email: no parent_email for application",
      args.applicationId,
      readError?.message
    );
    return false;
  }

  const parentGreeting = app.parent_name?.trim()
    ? `${parentPrefix(app.parent_relationship)} ${app.parent_name.trim()}`
    : "Parent";

  // 15 minutes from now, ISO 8601 — Resend holds and sends it.
  const scheduledAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { error: sendError } = await resend.emails.send({
    from: EMAIL_FROM,
    to: app.parent_email,
    subject: `${args.studentName}'s KIT Student Portal is ready`,
    scheduledAt,
    html: `
  <p>Dear <strong>${parentGreeting}</strong>,</p>

  <p>Your child's KIT Student Portal is now ready.</p>

  <p>The Student Portal is where students access learning resources, join live classes on Google Meet, view assignments, and submit homework throughout the programme.</p>

  <h3 style="margin:24px 0 8px;color:#1F2C4F;">Student ID</h3>
  <p style="margin:0 0 8px;">${args.studentName}'s Student ID is:</p>
  <p style="font-size:26px;font-weight:800;letter-spacing:2px;color:#1F2C4F;margin:0 0 16px;">${args.summerId}</p>
  <p>To access the Student Portal, simply enter this Student ID on the login page.</p>

  <p style="margin:24px 0;">
    <a href="${PORTAL_URL}" style="background:#1999E4;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;">Open Student Portal</a>
  </p>
  <p style="font-size:13px;color:#6B7A99;margin:0 0 24px;">Or go to ${PORTAL_URL}</p>

  <h3 style="margin:24px 0 8px;color:#1F2C4F;">Getting started</h3>
  <p>We've recorded a short walkthrough showing you how to:</p>
  <ul>
    <li>Log in to the Student Portal</li>
    <li>Download the course curriculum</li>
    <li>Access weekly learning resources</li>
    <li>Join live classes on Google Meet</li>
    <li>View assignments and homework</li>
    <li>Submit completed homework</li>
    <li>Find announcements and updates</li>
  </ul>

  <p style="margin:20px 0;">
    <a href="${WALKTHROUGH_VIDEO_URL}" style="background:#25B290;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;">Watch the walkthrough</a>
  </p>

  <p>We recommend watching it before the first class so you and your child are familiar with how everything works.</p>

  <p>If you have any questions or trouble accessing the portal, simply reply to this email or contact the KIT team on WhatsApp.</p>

  <p>We're excited to begin this journey with your family, and we look forward to seeing what ${args.studentName} creates.</p>

  <p>See you in class!</p>
  <p>&mdash; The KIT Team</p>
`,
  });

  if (sendError) {
    console.error("student ID email: Resend send failed:", sendError.message);
    return false;
  }

  // Recorded only on success — a NULL here is a real signal that this
  // family never got their credential.
  const { error: stampError } = await supabase
    .from("summer_students")
    .update({ id_email_sent_at: new Date().toISOString() })
    .eq("id", args.summerStudentId);

  if (stampError) {
    console.error("student ID email: timestamp update failed:", stampError.message);
  }

  return true;
}

/* ── REJECT ───────────────────────────────────────────────── */

export type RejectResult =
  | { ok: true; refundDue: boolean; refundNaira: number }
  | { ok: false; error: string };

export async function rejectApplication(
  applicationId: string,
  reason: string
): Promise<RejectResult> {
  const supabase = await assertAdmin();

  if (!reason.trim()) return { ok: false, error: "A reason is required." };

  const { data, error } = await supabase.rpc("reject_application", {
    p_application_id: applicationId,
    p_reason: reason.trim(),
  });

  if (error) return { ok: false, error: friendlyError(error.message) };

  revalidate();
  return {
    ok: true,
    refundDue: data?.[0]?.refund_due ?? false,
    refundNaira: (data?.[0]?.refund_kobo ?? 0) / 100,
  };
}

/* ── Auth account + login email ───────────────────────────── */

async function provisionStudentAccount(args: {
  studentId: string;
  email: string;
  kitId: string;
}): Promise<boolean> {
  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: args.email,
    email_confirm: true,
    user_metadata: { kit_id: args.kitId, role: "student" },
  });

  let userId = created?.user?.id;

  // Already exists — a re-approval, or a parent with a second child.
  if (createError && !userId) {
    const { data: list } = await admin.auth.admin.listUsers();
    userId = list?.users.find((u) => u.email === args.email)?.id;
    if (!userId) {
      console.error("provisionStudentAccount:", createError.message);
      return false;
    }
  }

  await admin.from("students").update({ user_id: userId }).eq("id", args.studentId);
  await admin.from("profiles").upsert({ user_id: userId, role: "student" });

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: args.email,
  });
  if (linkError || !linkData) {
    console.error("login email: generateLink failed:", linkError?.message);
    return false;
  }

  const { error: sendError } = await resend.emails.send({
    from: EMAIL_FROM,
    to: args.email,
    subject: "Your KIT account is ready",
    html: `
      <p>Hi,</p>
      <p>Your KIT ID is <strong>${args.kitId}</strong>.</p>
      <p>Set your password to get started:</p>
      <p><a href="${linkData.properties.action_link}">Set your password</a></p>
    `,
  });

  if (sendError) {
    console.error("login email: Resend send failed:", sendError.message);
    return false;
  }

  await admin
    .from("students")
    .update({ login_email_sent_at: new Date().toISOString() })
    .eq("id", args.studentId);

  return true;
}

/** Turn Postgres exception text into something an operator can act on. */
function friendlyError(raw: string): string {
  if (raw.includes("is full")) {
    return "That batch is full. Pick another, or raise its capacity.";
  }
  if (raw.includes("not open for enrolment")) {
    return "That batch isn't open for enrolment — check its status.";
  }
  if (raw.includes("payment status")) {
    return "Payment hasn't been recorded yet. Mark it paid first.";
  }
  if (raw.includes("already approved")) {
    return "This application was already approved.";
  }
  if (raw.includes("not pending")) {
    return "This application has already been decided.";
  }
  if (raw.includes("teaches")) {
    return "That batch is for a different course.";
  }
  if (raw.includes("half full")) {
    return "The Summer ID space is over half full — widen it before enrolling more.";
  }
  return raw;
}