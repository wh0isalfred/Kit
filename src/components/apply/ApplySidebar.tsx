/* ────────────────────────────────────────────────────────────
   STATIC — no state, no Supabase dependency. Matches the
   ApplyHero pattern: data arrays at the top, icons switched
   below.
   ──────────────────────────────────────────────────────────── */
type Accent = "teal" | "blue" | "purple";

type Step = {
  key: string;
  accent: Accent;
  icon: "review" | "call" | "start";
  title: string;
  desc: string;
};

const steps: Step[] = [
  {
    key: "review",
    accent: "teal",
    icon: "review",
    title: "1. We Review Your Application",
    desc: "Our team will review your application and get in touch.",
  },
  {
    key: "call",
    accent: "blue",
    icon: "call",
    title: "2. You Get a Call",
    desc: "We'll schedule a quick call to understand your child's goals.",
  },
  {
    key: "start",
    accent: "purple",
    icon: "start",
    title: "3. Start Their Journey",
    desc: "Once enrolled, your child will begin their learning adventure with KIT!",
  },
];

/* TODO(Ade): replace with the real KIT PH support inbox/number —
   these are placeholders carried over from the reference design. */
const contact = {
  email: "hello@kidsintech.africa",
  phone: "+234 802 123 4567",
};

function StepIcon({ name }: { name: Step["icon"] }) {
  const c = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "review":
      return (
        <svg {...c}>
          <rect x="6" y="4" width="12" height="17" rx="2" />
          <path d="M9 4h6v3H9z" />
          <path d="M9 12.5l2 2 4-4" />
        </svg>
      );
    case "call":
      return (
        <svg {...c}>
          <rect x="4" y="5" width="16" height="15" rx="2.5" />
          <path d="M4 9.5h16" />
          <path d="M8 3v4M16 3v4" />
        </svg>
      );
    case "start":
      return (
        <svg {...c}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" />
          <path d="M16 4.6a3.2 3.2 0 010 6M22 20c0-2.4-1.6-4.3-4-4.8" />
        </svg>
      );
  }
}

export default function ApplySidebar() {
  return (
    <aside className="apply-sidebar">
      <h3 className="sidebar-title">What Happens Next?</h3>

      <div className="sidebar-steps">
        {steps.map((s) => (
          <div key={s.key} className={`sidebar-step accent-${s.accent}`}>
            <div className="sidebar-step-icon">
              <StepIcon name={s.icon} />
            </div>
            <div>
              <p className="sidebar-step-title">{s.title}</p>
              <p className="sidebar-step-desc">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="sidebar-questions">
        <h4>Have Questions?</h4>
        <p>We&apos;re here to help you every step of the way.</p>

        <a className="sidebar-contact" href={`mailto:${contact.email}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 6l9 7 9-7" />
          </svg>
          {contact.email}
        </a>

        <a className="sidebar-contact" href={`tel:${contact.phone.replace(/\s/g, "")}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v2a2 2 0 01-2.18 2 19.72 19.72 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.72 19.72 0 012 3.18 2 2 0 014 1h2a2 2 0 012 1.72c.12.9.34 1.77.65 2.6a2 2 0 01-.45 2.11L7 8.91a16 16 0 006 6l1.58-1.2a2 2 0 012.11-.45c.83.31 1.7.53 2.6.65A2 2 0 0122 16.92z" />
          </svg>
          {contact.phone}
        </a>
      </div>

      <p className="sidebar-note">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21s-7.5-4.7-10-9.3C.5 8.4 2.3 5 5.7 5c2 0 3.4 1.1 4.3 2.5C10.9 6.1 12.3 5 14.3 5c3.4 0 5.2 3.4 3.7 6.7C19.5 16.3 12 21 12 21z" />
        </svg>
        We can&apos;t wait to welcome your child to KIT!
      </p>
    </aside>
  );
}
