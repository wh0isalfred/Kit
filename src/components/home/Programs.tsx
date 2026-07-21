import Link from "next/link";
import Reveal from "@/components/site/Reveal";
import { getAllCourses, type CourseRow } from "@/lib/courses";

/* ────────────────────────────────────────────────────────────
   Live courses read from the `courses` table now — see
   src/lib/courses.ts. Accent/icon/href/cta are presentational
   choices with nowhere to live in the schema, so they're mapped
   here, keyed by the course's `code`. Adding a course still means
   one database insert (Doc 1 §12.3); it just also needs one line
   added to `presentation` below so it renders with the right
   colour/icon instead of falling back to the default.
   ──────────────────────────────────────────────────────────── */

type Accent = "blue" | "green" | "purple" | "amber";
type IconName = "web" | "ai" | "python" | "game" | "summer";

const presentation: Record<
  string,
  { accent: Accent; icon: IconName; badge?: string; fallbackDescription: string }
> = {
  WD: {
    accent: "blue",
    icon: "web",
    fallbackDescription:
      "Build websites and web apps from scratch. Learn HTML, CSS, JavaScript and more.",
  },
  AI: {
    accent: "purple",
    icon: "ai",
    fallbackDescription:
      "Learn how AI actually works and how to use it responsibly — from prompt engineering to building your first AI-powered project.",
  },
  PY: {
    accent: "green",
    icon: "python",
    fallbackDescription:
      "Master Python and solve real problems with code. Perfect for beginners.",
  },
  GD: {
    accent: "purple",
    icon: "game",
    fallbackDescription:
      "Create immersive 3D games and bring your ideas to life using industry tools.",
  },
  SM: {
    accent: "amber",
    icon: "summer",
    badge: "Popular",
    fallbackDescription:
      "A fast, fun and intensive program covering 3 in-demand skills with a final competition.",
  },
};

const defaultPresentation = {
  accent: "blue" as Accent,
  icon: "web" as IconName,
  fallbackDescription: "",
};

function durationLabel(type: CourseRow["type"]) {
  return type === "summer" ? "3-Week Camp" : "12-Week Academy";
}

function hrefFor(course: CourseRow) {
  return course.type === "summer" ? "/summer" : `/programs/${course.slug}`;
}

function ctaFor(course: CourseRow) {
  return course.type === "summer" ? "Join Summer Camp" : "Learn More";
}

function ProgramIcon({ name }: { name: IconName }) {
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
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="15" rx="2" />
          <path d="M3 9h18" />
          <circle cx="6" cy="6.5" r=".4" fill="currentColor" />
          <circle cx="8" cy="6.5" r=".4" fill="currentColor" />
        </svg>
      );
    case "ai":
      return (
        <svg {...common}>
          <rect x="7" y="7" width="10" height="10" rx="2" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" />
        </svg>
      );
    case "python":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M7 9l3 3-3 3M13 15h4" />
        </svg>
      );
    case "game":
      return (
        <svg {...common}>
          <rect x="2" y="7" width="20" height="10" rx="4" />
          <path d="M6 11v2M5 12h2" />
          <circle cx="16" cy="11.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="18.5" cy="13" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "summer":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5" />
        </svg>
      );
  }
}

const arrow = (
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
);

export default async function Programs() {
  const courses = await getAllCourses();
  const live = courses.filter((c) => c.status === "live");
  const comingSoon = courses.filter((c) => c.status === "coming_soon");

  return (
    <section className="programs" id="programs">
      <div className="wrap">
        <Reveal className="p-head">
          <h2>Our Programs</h2>
          <p>Choose a path. Build your future.</p>
        </Reveal>

        <div className="prog-grid">
          {live.map((course) => {
            const p = presentation[course.code] ?? defaultPresentation;
            return (
              <Reveal key={course.slug} className={`prog-card acc-${p.accent}`}>
                {p.badge && <span className="prog-badge">{p.badge}</span>}
                <div className="prog-icon">
                  <ProgramIcon name={p.icon} />
                </div>
                <h3>{course.title}</h3>
                <div className="prog-dur">({durationLabel(course.type)})</div>
                <p className="desc">{course.description || p.fallbackDescription}</p>
                <Link className="prog-more" href={hrefFor(course)}>
                  {ctaFor(course)} {arrow}
                </Link>
              </Reveal>
            );
          })}
        </div>

        {comingSoon.length > 0 && (
          <div className="prog-soon">
            <span className="prog-soon-label">Coming soon</span>
            <div className="prog-soon-row">
              {comingSoon.map((course) => (
                <span key={course.slug} className="prog-soon-pill">
                  {course.title}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
