import Link from "next/link";
import {
  campMonth,
  campWeeks,
  getActiveSummerCohort,
} from "@/lib/summer";
import SummerCountdown from "./SummerCountdown";

/* ────────────────────────────────────────────────────────────
   Server component now. Everything that used to be hardcoded —
   the close date, the month, the year, the prize, the length —
   comes from the active row in `summer_cohorts`, editable from
   /admin/summer with no redeploy.

   The countdown itself stays a client component because it ticks;
   it receives dates as props and fetches nothing.

   Every dated claim degrades to silence when the data isn't set.
   A section that says "Happening this August!" with no dates
   behind it is a promise nobody has made.
   ──────────────────────────────────────────────────────────── */

export default async function SummerSection() {
  const cohort = await getActiveSummerCohort();

  // No active cohort at all — don't render a summer pitch for a
  // camp that doesn't exist.
  if (!cohort) return null;

  const month = campMonth(cohort.startsOn);
  const weeks = campWeeks(cohort.startsOn, cohort.endsOn);

  const heading = cohort.label || `KIT Summer Tech Camp ${cohort.year}`;

  // "3 Weeks · 3 Courses · 1 Competition · ₦30,000 Prize Pool"
  // Each segment appears only if it's actually known.
  const facts = [
    weeks ? `${weeks} Week${weeks === 1 ? "" : "s"}` : null,
    "3 Courses",
    "1 Competition",
    cohort.prizeNaira
      ? `₦${cohort.prizeNaira.toLocaleString("en-NG")} Prize Pool`
      : null,
  ].filter(Boolean);

  const dateRange =
    cohort.startsOn && cohort.endsOn
      ? `${new Date(cohort.startsOn).toLocaleDateString("en-NG", {
          day: "numeric",
          month: "short",
        })} – ${new Date(cohort.endsOn).toLocaleDateString("en-NG", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`
      : null;

  return (
    <section className="summer" id="summer">
      <div className="wrap">
        <div className="summer-banner">
          <div className="summer-content">
            {month && (
              <span className="summer-badge">Happening this {month}!</span>
            )}

            <h2>{heading}</h2>

            <p className="summer-stats">{facts.join(" · ")}</p>

            <p className="summer-tag">
              {dateRange
                ? `${dateRange} · Live classes. Real projects. Limitless possibilities.`
                : "Live classes. Real projects. Limitless possibilities."}
            </p>

            <SummerCountdown
              opensAt={cohort.registrationOpensAt}
              closesAt={cohort.registrationClosesAt}
            />

            <div className="summer-cta">
              <Link href="/apply" className="btn btn-glow">
                Reserve Your Spot
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
              {/* NOTE: there is no seat cap for summer anywhere in the
                  schema — no capacity column on summer_cohorts, no
                  limit in enrol_summer_student(). This line is a
                  marketing claim with nothing enforcing it. Either add
                  a capacity field and show real remaining seats, or
                  drop the line. Left as-is for now, flagged. */}
              <span className="summer-seats">Limited seats available!</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
