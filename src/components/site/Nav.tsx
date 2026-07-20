"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <nav>
      <div className="wrap nav-in">
        <Link className="brand" href="/" onClick={close}>
          <Image className="logo-img" src="/logo.webp" alt="KIT logo" width={26} height={30} />
          KIT
        </Link>

        <div className="nav-links">
          <a href="#programs">Programs</a>
          <Link href="/about">About</Link>
          <a href="#why">Why Kit?</a>
          <Link href="/contact">Contact</Link>
          {/* <a href="#faq">FAQ</a> */}
        </div>

        <div className="nav-right">
          <Link className="btn btn-primary" href="/apply">Apply</Link>
          <Link className="btn btn-outline" href="/login">Login</Link>
        </div>

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
          <a href="#programs" onClick={close}>Programs</a>
          <Link href="/about" onClick={close}>About</Link>
          <a href="#why" onClick={close}>Why Kit?</a>
          <Link href="/contact">Contact</Link>
          {/* <a href="#faq" onClick={close}>FAQ</a> */}
          <div className="nav-mobile-cta">
            <Link className="btn btn-primary" href="/apply" onClick={close}>Apply</Link>
            <Link className="btn btn-outline" href="/login" onClick={close}>Login</Link>
          </div>
        </div>
      </div>
    </nav>
  );
}