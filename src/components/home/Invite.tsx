import Link from "next/link";
import Reveal from "@/components/site/Reveal";

export default function Invite() {
  return (
    <section className="invite">
      <div className="wrap">
        <div className="invite-in">
          <Reveal className="inner">
            <span className="eyebrow">Admissions open</span>
            <h2>Begin at KIT.</h2>
            <p>
              Apply for your child today, and we&apos;ll guide you from there —
              one student, one teacher, one real beginning.
            </p>
            <Link className="btn btn-primary" href="/apply">
              Apply to KIT
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}