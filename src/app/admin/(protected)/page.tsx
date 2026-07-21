import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Attention = {
  tone: "urgent" | "warn" | "info";
  text: string;
  href: string;
  cta: string;
};

const naira = (n: number | null) =>
  `₦${Number(n ?? 0).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;

export default async function AdminDashboard() {
  const supabase = await createClient();

  const { data: stats } = await supabase.from("admin_stats").select("*").single();

  const { data: recent } = await supabase
    .from("admin_application_queue")
    .select("id, student_name, course_title, amount_due_naira, payment_status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  /* ── Needs attention ──────────────────────────────────────
     Computed from real conditions rather than shown as a chart.
     For a one-person operation this answers "what do I do next",
     which no graph does. */
  const attention: Attention[] = [];

  const { data: cohort } = await supabase
    .from("summer_cohorts")
    .select("year, label, starts_on, ends_on, registration_closes_at")
    .eq("active", true)
    .maybeSingle();

  if (!cohort) {
    attention.push({
      tone: "urgent",
      text: "No active summer cohort. The summer landing page has nothing to show.",
      href: "/admin/summer",
      cta: "Set up summer",
    });
  } else if (!cohort.starts_on || !cohort.ends_on || !cohort.registration_closes_at) {
    attention.push({
      tone: "urgent",
      text: `${cohort.label} has no dates set — the homepage countdown is hidden.`,
      href: "/admin/summer",
      cta: "Add dates",
    });
  }

  if ((stats?.applications_approvable ?? 0) > 0) {
    attention.push({
      tone: "urgent",
      text: `${stats.applications_approvable} paid application${
        stats.applications_approvable === 1 ? "" : "s"
      } waiting for approval.`,
      href: "/admin/applications",
      cta: "Review",
    });
  }

  const { count: unnotified } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .is("login_email_sent_at", null)
    .eq("status", "active");

  if ((unnotified ?? 0) > 0) {
    attention.push({
      tone: "warn",
      text: `${unnotified} student${unnotified === 1 ? " has" : "s have"} an account but were never sent login details.`,
      href: "/admin/students",
      cta: "Resend",
    });
  }

  const { data: overdue } = await supabase
    .from("admin_outstanding_payments")
    .select("payment_id, days_overdue")
    .gt("days_overdue", 0);

  if (overdue && overdue.length > 0) {
    attention.push({
      tone: "warn",
      text: `${overdue.length} payment${overdue.length === 1 ? " is" : "s are"} overdue.`,
      href: "/admin/payments",
      cta: "Chase",
    });
  }

  // A live term course with no batch cannot accept an approval.
  const { data: liveCourses } = await supabase
    .from("courses")
    .select("slug, title, type")
    .eq("status", "live")
    .eq("type", "term");

  const { data: batches } = await supabase.from("batches").select("course_slug, status");

  const orphaned = (liveCourses ?? []).filter(
    (c) => !(batches ?? []).some((b) => b.course_slug === c.slug && b.status !== "cancelled")
  );

  if (orphaned.length > 0) {
    attention.push({
      tone: "warn",
      text: `${orphaned.map((c) => c.title).join(", ")} ${
        orphaned.length === 1 ? "is" : "are"
      } live but ${orphaned.length === 1 ? "has" : "have"} no batch — applications can't be approved.`,
      href: "/admin/batches",
      cta: "Create batch",
    });
  }

  const noData =
    (stats?.applications_pending ?? 0) === 0 &&
    (stats?.students_active ?? 0) === 0 &&
    (stats?.summer_students ?? 0) === 0;

  return (
    <>
      <header className="admin-head">
        <div>
          <h1>Dashboard</h1>
          <p>Here&apos;s where KIT stands today.</p>
        </div>
      </header>

      {noData && (
        <div className="admin-empty admin-empty-hero">
          <h2>Nothing has come through yet</h2>
          <p>
            No applications, students, or summer enrolments so far. The numbers
            below are real — they&apos;re just zero. Start by setting up the
            summer cohort so the public site has dates to show.
          </p>
          <Link className="af-submit admin-inline-btn" href="/admin/summer">
            Set up summer
          </Link>
        </div>
      )}

      <section className="admin-stat-grid">
        <Stat
          label="Pending applications"
          value={stats?.applications_pending ?? 0}
          empty="None yet"
          accent="blue"
        />
        <Stat
          label="Ready to approve"
          value={stats?.applications_approvable ?? 0}
          empty="None waiting"
          accent="green"
          hint="Paid and awaiting a decision"
        />
        <Stat
          label="Active students"
          value={stats?.students_active ?? 0}
          empty="None enrolled"
          accent="purple"
        />
        <Stat
          label="Summer students"
          value={stats?.summer_students ?? 0}
          empty="Roster empty"
          accent="amber"
          hint={stats?.summer_week ? `Week ${stats.summer_week}` : undefined}
        />
        <Stat
          label="Revenue received"
          value={naira(stats?.revenue_naira)}
          accent="green"
          hint={
            (stats?.outstanding_naira ?? 0) > 0
              ? `${naira(stats.outstanding_naira)} outstanding`
              : undefined
          }
        />
      </section>

      <section className="admin-secondary-grid">
        <MiniStat label="Active batches" value={stats?.batches_active ?? 0} />
        <MiniStat label="Active teachers" value={stats?.teachers_active ?? 0} />
        <MiniStat label="Completed students" value={stats?.students_completed ?? 0} />
        <MiniStat
          label="Outstanding"
          value={naira(stats?.outstanding_naira)}
        />
      </section>

      <div className="admin-split">
        <section className="admin-card">
          <div className="admin-card-head">
            <h2>Needs attention</h2>
          </div>

          {attention.length === 0 ? (
            <div className="admin-empty">
              <p>Nothing needs attention right now.</p>
            </div>
          ) : (
            <ul className="admin-attention">
              {attention.map((a, i) => (
                <li key={i} className={`admin-attention-item tone-${a.tone}`}>
                  <span className="admin-attention-dot" />
                  <p>{a.text}</p>
                  <Link href={a.href}>{a.cta}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-card">
          <div className="admin-card-head">
            <h2>Recent applications</h2>
            {recent && recent.length > 0 && (
              <Link className="admin-card-link" href="/admin/applications">
                View all
              </Link>
            )}
          </div>

          {!recent || recent.length === 0 ? (
            <div className="admin-empty">
              <p>No applications yet.</p>
              <em>The form is live at /apply.</em>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Programme</th>
                  <th>Amount</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.student_name}</strong>
                      <em>
                        {new Date(r.created_at).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                        })}
                      </em>
                    </td>
                    <td>{r.course_title}</td>
                    <td>{naira(r.amount_due_naira)}</td>
                    <td>
                      <span className={`admin-pill pay-${r.payment_status}`}>
                        {r.payment_status === "paid" ? "Paid" : "Unpaid"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  empty,
  hint,
  accent,
}: {
  label: string;
  value: number | string;
  empty?: string;
  hint?: string;
  accent: "blue" | "green" | "purple" | "amber";
}) {
  const isZero = value === 0;
  return (
    <div className={`admin-stat acc-${accent}`}>
      <p className="admin-stat-label">{label}</p>
      <strong className={`admin-stat-value ${isZero ? "zero" : ""}`}>{value}</strong>
      {isZero && empty ? (
        <em className="admin-stat-hint">{empty}</em>
      ) : hint ? (
        <em className="admin-stat-hint">{hint}</em>
      ) : null}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="admin-ministat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
