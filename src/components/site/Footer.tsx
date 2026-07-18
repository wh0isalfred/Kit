import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-in">
          {/* Left: Logo + copyright */}
          <div className="foot-left">
            <div className="foot-brand">
              <Image className="logo-img foot" src="/logo.jpg" alt="KIT logo" width={22} height={26} />
              KIT
            </div>
            <p className="foot-copy">© 2026 KidsinTech (KIT). All rights reserved.</p>
          </div>

          {/* Center: Nav links */}
          <nav className="foot-nav">
            <a href="#programs">Programs</a>
            <Link href="/about">About</Link>
            <a href="#why">How It Works</a>
            <a href="#faq">FAQ</a>
            <Link href="/contact">Contact</Link>
          </nav>

          {/* Right: Social icons */}
          <div className="foot-socials">
            <a href="#instagram" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="12" cy="12" r="3" />
                <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" />
              </svg>
            </a>
            <a href="#twitter" aria-label="Twitter" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75 2.25 9 0 9-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
              </svg>
            </a>
            <a href="#youtube" aria-label="YouTube" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="2" y="3" width="20" height="18" rx="2.18" ry="2.18" fill="none" stroke="currentColor" strokeWidth="2" />
                <line x1="7" y1="12" x2="17" y2="12" stroke="currentColor" strokeWidth="2" />
                <polyline points="12 9 12 15" stroke="currentColor" strokeWidth="2" />
              </svg>
            </a>
            <a href="#linkedin" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="2" y="2" width="20" height="20" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M16 11.37A4 4 0 1012.63 8A4 4 0 0116 11.37z" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="6.5" cy="6.5" r="1.5" fill="currentColor" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
