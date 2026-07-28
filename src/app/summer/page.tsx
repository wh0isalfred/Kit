import Link from "next/link";
import { redirect } from "next/navigation";
import {
  campMonth,
  campWeeks,
  getActiveSummerCohort,
} from "@/lib/summer";
import { getSummerSession } from "./summer-session";
import SummerSignIn from "./SummerSignIn";

export const dynamic = "force-dynamic";

/**
 * /summer — the public face of the camp. Two audiences:
 *   · a parent deciding whether to sign up (marketing + Apply)
 *   · an enrolled kid signing in with their Summer ID
 *
 * If they already hold a valid session, skip straight to the portal.
 */
export default async function SummerPage() {
  const session = await getSummerSession();
  if (session) redirect("/smportal");

  const cohort = await getActiveSummerCohort();

  const month = cohort ? campMonth(cohort.startsOn) : null;
  const weeks = cohort ? campWeeks(cohort.startsOn, cohort.endsOn) : null;
  const heading = cohort?.label ?? "KIT Summer Tech Camp";

  return (
    <main className="sm">
      <div className="wrap">
        <a href="/" className="smp-home" aria-label="Back to KIT home">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          KIT
        </a>

        <section className="sm-hero">
          <div className="sm-hero-copy">
            {month && <span className="summer-badge">Happening this {month}!</span>}
            <h1>{heading}</h1>
            <p className="sm-lede">
              Three weeks of live classes, real projects, and a final build
              competition. Kids learn to design, code, and create — and walk away
              having actually built something.
            </p>

            <ul className="sm-facts">
              {weeks && <li>{weeks} weeks of live classes</li>}
              <li>3 in-demand skills</li>
              <li>A final team competition</li>
            </ul>

            <div className="sm-cta-row">
              <Link href="/apply" className="btn btn-glow">
                Apply now
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
          </div>

          <div className="sm-hero-signin">
            <SummerSignIn />
          </div>
        </section>
      </div>
    </main>
  );
}
