import Image from "next/image";

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
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="12" cy="12" r="3" />
            <path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" />
          </svg>
        </div>
        <div className="about-glyph g4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
        </div>
        <div className="about-glyph g5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 19.5 6.5 19.5 17.5 12 22 4.5 17.5 4.5 6.5 12 2" />
          </svg>
        </div>
        <div className="about-glyph g6">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <div className="about-glyph g7">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="2" />
            <ellipse cx="12" cy="12" rx="10" ry="4" />
            <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
            <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
          </svg>
        </div>
      </div>

      {/* Content */}
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
            KIT is a movement to empower kids (10–16) with real digital skills, the right mindset, and the confidence to build solutions and shape Africa's future.
          </p>
          <p className="about-hero-quote">
            "We don't just teach tech. We help kids believe in what they can build."
          </p>
        </div>

        <div className="about-hero-art">
          <div className="about-hero-img-container">
            <Image
              src="/aboutHeroImage.webp"
              alt="A KIT student smiling while working on a laptop"
              width={520}
              height={540}
              priority
              sizes="(max-width:900px) 100vw, 520px"
              style={{ width: "100%", height: "auto" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
