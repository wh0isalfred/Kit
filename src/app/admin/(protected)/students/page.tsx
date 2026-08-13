import { createClient } from "@/lib/supabase/server";
import StudentsView, { type RosterRow } from "./StudentsView";

export const dynamic = "force-dynamic";

/**
 * /admin/students — the combined roster.
 *
 * KIT has two separate student tables by design (ADR 002): summer
 * students exist only as cookie-authenticated roster rows, while
 * 12-week students get real Supabase Auth accounts. A page built on
 * only one of them would be empty or misleading, so this merges both
 * into one list with a `programme` discriminator.
 *
 * Both reads are raw table queries, which is correct HERE — this is
 * admin-only code behind the (protected) layout, and both tables'
 * RLS grants is_admin(). Student-facing code must never do this; see
 * doc 07 for the two outages caused by exactly that mistake.
 */
export default async function StudentsPage() {
  const supabase = await createClient();

  const [{ data: summer }, { data: term }, { data: batches }] = await Promise.all([
  supabase
        .from("summer_students")
        .select("id, summer_id, name, cohort_year, batch_id, active, created_at, parent_email, parent_phone")
        .eq("is_test", false)
        .order("created_at", { ascending: false }),
    supabase
      .from("students")
      .select("id, kit_id, name, email, batch_id, status, kit_points, enrolled_at, login_email_sent_at, parent_email, parent_phone, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("batches").select("id, cohort_label"),
  ]);

  const batchLabel = new Map((batches ?? []).map((b) => [b.id, b.cohort_label]));

  const summerRows: RosterRow[] = (summer ?? []).map((s) => ({
    id: s.id,
    programme: "summer",
    displayId: s.summer_id,
    name: s.name,
    batch: s.batch_id ? batchLabel.get(s.batch_id) ?? null : null,
    status: s.active ? "active" : "inactive",
    contactEmail: s.parent_email ?? null,
    contactPhone: s.parent_phone ?? null,
    points: null,
    // Summer IDs are delivered manually, so there's no sent-timestamp
    // to track here the way there is for 12-week login emails.
    loginEmailSent: null,
    joinedAt: s.created_at,
    cohortYear: s.cohort_year,
  }));

  const termRows: RosterRow[] = (term ?? []).map((s) => ({
    id: s.id,
    programme: "term",
    displayId: s.kit_id,
    name: s.name,
    batch: s.batch_id ? batchLabel.get(s.batch_id) ?? null : null,
    status: s.status,
    contactEmail: s.email ?? s.parent_email ?? null,
    contactPhone: s.parent_phone ?? null,
    points: s.kit_points ?? 0,
    loginEmailSent: s.login_email_sent_at,
    joinedAt: s.enrolled_at ?? s.created_at,
    cohortYear: null,
  }));

  const rows = [...summerRows, ...termRows].sort(
    (a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
  );

  return <StudentsView rows={rows} />;
}