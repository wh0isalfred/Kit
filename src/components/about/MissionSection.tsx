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
    title: "Teach",
    desc: "We teach practical skills through live classes and real projects.",
  },
  {
    key: "empower",
    icon: "empower",
    title: "Empower",
    desc: "We empower kids to believe in themselves and their ideas.",
  },
  {
    key: "inspire",
    icon: "inspire",
    title: "Inspire",
    desc: "We inspire creativity, curiosity, and the courage to build what's next.",
  },
  {
    key: "guide",
    icon: "guide",
    title: "Guide",
    desc: "We guide every student with care, mentorship, and a clear path.",
  },
];

function MissionIcon({ name }: { name: Mission["icon"] }) {
  switch (name) {
    case "teach":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L3 8v2h18V8L12 2zm0 3l5 3v7H7v-7l5-3zm-5 13h10v2H7z" />
        </svg>
      );
    case "empower":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
        </svg>
      );
    case "inspire":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M13.5 0v7h8L5.5 24H0L13.5 0z" />
        </svg>
      );
    case "guide":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
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
            <span className="eyebrow mission-eyebrow">OUR MISSION</span>
            <h2>
              To equip young minds with real digital skills through{" "}
              <span className="blue">hands-on learning,</span>{" "}
              <span className="green">mentorship,</span> and{" "}
              <span className="purple">projects</span>
              that matter.
            </h2>
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
