"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function EnrollBar() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    function onScroll() {
      if (window.scrollY > 500) setShow(true);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [dismissed]);

  const visible = show && !dismissed;

  return (
    <div
      className={`enroll-bar ${visible ? "show" : ""}`}
      role="region"
      aria-label="Summer enrollment"
    >
      <div className="enroll-in wrap">
        <span className="enroll-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2c.8-.8.8-2 0-3s-2.2-.8-3 0z" />
            <path d="M9 12c6-8 11-8 11-8s0 5-8 11l-3-3z" />
            <circle cx="15" cy="9" r="1.3" />
          </svg>
        </span>
        <div className="enroll-copy">
          <div className="t">
            Summer <em>Build Camp</em> is enrolling
          </div>
          <div className="s">Live classes start August · limited seats</div>
        </div>
        <Link href="/apply" className="btn btn-glow">Reserve a spot</Link>
        <button
          className="enroll-x"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
