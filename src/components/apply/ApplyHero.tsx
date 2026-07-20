import Image from "next/image";

/* ────────────────────────────────────────────────────────────
   EDIT THE THREE HERO TILES HERE.
   accent: "teal" | "purple" | "amber"  (icon tint + tile bg)
   icon:   "hands" | "projects" | "mentors"  (see TileIcon below)
   ──────────────────────────────────────────────────────────── */
type Tile = {
  key: string;
  accent: "teal" | "purple" | "amber";
  icon: "hands" | "projects" | "mentors";
  label: string;
};

const tiles: Tile[] = [
  { key: "hands", accent: "teal", icon: "hands", label: "Hands-on learning" },
  { key: "projects", accent: "purple", icon: "projects", label: "Real projects" },
  { key: "mentors", accent: "amber", icon: "mentors", label: "Expert mentors" },
];

function TileIcon({ name }: { name: Tile["icon"] }) {
  const c = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "hands":
      return (
        <svg {...c}>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M9 3h6v3H9z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case "projects":
      return (
        <svg {...c}>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    case "mentors":
      return (
        <svg {...c}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" />
          <path d="M16 4.6a3.2 3.2 0 010 6M22 20c0-2.4-1.6-4.3-4-4.8" />
        </svg>
      );
  }
}

export default function ApplyHero() {
  return (
    <section className="apply-hero">
      <div className="wrap apply-hero-in">
        <div className="apply-hero-copy">
          <span className="eyebrow apply-eyebrow">Apply to KIT</span>
          <h1>
            Take the first step toward <em className="hl-blue">their</em>{" "}
            <em className="hl-teal">future.</em>
          </h1>
          <p className="apply-hero-body">
            Join the kids (10–16) who are learning, building, and creating with
            real digital skills.
          </p>

          <div className="apply-tiles">
            {tiles.map((t) => (
              <div key={t.key} className={`apply-tile tile-${t.accent}`}>
                <div className="apply-tile-icon">
                  <TileIcon name={t.icon} />
                </div>
                <span>{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="apply-hero-art">
          <div className="apply-hero-img">
            <Image
              src="/applyHeroImage.webp"
              alt="A parent and child speaking with a KIT mentor at the front desk"
              width={1200}
              height={900}
              priority
              sizes="(max-width:900px) 100vw, 560px"
              style={{ width: "100%", height: "auto" }}
            />
          </div>

          {/* <div className="apply-stat">
            <div className="apply-stat-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="8" r="3.2" />
                <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" />
                <path d="M16 4.6a3.2 3.2 0 010 6M22 20c0-2.4-1.6-4.3-4-4.8" />
              </svg>
            </div>
            <div className="apply-stat-num">50+</div>
            <div className="apply-stat-label">Students already signed up</div>
          </div> */}
        </div>
      </div>
    </section>
  );
}
