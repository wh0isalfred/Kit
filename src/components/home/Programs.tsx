import Link from "next/link";
import Reveal from "@/components/site/Reveal";

/* ────────────────────────────────────────────────────────────
   EDIT YOUR PROGRAMS HERE.
   Add / remove / reorder objects in this array — the cards update
   automatically. Each program needs:
     accent: "blue" | "green" | "purple" | "amber"   (icon + text colour)
     icon:   "web" | "python" | "game" | "summer"    (see ProgramIcon below)
     badge:  optional little tag (e.g. "Popular") — omit to hide it
   ──────────────────────────────────────────────────────────── */
type Program = {
  slug: string;
  title: string;
  duration: string;
  description: string;
  accent: "blue" | "green" | "purple" | "amber";
  icon: "web" | "python" | "game" | "summer";
  href: string;
  cta: string;
  badge?: string;
};

const programs: Program[] = [
  {
    slug: "web-development",
    title: "Web Development",
    duration: "12-Week Academy",
    description: "Build websites and web apps from scratch. Learn HTML, CSS, JavaScript and more.",
    accent: "blue",
    icon: "web",
    href: "/programs/web-development",
    cta: "Learn More",
  },
  {
    slug: "python",
    title: "Python Programming",
    duration: "12-Week Academy",
    description: "Master Python and solve real problems with code. Perfect for beginners.",
    accent: "green",
    icon: "python",
    href: "/programs/python",
    cta: "Learn More",
  },
  {
    slug: "game-development",
    title: "3D Game Development",
    duration: "12-Week Academy",
    description: "Create immersive 3D games and bring your ideas to life using industry tools.",
    accent: "purple",
    icon: "game",
    href: "/programs/game-development",
    cta: "Learn More",
  },
  {
    slug: "summer",
    title: "Summer Tech Camp",
    duration: "3-Week Camp",
    description: "A fast, fun and intensive program covering 3 in-demand skills with a final competition.",
    accent: "amber",
    icon: "summer",
    href: "/summer",
    cta: "Join Summer Camp",
    badge: "Popular",
  },
];

function ProgramIcon({ name }: { name: Program["icon"] }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "web":
      return <svg {...common}><rect x="3" y="4" width="18" height="15" rx="2" /><path d="M3 9h18" /><circle cx="6" cy="6.5" r=".4" fill="currentColor" /><circle cx="8" cy="6.5" r=".4" fill="currentColor" /></svg>;
    case "python":
      return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9l3 3-3 3M13 15h4" /></svg>;
    case "game":
      return <svg {...common}><rect x="2" y="7" width="20" height="10" rx="4" /><path d="M6 11v2M5 12h2" /><circle cx="16" cy="11.5" r="1" fill="currentColor" stroke="none" /><circle cx="18.5" cy="13" r="1" fill="currentColor" stroke="none" /></svg>;
    case "summer":
      return <svg {...common}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5" /></svg>;
  }
}

const arrow = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function Programs() {
  return (
    <section className="programs" id="programs">
      <div className="wrap">
        <Reveal className="p-head">
          <h2>Our Programs</h2>
          <p>Choose a path. Build your future.</p>
        </Reveal>

        <div className="prog-grid">
          {programs.map((p) => (
            <Reveal key={p.slug} className={`prog-card acc-${p.accent}`}>
              {p.badge && <span className="prog-badge">{p.badge}</span>}
              <div className="prog-icon">
                <ProgramIcon name={p.icon} />
              </div>
              <h3>{p.title}</h3>
              <div className="prog-dur">({p.duration})</div>
              <p className="desc">{p.description}</p>
              <Link className="prog-more" href={p.href}>
                {p.cta} {arrow}
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}