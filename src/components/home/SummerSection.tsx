"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Set your real enrollment-close date here (one place to change per cohort).
const CLOSE = new Date("2026-08-01T23:59:59+01:00").getTime();

type Time = { d: string; h: string; m: string; s: string };

export default function SummerSection() {
  const [time, setTime] = useState<Time | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    function tick() {
      const diff = CLOSE - Date.now();
      if (diff <= 0) {
        setClosed(true);
        return;
      }
      setTime({
        d: String(Math.floor(diff / 86400000)).padStart(2, "0"),
        h: String(Math.floor((diff % 86400000) / 3600000)).padStart(2, "0"),
        m: String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0"),
        s: String(Math.floor((diff % 60000) / 1000)).padStart(2, "0"),
      });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="summer" id="summer">
      <div className="wrap">
        <div className="summer-banner">
          <div className="summer-content">
            <span className="summer-badge">Happening this August!</span>
            <h2>KIT Summer Tech Camp 2026</h2>
            <p className="summer-stats">
              3 Weeks · 3 Courses · 1 Competition · ₦30,000 Prize Pool
            </p>
            <p className="summer-tag">
              Live classes. Real projects. Limitless possibilities.
            </p>

            {closed ? (
              <div className="count-closed">Enrollment is closed for this cohort.</div>
            ) : (
              <div className="count" aria-label="Time until enrollment closes">
                <div className="u"><div className="cn">{time?.d ?? "--"}</div><div className="cl">Days</div></div>
                <div className="u"><div className="cn">{time?.h ?? "--"}</div><div className="cl">Hours</div></div>
                <div className="u"><div className="cn">{time?.m ?? "--"}</div><div className="cl">Minutes</div></div>
                <div className="u"><div className="cn">{time?.s ?? "--"}</div><div className="cl">Seconds</div></div>
              </div>
            )}

            <div className="summer-cta">
              <Link href="/apply" className="btn btn-glow">
                Reserve Your Spot
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Link>
              <span className="summer-seats">Limited seats available!</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}