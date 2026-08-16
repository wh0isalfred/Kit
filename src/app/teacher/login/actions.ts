"use server";

import { createClient } from "@/lib/supabase/server";
import { sendTeacherInviteEmail, sendTeacherPasswordResetEmail } from "@/app/admin/(protected)/teachers/actions";

/**
 * Deliberately NOT assertAdmin() — the whole point is a teacher who
 * isn't signed in yet (or lost their original invite email) can
 * request a fresh one from the login page. No session exists at this
 * point for anything to gate on.
 *
 * The response is deliberately the SAME regardless of whether the
 * email belongs to a real, active teacher — same reasoning as
 * TeacherLoginForm's vague "those details didn't work": if this
 * said "no teacher found with that email" for a miss and something
 * else for a hit, anyone could enumerate which addresses are real
 * staff by trying emails here. A generic "if that's a KIT teacher
 * account, a new invite is on its way" is honest without leaking
 * which emails exist.
 *
 * Does NOT re-send to an already-accepted teacher (user_id already
 * set) — generateLink({ type: 'invite' }) on an existing confirmed
 * user either errors or hands back a link that doesn't do what this
 * button implies ("create your account"). A teacher who already has a
 * password should use "Forgot password" instead, not this flow — but
 * the response is worded the same either way, for the reason above.
 */
export async function requestTeacherInviteResend(
  email: string
): Promise<{ ok: true; message: string }> {
  const genericMessage =
    "If that's a KIT teacher email, a new invite link is on its way.";

  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) {
    return { ok: true, message: genericMessage };
  }

  const supabase = await createClient();

  const { data: teacher } = await supabase
    .from("teachers")
    .select("name, user_id, active")
    .eq("email", trimmed)
    .maybeSingle();

  // No matching teacher, already accepted, or deactivated — all three
  // get the same generic response. Only "exists, active, not yet
  // accepted" actually triggers a send.
  if (!teacher || teacher.user_id || !teacher.active) {
    return { ok: true, message: genericMessage };
  }

  // Best-effort — if this fails, the response still doesn't change,
  // for the same enumeration reason as above. A real delivery failure
  // here is invisible to the requester by design; it's the same
  // "Resend invite" path an admin can already trigger from the
  // teachers list if a teacher reports never receiving anything.
  await sendTeacherInviteEmail(trimmed, teacher.name);

  return { ok: true, message: genericMessage };
}

/**
 * Mirror image of requestTeacherInviteResend above — same shape, same
 * unauthenticated/vague-response reasoning, opposite gate: this one
 * only fires for a teacher who HAS already accepted (user_id set) and
 * is still active. An unaccepted teacher has no password to reset;
 * they belong on the "Set your password" flow instead.
 *
 * Uses generateLink({ type: 'recovery' }) rather than
 * resend.auth.resetPasswordForEmail — generateLink keeps this on the
 * exact same "we build the email, not Supabase" pattern as
 * sendTeacherInviteEmail, so both flows send from kitacademy.net with
 * matching branding, one email HTML pattern to maintain.
 */
export async function requestTeacherPasswordReset(
  email: string
): Promise<{ ok: true; message: string }> {
  const genericMessage =
    "If that's a KIT teacher email, a password reset link is on its way.";

  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) {
    return { ok: true, message: genericMessage };
  }

  const supabase = await createClient();

  const { data: teacher } = await supabase
    .from("teachers")
    .select("name, user_id, active")
    .eq("email", trimmed)
    .maybeSingle();

  // Opposite gate from the invite flow: needs an ALREADY-accepted,
  // active teacher. No teacher, never accepted, or deactivated all
  // get the same generic response.
  if (!teacher || !teacher.user_id || !teacher.active) {
    return { ok: true, message: genericMessage };
  }

  await sendTeacherPasswordResetEmail(trimmed, teacher.name);

  return { ok: true, message: genericMessage };
}
