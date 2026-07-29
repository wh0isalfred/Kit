type Mission = {
  key: string;
  icon: "teach" | "empower" | "inspire" | "guide";
  title: string;
  desc: string;
};

const missions: Mission[] = [
  {
    key: "teach",
    icon: "teach",
    title: "Live Online Classes",
    desc: "Interactive. Engaging. Real-time.",
  },
  {
    key: "empower",
    icon: "empower",
    title: "Real Projects",
    desc: "Build. Create. Showcase.",
  },
  {
    key: "inspire",
    icon: "inspire",
    title: "Expert Mentors",
    desc: "Guide. Support. Inspire.",
  },
  {
    key: "guide",
    icon: "guide",
    title: "Confidence for Life",
    desc: "Skills today. Opportunities tomorrow.",
  },
];

function MissionIcon({ name }: { name: Mission["icon"] }) {
  switch (name) {
    case "teach":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="2" y1="17" x2="22" y2="17" />
        </svg>
      );
    case "empower":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L3 8v2h18V8L12 2zm0 3l5 3v7H7v-7l5-3z" />
        </svg>
      );
    case "inspire":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" y1="9" x2="9" y2="9.01" />
          <line x1="15" y1="9" x2="15" y2="9.01" />
        </svg>
      );
    case "guide":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      );
  }
}

export default function MissionSection() {
  return (
    <section className="mission">
      <div className="wrap">
        <div className="mission-in">
          {/* Left: Mission Statement */}
          <div className="mission-left">
            <span className="eyebrow mission-eyebrow">OUR APPROACH</span>
            <h2>
              We don't just teach<br />
              <span className="green">technology.</span><br />
              We prepare children<br />
              <span className="green">for what's next.</span>
            </h2>

            <div className="mission-points">
              <div className="mission-point">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="point-icon">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M3 12h18" />
                </svg>
                <span>Our goal isn't to turn every child into a programmer. It's to help them think critically, create confidently, and solve real problems using the tools that are shaping every industry.</span>
              </div>

              <div className="mission-point">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="point-icon">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                </svg>
                <span>That's why every KIT class is hands-on. Students don't just watch lessons—they build websites, design graphics, explore AI, and complete projects they can proudly show off.</span>
              </div>

              <div className="mission-point">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="point-icon">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>Because we believe the best way to prepare children for the future is to give them the confidence to start building it today.</span>
              </div>
            </div>
          </div>

          {/* Right: 4 Mission Pillars */}
          <div className="mission-right">
            {missions.map((m) => (
              <div key={m.key} className={`mission-pill pill-${m.key}`}>
                <div className="mission-icon">
                  <MissionIcon name={m.icon} />
                </div>
                <h3>{m.title}</h3>
                <p>{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
