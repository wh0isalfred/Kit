"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, EMAIL_FROM } from "@/lib/email/resend";

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

/* ── ENROL (summer) ───────────────────────────────────────── */
/* Summer needs no batch — enrol_summer_student() generates the
   Summer ID, which IS the student's credential. */

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

  const { summer_id, name } = data[0];
  const emailSent = await sendSummerIdEmail(supabase, {
    applicationId,
    summerId: summer_id,
    name,
  });

  revalidate();
  revalidatePath("/admin/summer");
  return { ok: true, summerId: summer_id, name, emailSent };
}

/* Reads parent_email off the linked `applications` row and sends the
   Summer ID. This ONLY covers enrolment from a paid application —
   enrol_summer_student() also supports a bare-roster-import path
   (called with p_name/p_cohort_year instead of p_application_id per
   the handoff doc), which has no applications row to read an email
   from. If that path is exposed as a separate admin action elsewhere,
   it needs its own email wiring wherever ITS contact info lives. */
async function sendSummerIdEmail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  args: { applicationId: string; summerId: string; name: string }
): Promise<boolean> {
  const { data: app, error: readError } = await supabase
    .from("applications")
    .select("parent_email")
    .eq("id", args.applicationId)
    .single();

  if (readError || !app?.parent_email) {
    console.error(
      "summer ID email: no parent_email for application",
      args.applicationId,
      readError?.message
    );
    return false;
  }

  const { error: sendError } = await resend.emails.send({
    from: EMAIL_FROM,
    to: app.parent_email,
    subject: `${args.name}'s Summer ID is ready`,
    html: `
      <p>Hi,</p>
      <p>${args.name}'s Summer ID is <strong>${args.summerId}</strong>.</p>
      <p>Use it to sign in at the KIT Summer portal once the camp gate opens.</p>
    `,
  });

  if (sendError) {
    console.error("summer ID email: Resend send failed:", sendError.message);
    return false;
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
