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
            We don't just teach<br />
            technology.<br />
            <em>We prepare children<br />for what's next.</em>
          </h1>
          <p className="about-hero-body">
            Every profession is changing because of technology. The children who understand how to use it will have opportunities that others won't.
          </p>
        </div>

        <div className="about-hero-image">
          <img src="/cute_baby.webp" alt="Child with laptop" />
        </div>
      </div>

      {/* Right-side quote callout */}
      <div className="about-quote-box">
        <p className="about-quote-text">
          &quot;Today's children won't compete with AI. They'll compete with people who know how to use it.&quot;
        </p>
        <p className="about-quote-attr">— KIT</p>
      </div>
    </section>
  );
}
