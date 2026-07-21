import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { verifyTransaction } from "@/lib/paystack";

export const dynamic = "force-dynamic";

export default async function PaymentCallback({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference } = await searchParams;

  if (!reference) {
    return (
      <Shell title="Something went wrong">
        <p>We didn&apos;t get a payment reference back. If you were charged,
        contact us at kitph@gmail.com and we&apos;ll sort it out.</p>
      </Shell>
    );
  }

  /* Ask Paystack directly what happened. This is display only — the
     webhook is what actually records payment. If the webhook hasn't
     landed yet the parent still sees an accurate "we've got it". */
  const result = await verifyTransaction(reference);

  if (!result.ok || result.status !== "success") {
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
    .eq("payment_ref", reference)
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
      <p className="af-hint">Reference: {reference}</p>
    </Shell>
  );
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