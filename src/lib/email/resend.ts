import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

// Sandbox sender — only delivers to the email address(es) on your
// Resend account. Swap this to a verified domain address (once
// kitglobal.com or anything else is verified) — this is the one
// line that changes.
export const EMAIL_FROM = "KIT <noreply@kitacademy.net>";