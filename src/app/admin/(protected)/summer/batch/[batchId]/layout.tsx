import { redirect, notFound } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import BatchTabs from "./BatchTabs";
import { getGradingQueue } from "../../batch-actions";


export const dynamic = "force-dynamic";

export default async function BatchShellLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const queueRes = await getGradingQueue(batchId);
const gradingCount = queueRes.ok ? queueRes.queue.length : 0;
  const supabase = await createClient();

  // Same check as batch-actions.ts's assertAdmin(), done here rather
  // than assumed from (protected)/layout.tsx — see conversation notes.
  // Redirect, not throw, since this is a page render, not a Server Action.
const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/admin/login");

  const { data: batch } = await supabase
    .from("batches")
    .select("id, cohort_label, capacity, status")
    .eq("id", batchId)
    .single();

  if (!batch) notFound();

  // Same seats_used computation as batchesWithSeats in admin/summer/page.tsx,
  // just scoped to one batch instead of mapped across all of them.
  const { count: seatsUsed } = await supabase
    .from("summer_students")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", batchId);

  // current_week is cohort-wide (doc 06 §VIII trap) — there is no
  // per-batch week yet, so this reads the same active cohort every
  // batch page would.
  const { data: cohorts } = await supabase
    .from("summer_cohorts")
    .select("year, active, current_week")
    .order("year", { ascending: false });

  const activeCohort = cohorts?.find((c) => c.active) ?? cohorts?.[0] ?? null;

  return (
    <div className="batch-shell">
      <a href="/admin/summer" className="batch-shell-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        All batches
      </a>

      <header className="batch-shell-head">
        <div>
          <h1>{batch.cohort_label}</h1>
          <p className="batch-shell-meta">
            {seatsUsed ?? 0}/{batch.capacity} seats
            {activeCohort && <> · Week {activeCohort.current_week}</>}
          </p>
        </div>
        <span className={`admin-pill stat-${batch.status}`}>{batch.status}</span>
      </header>

      <BatchTabs batchId={batchId} gradingCount={gradingCount} />

      <div className="batch-shell-body">{children}</div>
    </div>
  );
}