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
    desc: "We teach practical skills through live classes and real projects. Coding and real-world problem-solving.",
  },
  {
    key: "empower",
    icon: "empower",
    title: "Empower",
    desc: "We empower kids to believe in themselves and their ideas. Confidence and courage.",
  },
  {
    key: "inspire",
    icon: "inspire",
    title: "Inspire",
    desc: "We inspire creativity, curiosity and the courage to innovate and lead change.",
  },
  {
    key: "guide",
    icon: "guide",
    title: "Guide",
    desc: "We guide every student with care, mentorship, and a clear path.",
  },
];

function MissionIcon({ name }: { name: Mission["icon"] }) {
  const c = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "teach":
      return <svg {...c}><circle cx="12" cy="12" r="9" /><path d="M12 8v4m0 4h.01" /></svg>;
    case "empower":
      return <svg {...c}><path d="M12 2l3.09 6.26L21 9.27l-6 5.14 1.18 6.88L12 17.77l-5.18 3.52L8 14.14 2 9.27l7.91-1.01z" /></svg>;
    case "inspire":
      return <svg {...c}><path d="M12 2l2.5 6.5L21 10l-6.5 2.5L12 19l-2.5-6.5L3 10l6.5-2.5z" /></svg>;
    case "guide":
      return <svg {...c}><path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z" /><path d="M12 6v6l4 2" /></svg>;
  }
}

export default function MissionSection() {
  return (
    <section className="mission">
      <div className="wrap">
        <div className="mission-in">
          <span className="eyebrow mission-eyebrow">OUR MISSION</span>
          <h2>
            To equip young minds with real digital skills through{" "}
            <em>
              hands-on learning,
              <br />
              mentorship, and projects
            </em>
            {" "}that matter.
          </h2>

          <div className="mission-grid">
            {missions.map((m) => (
              <div key={m.key} className={`mission-card card-${m.key}`}>
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
