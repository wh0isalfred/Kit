/* ────────────────────────────────────────────────────────────
   STATIC — no state, no Supabase dependency. Matches the
   ApplyHero pattern: data arrays at the top, icons switched
   below.
   ──────────────────────────────────────────────────────────── */
import Reveal from "@/components/site/Reveal";

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

/* Real contact details — resolves Doc 1 §10.3 / §11.2. No dedicated
   domain yet, so this is a Gmail address for now; worth revisiting
   once kit.ng (or similar) exists, since a Gmail address reads as
   less trustworthy than a domain email on a paid platform. */
const contact = {
  email: "kidsintechph@gmail.com",
  // WhatsApp deep link needs international format with no leading 0:
  // 0916 979 9215 -> 234 916 979 9215 -> no spaces.
  whatsappNumber: "2349169799215",
  whatsappMessage:
    "Hi! 👋 I'm interested in enrolling my child in a KIT program. I have a few questions before completing the application. Could someone please assist me?",
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
      <Reveal as="h3" className="sidebar-title">What Happens Next?</Reveal>

      <div className="sidebar-steps reveal-group">
        {steps.map((s) => (
          <Reveal key={s.key} className={`sidebar-step accent-${s.accent}`}>
            <div className="sidebar-step-icon">
              <StepIcon name={s.icon} />
            </div>
            <div>
              <p className="sidebar-step-title">{s.title}</p>
              <p className="sidebar-step-desc">{s.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal className="sidebar-questions">
        <h4>Have Questions?</h4>
        <p>We&apos;re here to help you every step of the way.</p>

        <a className="sidebar-contact" href={`mailto:${contact.email}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 6l9 7 9-7" />
          </svg>
          {contact.email}
        </a>

        <a
          className="sidebar-contact"
          href={`https://wa.me/${contact.whatsappNumber}?text=${encodeURIComponent(contact.whatsappMessage)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
          </svg>
          Chat on WhatsApp
        </a>
      </Reveal>

      <Reveal as="p" className="sidebar-note">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21s-7.5-4.7-10-9.3C.5 8.4 2.3 5 5.7 5c2 0 3.4 1.1 4.3 2.5C10.9 6.1 12.3 5 14.3 5c3.4 0 5.2 3.4 3.7 6.7C19.5 16.3 12 21 12 21z" />
        </svg>
        We can&apos;t wait to welcome your child to KIT!
      </Reveal>
    </aside>
  );
}
