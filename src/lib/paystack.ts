import crypto from "crypto";

/**
 * Paystack API helpers. Server-only — PAYSTACK_SECRET_KEY must never
 * reach the browser. Nothing in this file should be imported from a
 * "use client" component.
 *
 * Amounts are in kobo throughout, matching both the database and
 * Paystack's own unit. No conversion happens here, deliberately —
 * every conversion is a chance to be wrong by 100×.
 */

const PAYSTACK_BASE = "https://api.paystack.co";

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return key;
}

export type InitializeArgs = {
  email: string;
  amountKobo: number;
  applicationId: string;
  /** Shown on the Paystack receipt and in the dashboard. */
  studentName: string;
  courseTitle: string;
};

export type InitializeResult =
  | { ok: true; authorizationUrl: string; reference: string }
  | { ok: false; error: string };

/**
 * Creates a Paystack transaction and returns the checkout URL.
 *
 * `metadata.application_id` is the thread that lets the webhook find
 * this application again later. Without it the webhook receives a
 * payment it can't attribute to anyone.
 */
export async function initializeTransaction(
  args: InitializeArgs
): Promise<InitializeResult> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    return { ok: false, error: "NEXT_PUBLIC_SITE_URL is not set" };
  }

  try {
    const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: args.email,
        amount: args.amountKobo, // already kobo — do not multiply
        callback_url: `${siteUrl}/apply/callback`,
        metadata: {
          application_id: args.applicationId,
          student_name: args.studentName,
          course: args.courseTitle,
          // Shown as line items on the Paystack dashboard — makes
          // reconciliation readable instead of a wall of references.
          custom_fields: [
            {
              display_name: "Student",
              variable_name: "student_name",
              value: args.studentName,
            },
            {
              display_name: "Program",
              variable_name: "course",
              value: args.courseTitle,
            },
          ],
        },
      }),
      cache: "no-store",
    });

    const body = await res.json();

    if (!res.ok || !body?.status) {
      return {
        ok: false,
        error: body?.message ?? `Paystack returned ${res.status}`,
      };
    }

    return {
      ok: true,
      authorizationUrl: body.data.authorization_url,
      reference: body.data.reference,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Paystack request failed",
    };
  }
}

/**
 * Verifies the webhook signature.
 *
 * `rawBody` MUST be the exact string Paystack sent. Parsing to JSON
 * and re-stringifying changes the bytes (key order, whitespace) and
 * every check will fail. Read the body with `await req.text()`,
 * verify, then parse.
 *
 * timingSafeEqual guards against timing attacks; it throws on
 * length mismatch, hence the try/catch.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null
): boolean {
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha512", secretKey())
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

/**
 * Server-side confirmation of a transaction's real state.
 *
 * Used by the callback page so it can show an accurate status even
 * if the webhook hasn't landed yet. Still does not write anything —
 * only the webhook records payment.
 */
export async function verifyTransaction(reference: string): Promise<{
  ok: boolean;
  status?: string;
  amountKobo?: number;
  applicationId?: string;
}> {
  try {
    const res = await fetch(
      `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${secretKey()}` },
        cache: "no-store",
      }
    );
    const body = await res.json();
    if (!res.ok || !body?.status) return { ok: false };

    return {
      ok: true,
      status: body.data.status, // "success" | "failed" | "abandoned"
      amountKobo: body.data.amount,
      applicationId: body.data.metadata?.application_id,
    };
  } catch {
    return { ok: false };
  }
}
