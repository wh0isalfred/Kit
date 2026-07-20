"use client";

import Link from "next/link";
import Image from "next/image";
import { useSectionLink } from "./useSectionLink";

/* TODO(Ade): confirm these — carried over as placeholders from
   the Apply page sidebar, not confirmed as the real public
   contact details. */
const contact = {
  email: "hello@kidsintech.africa",
  phone: "+234 802 123 4567",
};

export default function Footer() {
  const sectionLink = useSectionLink();

  return (
    <footer>
      <div className="wrap">
        <div className="foot-in">
          {/* Left: Logo */}
          <div className="foot-left">
            <div className="foot-brand">
              <Image className="logo-img foot" src="/logo.webp" alt="KIT logo" width={22} height={26} />
              KIT
            </div>
          </div>

          {/* Center: Nav links */}
          <nav className="foot-nav">
            <a {...sectionLink("programs")}>Programs</a>
            <Link href="/about">About</Link>
            <a {...sectionLink("why")}>Why Kit?</a>
            <Link href="/contact">Contact</Link>
          </nav>

          {/* Right: Social icons */}
          <div className="foot-socials">
            <a href="#instagram" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1112.63 8A4 4 0 0116 11.37z" />
                <circle cx="17.5" cy="6.5" r="1.5" />
              </svg>
            </a>
            <a href="#twitter" aria-label="Twitter" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75 2.25 9 0 9-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
              </svg>
            </a>
            <a href="#youtube" aria-label="YouTube" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19.54c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.33 29 29 0 00-.46-5.33z" />
                <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
              </svg>
            </a>
            <a href="#gmail" aria-label="Gmail" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 6l-10 7L2 6" />
              </svg>
            </a>
          </div>
        </div>

        <div className="foot-divider" />

        {/* Bottom: contact info + copyright */}
        <div className="foot-bottom">
          <div className="foot-contact">
            <a href={`mailto:${contact.email}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 6l9 7 9-7" />
              </svg>
              {contact.email}
            </a>
            <a href={`tel:${contact.phone.replace(/\s/g, "")}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v2a2 2 0 01-2.18 2 19.72 19.72 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.72 19.72 0 012 3.18 2 2 0 014 1h2a2 2 0 012 1.72c.12.9.34 1.77.65 2.6a2 2 0 01-.45 2.11L7 8.91a16 16 0 006 6l1.58-1.2a2 2 0 012.11-.45c.83.31 1.7.53 2.6.65A2 2 0 0122 16.92z" />
              </svg>
              {contact.phone}
            </a>
          </div>
          <p className="foot-copy">© 2026 KidsinTech (KIT). All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
