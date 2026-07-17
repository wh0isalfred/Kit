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
        d: String(Math.floor(diff / 86400000)),
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
      <div className="s-ambient" aria-hidden="true">
        <span className="s-glyph sg1"><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg></span>
        <span className="s-glyph sg2"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 2l2.5 6.5L21 9l-5 4 1.5 7L12 16l-5.5 4L8 13 3 9l6.5-.5z" /></svg></span>
        <span className="s-glyph sg3"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /></svg></span>
        <span className="s-glyph sg4"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><path d="M12 3a15 15 0 0 0 0 18M12 3a15 15 0 0 1 0 18M3 12h18" /></svg></span>
        <span className="s-glyph sg5"><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M13 2L3 14h7l-1 8 10-12h-7z" /></svg></span>
        <span className="s-glyph sg6"><svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg></span>
      </div>

      <div className="summer-in wrap">
        <span className="badge"><span className="dot" />Now enrolling · This August</span>
        <h2>
          KIT Summer <em>Build Camp</em> 2026
        </h2>
        <p className="lede">
          Three weeks. Three skills. One competition. Your child ships a real
          project — a website, a design, and a business plan built with AI — and
          the top team wins.
        </p>

        <div className="stats">
          <div className="stat"><div className="n">3</div><div className="l">Weeks, live</div></div>
          <div className="stat"><div className="n">3</div><div className="l">Courses in one</div></div>
          <div className="stat"><div className="n">₦30k</div><div className="l">Prize pool</div></div>
          <div className="stat"><div className="n">1</div><div className="l">Final competition</div></div>
        </div>

        {closed ? (
          <div className="count-closed">Enrollment is closed for this cohort.</div>
        ) : (
          <>
            <div className="count" aria-label="Time until enrollment closes">
              <div className="u"><div className="cn">{time?.d ?? "--"}</div><div className="cl">Days</div></div>
              <div className="u"><div className="cn">{time?.h ?? "--"}</div><div className="cl">Hrs</div></div>
              <div className="u"><div className="cn">{time?.m ?? "--"}</div><div className="cl">Min</div></div>
              <div className="u"><div className="cn">{time?.s ?? "--"}</div><div className="cl">Sec</div></div>
            </div>
            <div className="count-note">
              until enrollment closes · limited seats per cohort
            </div>
          </>
        )}

        <div className="summer-cta">
          <Link href="/apply" className="btn btn-glow">
            Reserve your spot
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </Link>
          <Link href="/summer/schedule" className="btn btn-ghost">See the camp schedule</Link>
        </div>
      </div>
    </section>
  );
}