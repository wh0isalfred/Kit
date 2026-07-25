import Link from "next/link";

export const metadata = {
  title: "Refund Policy · KIT",
  description:
    "KIT's refund policy for the three-month programmes and the Summer Tech Camp.",
};

/* Real contact details — not the mockup's placeholders. */
const CONTACT = {
  email: "kitph@gmail.com",
  phone: "+234 812 912 0553",
};

const EFFECTIVE_DATE = "21 July 2026";

type Section = {
  n: string;
  icon: IconName;
  title: string;
  intro?: string;
  bullets?: string[];
  outro?: string;
};

const sections: Section[] = [
  {
    n: "01",
    icon: "doc",
    title: "Application Fees",
    intro:
      "Any application or registration fees, where applicable, are non-refundable once your application has been submitted and processed.",
  },
  {
    n: "02",
    icon: "calendar",
    title: "Three-Month Programs",
    intro:
      "Students who enroll in a standard KIT program may request a refund under the following conditions:",
    bullets: [
      "A full refund is available if the request is made before classes begin.",
      "A 50% refund may be granted if the request is received within 7 days of the first class, provided the student has attended no more than two live sessions.",
      "No refunds will be issued after this period.",
    ],
  },
  {
    n: "03",
    icon: "sun",
    title: "Summer Tech Camp",
    intro:
      "Because the Summer Tech Camp is a short, intensive program:",
    bullets: [
      "Full refunds are available up to 7 days before the program starts.",
      "Refund requests made within 7 days of the start date may receive a 50% refund, subject to review.",
      "Once the program has started, no refunds will be issued.",
    ],
  },
  {
    n: "04",
    icon: "screen",
    title: "Missed Classes",
    intro: "Refunds are not provided for:",
    bullets: [
      "Missed live sessions",
      "Internet connectivity issues on the student's side",
      "Scheduling conflicts",
      "Failure to participate",
    ],
    outro: "Where possible, KIT may provide recordings or learning resources.",
  },
  {
    n: "05",
    icon: "alert",
    title: "Program Cancellation",
    intro:
      "If KIT cancels a program before it begins, all enrolled students will receive either:",
    bullets: ["A full refund, or", "The option to transfer their enrollment to a future session."],
  },
  {
    n: "06",
    icon: "heart",
    title: "Exceptional Circumstances",
    intro:
      "Refund requests due to medical emergencies or other exceptional situations may be reviewed individually at KIT's discretion. Supporting documentation may be required.",
  },
  {
    n: "07",
    icon: "clock",
    title: "Processing Time",
    intro:
      "Approved refunds are processed within 7–14 business days using the original payment method whenever possible.",
  },
];

const summary = [
  "Full refund before classes begin.",
  "Partial refunds may be available within the first 7 days of eligible programs.",
  "Summer Tech Camp fees become non-refundable once the program starts.",
  "Application fees are non-refundable.",
];

export default function RefundPolicyPage() {
  return (
    <main className="rp">
      <div className="wrap">
        <header className="rp-head">
          <h1>Refund Policy</h1>
          <p>
            At KIT, we are committed to providing high-quality technology
            education and a great experience for every student and family.
            Please read our refund policy carefully before enrolling.
          </p>
          <div className="rp-date">
            <CalIcon />
            Effective Date: {EFFECTIVE_DATE}
          </div>
        </header>

        <div className="rp-sections">
          {sections.map((s) => (
            <section className="rp-section" key={s.n}>
              <div className="rp-section-icon">
                <SectionIcon name={s.icon} />
              </div>
              <div className="rp-section-body">
                <div className="rp-section-title">
                  <span className="rp-num">{s.n}</span>
                  <h2>{s.title}</h2>
                </div>
                {s.intro && <p className="rp-intro">{s.intro}</p>}
                {s.bullets && (
                  <ul className="rp-bullets">
                    {s.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                )}
                {s.outro && <p className="rp-outro">{s.outro}</p>}
              </div>
            </section>
          ))}

          {/* Contact — special layout with the checklist card */}
          <section className="rp-section">
            <div className="rp-section-icon">
              <SectionIcon name="mail" />
            </div>
            <div className="rp-section-body rp-contact">
              <div>
                <div className="rp-section-title">
                  <span className="rp-num">08</span>
                  <h2>Contact Us</h2>
                </div>
                <p className="rp-intro">
                  For refund requests or questions, please contact us.
                </p>
                <a className="rp-contact-line" href={`mailto:${CONTACT.email}`}>
                  <MailIcon /> {CONTACT.email}
                </a>
                <a
                  className="rp-contact-line"
                  href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}
                >
                  <PhoneIcon /> {CONTACT.phone}
                </a>
              </div>

              <div className="rp-include">
                <p className="rp-include-label">Please include:</p>
                <ul>
                  <li>Student&apos;s full name</li>
                  <li>Parent/Guardian&apos;s name</li>
                  <li>KIT ID (if assigned)</li>
                  <li>Reason for the refund request</li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        {/* Quick summary */}
        <div className="rp-summary">
          <div className="rp-summary-shield">
            <ShieldIcon />
          </div>
          <div className="rp-summary-body">
            <h3>Quick Summary</h3>
            <div className="rp-summary-grid">
              {summary.map((item, i) => (
                <div className="rp-summary-item" key={i}>
                  <CheckIcon />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rp-back">
          <Link href="/apply" className="btn btn-glow">
            Back to application
          </Link>
        </div>
      </div>
    </main>
  );
}

/* ── Icons ────────────────────────────────────────────────── */

type IconName = "doc" | "calendar" | "sun" | "screen" | "alert" | "heart" | "clock" | "mail";

function SectionIcon({ name }: { name: IconName }) {
  const c = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "doc":
      return <svg {...c}><path d="M6 3h9l4 4v14a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg>;
    case "calendar":
      return <svg {...c}><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M4 9.5h16M8 3v4M16 3v4" /></svg>;
    case "sun":
      return <svg {...c}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5" /></svg>;
    case "screen":
      return <svg {...c}><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></svg>;
    case "alert":
      return <svg {...c}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.5" /></svg>;
    case "heart":
      return <svg {...c}><path d="M12 20s-7-4.3-9.2-8.5C1.4 8.7 3 5.5 6.2 5.5c1.9 0 3.2 1 3.8 2.3C10.6 6.5 11.9 5.5 13.8 5.5c3.2 0 4.8 3.2 3.4 6C19 15.7 12 20 12 20z" /></svg>;
    case "clock":
      return <svg {...c}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>;
    case "mail":
      return <svg {...c}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 6l9 7 9-7" /></svg>;
  }
}

const CalIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M4 9.5h16M8 3v4M16 3v4" /></svg>
);
const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 6l9 7 9-7" /></svg>
);
const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v2a2 2 0 01-2.18 2 19.72 19.72 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.72 19.72 0 012 3.18 2 2 0 014 1h2a2 2 0 012 1.72c.12.9.34 1.77.65 2.6a2 2 0 01-.45 2.11L7 8.91a16 16 0 006 6l1.58-1.2a2 2 0 012.11-.45c.83.31 1.7.53 2.6.65A2 2 0 0122 16.92z" /></svg>
);
const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z" /><path d="M9.5 12.5l1.8 1.8 3.7-3.8" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
);
