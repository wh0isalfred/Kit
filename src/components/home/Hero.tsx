import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <header className="hero">
      <div className="wrap hero-in">
        <div>
          <span className="eyebrow">Kiting Up for Greatness</span>
          <h1>
            The future of
            <br />
            tech starts <em>here.</em>
          </h1>
          <p>
            KIT is where young people learn to build with technology — taught by
            people who do it for real.
          </p>
          <Link className="btn btn-primary" href="/apply">
            Apply to KIT
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>

        <div className="shot">
          <div className="shot-accent" aria-hidden="true" />
          <div className="shot-frame">
            <Image
              src="/heroimage.png"
              alt="A KIT student building on a laptop"
              fill
              priority
              sizes="(max-width:900px) 100vw, 560px"
              style={{ objectFit: "cover", objectPosition: "38% center" }}
            />
            <div className="shot-chip">
              <i />
              online
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}