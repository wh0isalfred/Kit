import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/paystack";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * THE ONLY PLACE AN APPLICATION IS MARKED PAID.
 *
 * Not the callback page, not the client. This is a server-to-server
 * call signed with the secret key; the redirect is a browser event
 * that can be forged, replayed, or simply never arrive.
 *
 * Three things this route gets right, all of which are easy to get
 * wrong:
 *
 * 1. Reads the RAW body text before parsing. Paystack signs the exact
 *    bytes it sent — parse-then-restringify produces different bytes
 *    and every signature check fails.
 * 2. Verifies the signature BEFORE trusting any field in the payload.
 * 3. Is idempotent. Paystack retries; the same event may arrive twice.
 *    Recording a payment twice would corrupt the ledger.
 *
 * Uses the service-role client because this request has no user
 * session — it's Paystack's server, not a logged-in parent. RLS
 * doesn't apply, so the signature check IS the authorization.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    // Not an error worth 500ing over — someone hit the endpoint
    // without a valid signature. Refuse, don't retry.
    console.warn("paystack webhook: invalid signature");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: {
    event?: string;
    data?: {
      reference?: string;
      amount?: number;
      status?: string;
      metadata?: { application_id?: string };
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "malformed body" }, { status: 400 });
  }

  // Only successful charges matter here. Everything else (failed
  // charges, transfers, refunds) is acknowledged so Paystack stops
  // retrying, but changes nothing.
  if (event.event !== "charge.success") {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const reference = event.data?.reference;
  const amountKobo = event.data?.amount;
  const applicationId = event.data?.metadata?.application_id;

  if (!reference || !applicationId || typeof amountKobo !== "number") {
    console.error("paystack webhook: charge.success missing fields", {
      reference,
      applicationId,
    });
    // 200 on purpose: retrying won't add the missing metadata. This
    // needs a human, not another delivery attempt.
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const supabase = createAdminClient();

  // Confirm the amount matches what we actually asked for. A mismatch
  // means either a bug or someone initializing their own transaction
  // against our application id.
  const { data: application, error: fetchError } = await supabase
    .from("applications")
    .select("id, amount_due_kobo, payment_status")
    .eq("id", applicationId)
    .single();

  if (fetchError || !application) {
    console.error("paystack webhook: unknown application", applicationId);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  if (application.amount_due_kobo !== amountKobo) {
    console.error("paystack webhook: AMOUNT MISMATCH — not recording", {
      applicationId,
      expected: application.amount_due_kobo,
      received: amountKobo,
      reference,
    });
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // Already recorded — a retried delivery. Nothing to do.
  if (application.payment_status === "paid") {
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
  }

  /* ⚠ VERIFY THIS SIGNATURE against your actual migration 0009.
     record_payment() is documented as idempotent and safe to call
     from both the webhook and manual admin entry, but the exact
     parameter names/order aren't in the handoff docs. Run:

       select pg_get_function_arguments(p.oid)
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname='public' and p.proname='record_payment';

     and adjust the keys below to match. If the names are wrong this
     fails loudly (Postgres rejects unknown named args) rather than
     silently doing nothing — but better to check first. */
  const { error: rpcError } = await supabase.rpc("record_payment", {
    p_application_id: applicationId,
    p_amount_kobo: amountKobo,
    p_reference: reference,
    p_method: "paystack",
  });

  // Already recorded — a retried delivery. Nothing to do.
  if (application.payment_status === "paid") {
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
  }

  /* NOT record_payment() — that takes p_payment_id and operates on an
     existing row in the `payments` ledger, which only exists AFTER
     approve_application() schedules the instalments. At apply time
     there is no student and no payments row yet, so there is nothing
     for it to act on.

     record_payment() is for months 2 and 3. This is the pay-at-apply
     charge, and the guarded UPDATE below is the documented handling
     for it (README, "Wiring this to the app").

     Idempotent via `payment_status <> 'paid'` in the filter, so a
     retried webhook updates zero rows instead of double-recording. */
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
    console.error("paystack webhook: mark-paid failed", updateError.message);
    // 500 is correct — we want Paystack to retry delivery.
    return NextResponse.json({ error: "record failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
