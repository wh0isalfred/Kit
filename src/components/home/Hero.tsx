import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <header className="hero">
      <div className="wrap hero-in">
        <div className="hero-copy">
          {/* <span className="eyebrow">Building tomorrow&apos;s innovators today</span> */}
          <h1>
            The future starts with <em>what we build today.</em>
          </h1>
          <p>
            KIT equips kids with real digital skills through hands-on projects,
            live classes, and mentorship that sparks creativity and builds
            confidence.
          </p>

          <div className="hero-cta">
            <Link className="btn btn-primary" href="#programs">
              Explore Programs
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <Link className="btn btn-outline" href="/apply">
              Apply Now
            </Link>
          </div>

          <div className="hero-features">
            <span className="feat live">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" /></svg>
              Live Classes
            </span>
            <span className="feat projects">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
              Real Projects
            </span>
            <span className="feat futures">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.6 6.6L21 9.2l-5 4.7 1.4 6.9L12 17.5 6.6 20.8 8 13.9l-5-4.7 6.4-.6z" /></svg>
              Bright Futures
            </span>
          </div>
        </div>

        <div className="hero-art">
          <Image
            src="/heroImage.webp"
            alt="A KIT student building on a laptop with code and project ideas around them"
            width={1402}
            height={1122}
            priority
            sizes="(max-width:900px) 100vw, 620px"
            style={{ width: "100%", height: "auto" }}
          />
        </div>
      </div>
    </header>
  );
}