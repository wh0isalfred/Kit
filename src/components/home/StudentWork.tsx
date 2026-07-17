"use client";

import { useState, useEffect } from "react";
import type { CSSProperties } from "react";

/* Edit the showcase items here.
   Each card is a gradient placeholder for now (from → to colours).
   When you have real screenshots, add an `image` field (see note in chat)
   and the card will show it instead of the gradient. */
type Work = { key: string; label: string; from: string; to: string };

const works: Work[] = [
  { key: "web", label: "Personal Websites", from: "#1e3a8a", to: "#2f7ff0" },
  { key: "ai", label: "AI Projects", from: "#4c1d95", to: "#8b5cf6" },
  { key: "games", label: "3D Games", from: "#065f46", to: "#12b981" },
  { key: "mobile", label: "Mobile Apps", from: "#0f172a", to: "#3b4b66" },
  { key: "design", label: "Graphic Designs", from: "#be185d", to: "#fb923c" },
  { key: "webapps", label: "Web Applications", from: "#0e7490", to: "#22d3ee" },
];

export default function StudentWork() {
  const n = works.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setActive((a) => (a + 1) % n), 2800);
    return () => clearInterval(id);
  }, [paused, n]);

  const go = (dir: number) => setActive((a) => (a + dir + n) % n);

  return (
    <section className="sw" id="showcase">
      <div className="wrap">
        <div className="sw-head">
          <div>
            <h2>Things Our Students Build</h2>
            <p>Real projects, designed and built by KIT students.</p>
          </div>
          <div className="sw-nav">
            <button aria-label="Previous" onClick={() => go(-1)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button aria-label="Next" onClick={() => go(1)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div
        className="sw-stage"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="sw-track">
          {works.map((w, i) => {
            let rel = i - active;
            if (rel > n / 2) rel -= n;
            if (rel < -n / 2) rel += n;
            const abs = Math.abs(rel);
            const clamped = Math.max(-2, Math.min(2, rel));
            const style: CSSProperties = {
              transform: `translate(-50%,-50%) translateX(${rel * 60}%) translateZ(${-abs * 160}px) rotateY(${clamped * -34}deg)`,
              opacity: abs > 2 ? 0 : 1,
              zIndex: 10 - abs,
              pointerEvents: abs > 2 ? "none" : "auto",
            };
            return (
              <button
                key={w.key}
                className={`sw-card ${rel === 0 ? "active" : ""}`}
                style={style}
                onClick={() => setActive(i)}
                aria-label={w.label}
                aria-current={rel === 0}
              >
                <div className="sw-thumb" style={{ background: `linear-gradient(150deg,${w.from},${w.to})` }}>
                  <span className="sw-thumb-tag">{w.label}</span>
                </div>
                <div className="sw-label">{w.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="sw-dots">
        {works.map((w, i) => (
          <button
            key={w.key}
            className={`sw-dot ${i === active ? "on" : ""}`}
            onClick={() => setActive(i)}
            aria-label={`Show ${w.label}`}
          />
        ))}
      </div>
    </section>
  );
}