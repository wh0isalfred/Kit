import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * THE ONLY PLACE A GBP APPLICATION IS MARKED PAID.
 *
 * Mirrors the Paystack webhook exactly — same guarantees, different
 * provider:
 *
 * 1. Reads the RAW body text before parsing. Stripe signs the exact
 *    bytes it sent; parse-then-restringify breaks every signature.
 * 2. Verifies the signature BEFORE trusting any field in the payload.
 * 3. Idempotent. Stripe retries; the guarded UPDATE (`.neq(
 *    "payment_status", "paid")`) makes a repeat delivery a no-op.
 *
 * Uses the service-role client because this request has no user
 * session — it's Stripe's server. RLS doesn't apply, so the signature
 * check IS the authorization.
 *
 * Deliberately does NOT call record_payment() — that operates on a row
 * in the `payments` ledger which only exists after approve_application()
 * schedules instalments. At apply time there is no student and no
 * payments row. Same reasoning as the Paystack webhook.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    console.error("stripe webhook: STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 401 });
  }

  const stripe = new Stripe(secretKey);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    // Not worth 500ing over — someone hit the endpoint without a valid
    // signature. Refuse, don't retry.
    console.warn(
      "stripe webhook: invalid signature",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  // Only completed checkouts matter. Everything else is acknowledged so
  // Stripe stops retrying, but changes nothing.
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  const applicationId = session.metadata?.application_id;
  const amountMinor = session.amount_total;
  const currency = session.currency;
  const reference = session.id;

  if (!applicationId || typeof amountMinor !== "number") {
    console.error("stripe webhook: session missing fields", { reference, applicationId });
    // 200 on purpose: retrying won't add missing metadata. Needs a human.
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // A session can complete without the payment actually succeeding
  // (e.g. a delayed payment method). Only 'paid' counts.
  if (session.payment_status !== "paid") {
    console.warn("stripe webhook: session completed but not paid", {
      reference,
      payment_status: session.payment_status,
    });
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const supabase = createAdminClient();

  const { data: application, error: fetchError } = await supabase
    .from("applications")
    .select("id, amount_due_kobo, currency, payment_status")
    .eq("id", applicationId)
    .single();

  if (fetchError || !application) {
    console.error("stripe webhook: unknown application", applicationId);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // Currency check FIRST — a GBP session paying off an NGN application
  // would otherwise pass the amount check by coincidence (2000 pence
  // and 2000 kobo are the same integer, wildly different money).
  if ((application.currency ?? "NGN") !== "GBP" || currency?.toUpperCase() !== "GBP") {
    console.error("stripe webhook: CURRENCY MISMATCH — not recording", {
      applicationId,
      applicationCurrency: application.currency,
      sessionCurrency: currency,
      reference,
    });
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // amount_due_kobo holds the minor unit of the row's currency — pence
  // here. A mismatch means a bug, or someone creating their own session
  // against our application id.
  if (application.amount_due_kobo !== amountMinor) {
    console.error("stripe webhook: AMOUNT MISMATCH — not recording", {
      applicationId,
      expected: application.amount_due_kobo,
      received: amountMinor,
      reference,
    });
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // Already recorded — a retried delivery.
  if (application.payment_status === "paid") {
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
  }

  /* Idempotent via `payment_status <> 'paid'` in the filter, so a
     retried webhook updates zero rows rather than double-recording. */
  const { error: updateError } = await supabase
    .from("applications")
    .update({
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      payment_ref: reference,
    })
    .eq("id", applicationId)
    .neq("payment_status", "paid");

  if (updateError) {
    console.error("stripe webhook: mark-paid failed", updateError.message);
    // 500 is correct — we want Stripe to retry delivery.
    return NextResponse.json({ error: "record failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}