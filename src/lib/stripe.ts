import Stripe from "stripe";

/**
 * Stripe handles GBP for European applicants. Paystack handles NGN.
 * The two never overlap — Paystack cannot process GBP on a Nigerian
 * account (this was checked and confirmed), which is why there are two
 * providers rather than one.
 *
 * Mirrors src/lib/paystack.ts deliberately: same result shape, same
 * "never throw, always return a typed result" contract, so the caller
 * can treat both providers identically.
 */

export type StripeInitArgs = {
  email: string;
  /** MINOR unit — pence for GBP. £20.00 = 2000. Already minor; do not multiply. */
  amountMinor: number;
  currency: "gbp";
  applicationId: string;
  studentName: string;
  courseTitle: string;
};

export type StripeInitResult =
  | { ok: true; checkoutUrl: string; reference: string }
  | { ok: false; error: string };

export async function createCheckoutSession(
  args: StripeInitArgs
): Promise<StripeInitResult> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { ok: false, error: "STRIPE_SECRET_KEY is not set." };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.kitacademy.net";

  try {
    const stripe = new Stripe(key);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: args.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: args.currency,
            unit_amount: args.amountMinor,
            product_data: {
              name: args.courseTitle,
              description: `Enrolment for ${args.studentName}`,
            },
          },
        },
      ],
      // application_id is what the webhook uses to find the row. It must
      // be here — the webhook does not trust anything else to identify
      // which application was paid for.
      metadata: {
        application_id: args.applicationId,
        student_name: args.studentName,
      },
      success_url: `${siteUrl}/apply/callback?provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/apply?cancelled=1`,
    });

    if (!session.url) {
      return { ok: false, error: "Stripe returned no checkout URL." };
    }

    return { ok: true, checkoutUrl: session.url, reference: session.id };
  } catch (err) {
    // Never throw — the application row already exists by the time this
    // is called, and losing it would be far worse than a manual chase.
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Stripe request failed.",
    };
  }
}