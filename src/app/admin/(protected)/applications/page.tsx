import { createClient } from "@/lib/supabase/server";
import ApplicationsView from "./ApplicationsView";
import type { BatchOption, QueueItem } from "./ApplicationRow";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const supabase = await createClient();

  /* admin_application_queue filters to status='pending' in SQL, so
     decided applications are read separately from the base table. */
  const { data: pending, error } = await supabase
    .from("admin_application_queue")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: decided } = await supabase
    .from("applications")
    .select(
      "id, student_name, age_at_application, parent_name, parent_email, parent_phone, course_slug, plan, amount_due_kobo, amount_total_kobo, payment_status, payment_ref, status, source, created_at"
    )
    .neq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: courses } = await supabase
    .from("courses")
    .select("slug, title, type");

  const { data: batches } = await supabase
    .from("batches")
    .select("id, cohort_label, course_slug, capacity, status");

  /* Real occupancy. batches.next_student_no is an ID counter and
     never decreases, so it over-reports once anyone is removed.
     Count active students instead. */
  const { data: students } = await supabase
    .from("students")
    .select("batch_id")
    .eq("status", "active");

  const batchOptions: BatchOption[] = (batches ?? []).map((b) => ({
    id: b.id,
    cohort_label: b.cohort_label,
    course_slug: b.course_slug,
    capacity: b.capacity,
    status: b.status,
    seats_used: (students ?? []).filter((s) => s.batch_id === b.id).length,
  }));

  const courseType = new Map((courses ?? []).map((c) => [c.slug, c.type]));
  const courseTitle = new Map((courses ?? []).map((c) => [c.slug, c.title]));

  const decidedItems: QueueItem[] = (decided ?? []).map((d) => ({
    ...d,
    course_title: courseTitle.get(d.course_slug) ?? d.course_slug,
    amount_due_naira: d.amount_due_kobo / 100,
    amount_total_naira: d.amount_total_kobo / 100,
    approvable: false,
    needs_payment_check: false,
  })) as QueueItem[];

  if (error) {
    return (
      <>
        <header className="admin-head">
          <h1>Applications</h1>
        </header>
        <p className="af-submit-error">Couldn&apos;t load the queue: {error.message}</p>
      </>
    );
  }

  return (
    <ApplicationsView
      pending={(pending ?? []) as QueueItem[]}
      decided={decidedItems}
      batches={batchOptions}
      summerSlugs={
        (courses ?? []).filter((c) => c.type === "summer").map((c) => c.slug)
      }
    />
  );
}
