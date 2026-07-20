/* ────────────────────────────────────────────────────────────
   STATIC — server component, same data-array pattern as
   ApplyHero / ApplySidebar.
   ──────────────────────────────────────────────────────────── */
type Accent = "teal" | "purple" | "amber";

type Badge = {
  key: string;
  accent: Accent;
  icon: "shield" | "mail" | "people";
  line1: string;
  line2: string;
};

const badges: Badge[] = [
  { key: "secure", accent: "teal", icon: "shield", line1: "Secure", line2: "Data Protection" },
  { key: "nospam", accent: "purple", icon: "mail", line1: "No Spam", line2: "Promise" },
  { key: "trusted", accent: "amber", icon: "people", line1: "Trusted by", line2: "Parents" },
];

function BadgeIcon({ name }: { name: Badge["icon"] }) {
  const c = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "shield":
      return (
        <svg {...c}>
          <path d="M12 3l7 3v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case "mail":
      return (
        <svg {...c}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 6l9 7 9-7" />
          <path d="M4.5 3.5l15 17" />
        </svg>
      );
    case "people":
      return (
        <svg {...c}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" />
          <path d="M16 4.6a3.2 3.2 0 010 6M22 20c0-2.4-1.6-4.3-4-4.8" />
        </svg>
      );
  }
}

export default function TrustBar() {
  return (
    <section className="trust-bar">
      <div className="wrap trust-bar-in">
        <div className="trust-main">
          <div className="trust-icon">
            <svg className="trust-shield" viewBox="0 0 100 100" fill="none">
              <path
                d="M50 6 L86 20 V46 C86 68 70 84 50 92 C30 84 14 68 14 46 V20 Z"
                fill="#e1f5ee"
                stroke="#1d9e75"
                strokeWidth="3"
              />
              <rect x="38" y="46" width="24" height="20" rx="4" fill="#f4b740" />
              <path
                d="M42 46v-8a8 8 0 0116 0v8"
                fill="none"
                stroke="#f4b740"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="50" cy="55" r="3" fill="#fff" />
              <circle cx="78" cy="78" r="14" fill="#25B290" stroke="#fff" strokeWidth="4" />
              <path
                d="M72 78l4 4 8-8"
                stroke="#fff"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M89 10l1.6 4.4L95 16l-4.4 1.6L89 22l-1.6-4.4L83 16l4.4-1.6z"
                fill="none"
                stroke="#25B290"
                strokeWidth="2"
              />
              <path
                d="M78 6l1 2.6L81.6 10 79 11l-1 2.6-1-2.6L74.4 10 77 8.6z"
                fill="none"
                stroke="#25B290"
                strokeWidth="1.6"
              />
            </svg>
          </div>

          <div className="trust-copy">
            <h3>Safe. Secure. Trusted.</h3>
            <p>
              Your child&apos;s safety and privacy are our top priority. We never
              share personal information.
            </p>
          </div>
        </div>

        <div className="trust-badges">
          {badges.map((b) => (
            <div key={b.key} className="trust-badge">
              <div className={`trust-badge-icon accent-${b.accent}`}>
                <BadgeIcon name={b.icon} />
              </div>
              <span>
                {b.line1}
                <br />
                {b.line2}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
