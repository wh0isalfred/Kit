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
        <span className="rocket" aria-hidden="true">🚀</span>
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
          ✕
        </button>
      </div>
    </div>
  );
}