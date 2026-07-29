import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSummerSession } from "../../summer/summer-session";
// import Footer from "@/components/site/Footer";

export const dynamic = "force-dynamic";

type HomeworkListItem = {
  id: string;
  week: number;
  day_number: number | null;
  title: string;
  status: "assigned" | "turned_in" | "returned";
};

export default async function HomeworkListPage() {
  const session = await getSummerSession();
  if (!session) redirect("/summer");

  const supabase = await createClient();

  const [{ data: resources, error: resourcesError }, { data: submissions }] = await Promise.all([
    supabase.rpc("get_summer_resources", {
      p_cohort_year: session.year,
      p_summer_student_id: session.sid,
    }),
    supabase.rpc("get_my_submissions", {
      p_summer_student_id: session.sid,
    }),
  ]);

  if (resourcesError) {
    console.error("HomeworkListPage get_summer_resources:", resourcesError.message);
  }

  const statusByResource = new Map<string, { status: string }>();
  (submissions ?? []).forEach((s: { resource_id: string; status: string }) => {
    statusByResource.set(s.resource_id, s);
  });

  interface Resource {
    id: string;
    kind: string;
    week: number;
    day_number: number | null;
    title: string;
    submission_type: "link" | "file" | null;
  }

  const items: HomeworkListItem[] = (resources ?? [])
    .filter((r: Resource) => r.kind === "homework" && r.submission_type !== null)
    .map((r: Resource) => ({
      id: r.id,
      week: r.week,
      day_number: r.day_number,
      title: r.title,
      status: (statusByResource.get(r.id)?.status as "turned_in" | "returned" | undefined) ?? "assigned",
    }))
    .sort((a, b) => (a.week !== b.week ? a.week - b.week : (a.day_number ?? 99) - (b.day_number ?? 99)));

  return (
    <div className="page">
      <section className="hw-list-hero">
        <div className="wrap">
          <a href="/smportal" className="smp-home" aria-label="Back to Portal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Portal
          </a>
          <h1>Homework</h1>
        </div>
      </section>

      <section className="wrap">
        {items.length === 0 ? (
          <p className="hw-list-empty">No homework assigned yet — check back once your class starts.</p>
        ) : (
          <div className="hw-list">
            {items.map((item) => (
              <a key={item.id} href={`/smportal/homework/${item.id}`} className="hw-list-row">
                <span className="hw-list-week">
                  Week {item.week}{item.day_number != null && ` · Day ${item.day_number}`}
                </span>
                <span className="hw-list-title">{item.title}</span>
                <span className={`smp-hw-pill smp-hw-pill-${item.status}`}>
                  {item.status === "returned" ? "Returned" : item.status === "turned_in" ? "Turned in" : "Assigned"}
                </span>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* <Footer /> */}
    </div>
  );
}