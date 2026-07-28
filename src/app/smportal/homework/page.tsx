import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSummerSession } from "../../summer/summer-session";
import Footer from "@/components/site/Footer";

export const dynamic = "force-dynamic";

type HomeworkStatus = "assigned" | "turned_in" | "returned";

type HomeworkRow = {
  id: string;
  week: number;
  title: string;
  status: HomeworkStatus;
};

export default async function HomeworkIndexPage() {
  const session = await getSummerSession();
  if (!session) redirect("/summer");

  const supabase = await createClient();

  // get_summer_resources gives us every published resource up to the
  // current week, including its own submitted_at — but not full status
  // (it can't tell "turned_in" apart from "returned", since it doesn't
  // join in feedback/returned_at). get_my_submissions (0024) fills that
  // gap: it returns THIS student's real status per resource_id, which is
  // what actually distinguishes "returned" from "turned_in" for the pill.
  const [{ data: resources, error: resourcesError }, { data: submissions, error: subsError }] =
    await Promise.all([
      supabase.rpc("get_summer_resources", {
        p_cohort_year: session.year,
        p_summer_student_id: session.sid,
      }),
      supabase.rpc("get_my_submissions", {
        p_summer_student_id: session.sid,
      }),
    ]);

  if (resourcesError) console.error("HomeworkIndexPage resources:", resourcesError.message);
  if (subsError) console.error("HomeworkIndexPage submissions:", subsError.message);

  const statusByResource = new Map<string, HomeworkStatus>();
  for (const s of submissions ?? []) {
    statusByResource.set(s.resource_id, (s.status as HomeworkStatus) ?? "turned_in");
  }

  const homework: HomeworkRow[] = (resources ?? [])
    .filter((r) => r.kind === "homework" && r.submission_type !== null)
    .map((r) => ({
      id: r.id,
      week: r.week,
      title: r.title,
      status: statusByResource.get(r.id) ?? "assigned",
    }));

  // Group by week, preserving the week-desc ordering get_summer_resources
  // already returns — most recent week first, same convention as the main
  // portal's resource groups.
  const byWeek = new Map<number, HomeworkRow[]>();
  for (const h of homework) {
    const arr = byWeek.get(h.week) ?? [];
    arr.push(h);
    byWeek.set(h.week, arr);
  }
  const weekGroups = Array.from(byWeek.entries()).sort((a, b) => b[0] - a[0]);

  const stats = {
    total: homework.length,
    assigned: homework.filter((h) => h.status === "assigned").length,
    turnedIn: homework.filter((h) => h.status === "turned_in").length,
    returned: homework.filter((h) => h.status === "returned").length,
  };

  return (
    <div className="smp">
      <div className="wrap">
        <header className="smpr-top">
          <a href="/smportal" className="smp-home" aria-label="Back to portal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            KIT
          </a>
          <div className="smpr-title">
            <h1>Homework</h1>
            <p>Everything assigned so far, across every week.</p>
          </div>
        </header>

        {stats.total > 0 && (
          <div className="smpr-stats">
            <div className="smpr-stat">
              <span className="smp-res-icon blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4z" /><path d="M4 9h16" /></svg>
              </span>
              <div>
                <div className="smpr-stat-num">{stats.total}</div>
                <div className="smpr-stat-label">Total assigned</div>
              </div>
            </div>
            <div className="smpr-stat">
              <span className="smp-res-icon gray">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
              </span>
              <div>
                <div className="smpr-stat-num">{stats.assigned}</div>
                <div className="smpr-stat-label">Not turned in</div>
              </div>
            </div>
            <div className="smpr-stat">
              <span className="smp-res-icon blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              </span>
              <div>
                <div className="smpr-stat-num">{stats.turnedIn}</div>
                <div className="smpr-stat-label">Turned in</div>
              </div>
            </div>
            <div className="smpr-stat">
              <span className="smp-res-icon green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.19-9.19a3.5 3.5 0 014.95 4.95l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /></svg>
              </span>
              <div>
                <div className="smpr-stat-num">{stats.returned}</div>
                <div className="smpr-stat-label">Returned</div>
              </div>
            </div>
          </div>
        )}

        {weekGroups.length === 0 ? (
          <div className="smp-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 5a2 2 0 012-2h5v18H6a2 2 0 01-2-2V5z" />
              <path d="M20 5a2 2 0 00-2-2h-5v18h5a2 2 0 002-2V5z" />
            </svg>
            <p>No homework assigned yet.</p>
            <em>Check back after your first class!</em>
          </div>
        ) : (
          weekGroups.map(([week, items]) => (
            <div key={week} style={{ marginBottom: 24 }}>
              <div className="smp-week-label">Week {week}</div>
              <div className="hw-list">
                {items.map((h) => (
                  <a key={h.id} href={`/smportal/homework/${h.id}`} className="hw-list-row">
                    <span className="hw-list-title">{h.title}</span>
                    <span className={`smp-hw-pill smp-hw-pill-${h.status}`}>
                      {h.status === "returned" ? "Returned" : h.status === "turned_in" ? "Turned in" : "Assigned"}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      <Footer />
    </div>
  );
}
