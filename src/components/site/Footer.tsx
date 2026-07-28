"use client";

import Link from "next/link";
import Image from "next/image";
import { useSectionLink } from "./useSectionLink";

/* TODO(Ade): confirm these — carried over as placeholders from
   the Apply page sidebar, not confirmed as the real public
   contact details. */
const contact = {
  email: "kidsintechph@gmail.com",
  whatsappNumber: "2349169799215",
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
              <Image className="logo-img foot" src="/logo.webp" alt="KIT logo" width={30} height={36} />
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
            <a href="https://www.instagram.com/kidsintechph" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1112.63 8A4 4 0 0116 11.37z" />
                <circle cx="17.5" cy="6.5" r="1.5" />
              </svg>
            </a>
            <a href={`https://wa.me/${contact.whatsappNumber}`} aria-label="WhatsApp" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
              </svg>
            </a>
            {/* Facebook page isn't set up yet — disabled span, not a
                link to somewhere that may not exist. Swap for a
                real <a href="..."> once it's live. */}
            <span className="foot-social-disabled" aria-label="Facebook — coming soon" title="Facebook — coming soon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 4h-1.5A3.5 3.5 0 0010 7.5V10H7.5v3H10v7h3v-7h2.5l.5-3H13V7.5a.5.5 0 01.5-.5H15z" />
              </svg>
            </span>
            {/* <a href="#twitter" aria-label="Twitter" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75 2.25 9 0 9-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
              </svg>
            </a> */}
            {/* <a href="#youtube" aria-label="YouTube" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19.54c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.33 29 29 0 00-.46-5.33z" />
                <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
              </svg>
            </a> */}
            <a  href={`mailto:${contact.email}`} aria-label="Email Kids in Tech" target="_blank" rel="noopener noreferrer">
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
            <a href={`https://wa.me/${contact.whatsappNumber}`} target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
              </svg>
              Chat on WhatsApp
            </a>
          </div>
          <p className="foot-copy">© 2026 KidsinTech (KIT). All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
