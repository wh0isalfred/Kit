import Link from "next/link";
import Reveal from "@/components/site/Reveal";

/* Edit the four points here — same idea as the programs array.
   accent: "green" | "blue" | "purple" | "teal"
   icon:   "shield" | "code" | "users" | "rocket" (see FeatureIcon) */
type Feature = {
  key: string;
  accent: "green" | "blue" | "purple" | "teal";
  icon: "shield" | "code" | "users" | "rocket";
  title: string;
  desc: string;
};

const features: Feature[] = [
  { key: "skills", accent: "green", icon: "shield", title: "Future-Ready Skills",
    desc: "We teach in-demand skills that open doors to endless possibilities." },
  { key: "handson", accent: "blue", icon: "code", title: "Hands-On Learning",
    desc: "Students learn by building real projects from day one." },
  { key: "mentor", accent: "purple", icon: "users", title: "Mentorship & Support",
    desc: "Small classes, real mentors, and support every step of the way." },
  { key: "confidence", accent: "teal", icon: "rocket", title: "Confidence for Life",
    desc: "Kids gain the confidence to create, lead, and make an impact." },
];

function FeatureIcon({ name }: { name: Feature["icon"] }) {
  const c = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "shield":
      return <svg {...c}><path d="M12 3l7 3v5c0 4.4-3 7.6-7 8.8C8 18.6 5 15.4 5 11V6z" /><path d="M9 12l2 2 4-4" /></svg>;
    case "code":
      return <svg {...c}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>;
    case "users":
      return <svg {...c}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" /><path d="M16 4.6a3.2 3.2 0 010 6M22 20c0-2.4-1.6-4.3-4-4.8" /></svg>;
    case "rocket":
      return <svg {...c}><path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2c.8-.8.8-2 0-3s-2.2-.8-3 0z" /><path d="M9 12c6-8 11-8 11-8s0 5-8 11l-3-3z" /><circle cx="15" cy="9" r="1.3" /></svg>;
  }
}

export default function WhyKit() {
  return (
    <section className="why" id="why">
      <div className="wrap">
        <div className="why-grid">
          <Reveal className="why-intro">
            <span className="eyebrow">Why KIT?</span>
            <h2>We don&apos;t just teach tech. We prepare for life.</h2>
            <p>
              Our programs go beyond the basics. Students build, create, and
              solve real problems while discovering their potential — with the
              support of great teachers and a community that believes in them.
            </p>
            <Link className="why-learn" href="/about">
              Learn More About KIT
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
          </Reveal>

          <div className="why-features">
            {features.map((f) => (
              <Reveal key={f.key} className={`why-feat wf-${f.accent}`}>
                <div className="fi"><FeatureIcon name={f.icon} /></div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}