import Link from "next/link";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { verifyTransaction } from "@/lib/paystack";

export const dynamic = "force-dynamic";

/**
 * Payment callback — display only, for BOTH providers.
 *
 * Paystack redirects here with ?reference=...
 * Stripe redirects here with ?provider=stripe&session_id=cs_...
 *
 * Neither path decides payment status. The webhooks do that, because a
 * browser redirect can be forged, replayed, or simply never arrive.
 * This page verifies with the provider purely so the parent sees an
 * accurate message even if the webhook hasn't landed yet.
 */
export default async function PaymentCallback({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; provider?: string; session_id?: string }>;
}) {
  const { reference, provider, session_id } = await searchParams;

  const isStripe = provider === "stripe" || !!session_id;
  const paymentRef = isStripe ? session_id : reference;

  if (!paymentRef) {
    return (
      <Shell title="Something went wrong">
        <p>We didn&apos;t get a payment reference back. If you were charged,
        contact us at kitph@gmail.com and we&apos;ll sort it out.</p>
      </Shell>
    );
  }

  const paid = isStripe
    ? await verifyStripeSession(paymentRef)
    : await verifyPaystack(paymentRef);

  if (!paid) {
    return (
      <Shell title="Payment not completed">
        <p>That payment didn&apos;t go through. Nothing has been charged.
        You can try again, or reach us at kitph@gmail.com.</p>
        <Link className="af-submit" href="/apply">Back to the form</Link>
      </Shell>
    );
  }

  // Confirm our own record caught up. Not required for correctness —
  // just lets us say something more precise.
  const supabase = await createClient();
  const { data: application } = await supabase
    .from("applications")
    .select("student_name, payment_status")
    .eq("payment_ref", paymentRef)
    .maybeSingle();

  return (
    <Shell title="Payment received">
      <p>
        Thank you — we&apos;ve received payment for{" "}
        {application?.student_name ?? "your child"}&apos;s application.
      </p>
      <p>
        We&apos;ll review the application and get in touch about next steps.
        Login details are sent to the email you gave us once a place is
        confirmed.
      </p>
      <p className="af-hint">Reference: {paymentRef}</p>
    </Shell>
  );
}

async function verifyPaystack(reference: string): Promise<boolean> {
  const result = await verifyTransaction(reference);
  return result.ok && result.status === "success";
}

async function verifyStripeSession(sessionId: string): Promise<boolean> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error("callback: STRIPE_SECRET_KEY not set");
    return false;
  }

  try {
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return session.payment_status === "paid";
  } catch (err) {
    console.error(
      "callback: stripe session retrieve failed",
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="wrap">
      <div className="af af-success">
        <h2>{title}</h2>
        {children}
      </div>
    </main>
  );
}