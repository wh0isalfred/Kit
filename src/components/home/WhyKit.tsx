import Link from "next/link";
import Reveal from "@/components/site/Reveal";

/* Edit the four points here — same idea as the programs array.
   accent: "green" | "blue" | "purple" | "teal"
   icon:   "bulb" | "code" | "users" | "rocket" (see FeatureIcon) */
type Feature = {
  key: string;
  accent: "green" | "blue" | "purple" | "teal";
  icon: "bulb" | "code" | "users" | "rocket";
  title: string;
  desc: string;
};

const features: Feature[] = [
  { key: "skills", accent: "green", icon: "bulb", title: "Real Projects",
    desc: "Students don't just watch lessons. They build websites, create graphics, and use AI from day one."},
  { key: "handson", accent: "blue", icon: "code", title: "AI for the real world",
    desc: "Learn how to use AI to research, solve problems, and think better—not simply copy answers."},
  { key: "mentor", accent: "purple", icon: "users", title: "Learn by doing",
    desc: "Every lesson ends with something your child has actually created." },
  { key: "confidence", accent: "teal", icon: "rocket", title: "Confidence that lasts",
    desc: "Present ideas, solve problems, and leave with projects they're proud to show." },
];

function FeatureIcon({ name }: { name: Feature["icon"] }) {
  const c = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "bulb":
      return <svg {...c}><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0012 3z" /></svg>;
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
        <div className="why-panel">
          <div className="why-grid">
            <Reveal className="why-intro">
              <span className="eyebrow">Why Parents choose KIT</span>
              <h2>More than just another coding class</h2>
              <p>
                 Technology is changing every career. 
                 We help children learn the skills they&apos;ll actually use, 
                 through real projects, AI, design, and web development.
              </p>
              <Link className="why-learn" href="/apply">
                Start Here
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Link>
            </Reveal>

            <div className="why-features reveal-group">
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
      </div>
    </section>
  );
}