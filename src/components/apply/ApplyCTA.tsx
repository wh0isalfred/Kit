export default function ApplyCTA() {
  return (
    <section className="apply-cta">
      <div className="wrap apply-cta-in">
        <div className="apply-cta-left">
          <div className="apply-cta-icon">
            <svg viewBox="0 0 120 120" fill="none">
              <path
                d="M6 92 C 20 62, 44 96, 60 60"
                stroke="#4a5a82"
                strokeWidth="2.2"
                strokeDasharray="1 7"
                strokeLinecap="round"
              />
              <g transform="translate(56,16) rotate(30)">
                <path d="M0 0 L38 14 L14 22 L9 38 Z" fill="#fff" />
                <path d="M0 0 L14 22 L9 38 L4 26 Z" fill="#aebdd9" />
              </g>
            </svg>
          </div>

          <div className="apply-cta-copy">
            <h3>
              Let&apos;s build the future <em>together.</em>
            </h3>
            <p>
              Fill out the form above and we&apos;ll help your child discover,
              learn, and build with confidence.
            </p>
          </div>
        </div>

        <a href="#apply-form" className="apply-cta-btn">
          Apply to KIT
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
        </a>
      </div>
    </section>
  );
}
