"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSectionLink } from "./useSectionLink";
import { signOutSummer } from "@/app/summer/summer-session";
import ContactModal from "./ContactModal";

export default function Nav({ loggedIn = false }: { loggedIn?: boolean }) {
  const [open, setOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const close = () => setOpen(false);
  const sectionLink = useSectionLink();
  const router = useRouter();

  async function signOut() {
    close();
    await signOutSummer();
    router.push("/");
    router.refresh();
  }

  /* Logged in (a valid summer session): the primary CTA becomes the
     way back into the classroom, and Login becomes Sign out. Logged
     out: Apply + Login as before, with Login now pointing at /summer
     — the only working sign-in — instead of the /login route that
     doesn't exist. */
  const cta = loggedIn ? (
    <>
      <Link className="btn btn-primary" href="/smportal" onClick={close}>
        Go to your classroom
      </Link>
      <button className="btn btn-outline" onClick={signOut}>
        Sign out
      </button>
    </>
  ) : (
    <>
      <Link className="btn btn-primary" href="/apply" onClick={close}>
        Apply
      </Link>
      <Link className="btn btn-outline" href="/summer" onClick={close}>
        Login
      </Link>
    </>
  );

  return (
    <nav>
      <div className="wrap nav-in">
        <Link className="brand" href="/" onClick={close}>
          <Image className="logo-img" src="/logo.webp" alt="KIT logo" width={38} height={44} priority />
          KIT
        </Link>

        <div className="nav-links">
          <a {...sectionLink("programs")}>Programs</a>
          <Link href="/about">About</Link>
          <a {...sectionLink("why")}>Why Kit?</a>
          <button className="nav-link-btn" onClick={() => setContactOpen(true)}>
            Contact
          </button>
          <a {...sectionLink("faq")}>FAQ</a> 
        </div>

        <div className="nav-right">{cta}</div>

        <button
          className="nav-toggle"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          )}
        </button>
      </div>

      <div className={`nav-mobile ${open ? "open" : ""}`}>
        <div className="nav-mobile-in">
          <a {...sectionLink("programs", close)}>Programs</a>
          <Link href="/about" onClick={close}>About</Link>
          <a {...sectionLink("why", close)}>Why Kit?</a>
          <button
            className="nav-link-btn"
            onClick={() => {
              close();
              setContactOpen(true);
            }}
          >
            Contact
          </button>
          <a {...sectionLink("faq")} onClick={close}>FAQ</a> 
          <div className="nav-mobile-cta">{cta}</div>
        </div>
      </div>

      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </nav>
  );
}
