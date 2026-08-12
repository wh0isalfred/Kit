import Link from "next/link";
import Reveal from "@/components/site/Reveal";
import {
  campMonth,
  campWeeks,
  getActiveSummerCohort,
} from "@/lib/summer";
import SummerCountdown from "./SummerCountdown";

export default async function SummerSection() {
  const cohort = await getActiveSummerCohort();
  if (!cohort) return null;

  const month = campMonth(cohort.startsOn);
  const weeks = campWeeks(cohort.startsOn, cohort.endsOn);
  const heading = cohort.label || `KIT Summer Tech Camp ${cohort.year}`;

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
          <Reveal className="summer-content">
            {month && (
              <span className="summer-badge">⚡ Happening this {month}!</span>
            )}

            <h2>
              Build Skills They'll Use for Years.{" "}
              <span className="green-text">In Just 3 Weeks.</span>
            </h2>

            {/* <p className="summer-tag">
              {dateRange
                ? `${dateRange} · Live classes. Real projects. Limitless possibilities.`
                : "Live classes. Real projects. Limitless possibilities."}
            </p> */}

            <p className="summer-description">
              Your child will learn to build websites, create professional graphics, and use AI to solve real problems, all while working on projects they can proudly show off.
            </p>

            <div className="summer-benefits">
              <span>✔ Live Online Classes</span>
              <span>✔ Real Projects</span>
              {/* <span>✔ ₦30,000 Team Challenge</span> */}
            </div>

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
              <span className="summer-seats">Applications close once seats are filled.</span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
