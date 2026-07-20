export default function AboutHero() {
  return (
    <section className="about-hero">
      {/* Floating glyphs/doodles */}
      <div className="about-glyphs" aria-hidden="true">
        <div className="about-glyph g1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <div className="about-glyph g2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <div className="about-glyph g3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
          </svg>
        </div>
        <div className="about-glyph g4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <div className="about-glyph g5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3a15 15 0 010 18" />
          </svg>
        </div>
        <div className="about-glyph g6">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <div className="about-glyph g7">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <div className="about-glyph g8">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1" fill="currentColor" />
            <circle cx="12" cy="7" r="1" fill="currentColor" />
            <circle cx="12" cy="17" r="1" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* Content overlay */}
      <div className="wrap about-hero-in">
        <div className="about-hero-copy">
          <span className="eyebrow about-eyebrow">About KIT</span>
          <h1>
            Building
            <br />
            confidence.
            <br />
            <em>Creating possibilities.</em>
          </h1>
          <p className="about-hero-body">
            KIT is a movement to empower kids (10–16) with real digital skills, the right mindset, and the confidence to build solutions and shape Africa&apos;s future.
          </p>
        </div>
      </div>

      {/* Right-side quote callout */}
      {/* <div className="about-quote-box">
        <p>We don't just teach tech. We help kids believe in what they can build.</p>
      </div> */}
    </section>
  );
}
