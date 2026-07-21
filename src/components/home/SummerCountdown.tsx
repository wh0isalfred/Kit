"use client";

import { useEffect, useState } from "react";

type Time = { d: string; h: string; m: string; s: string };

/**
 * Counts down to registration close. Client-side because it ticks;
 * every value it needs arrives as a prop from the server component,
 * so there's no data fetching here.
 *
 * Four states, and the distinction matters:
 *   no date      → say nothing about timing at all
 *   not yet open → "opens on X", not a countdown to closing
 *   open         → the countdown
 *   closed       → closed
 */
export default function SummerCountdown({
  opensAt,
  closesAt,
}: {
  opensAt: string | null;
  closesAt: string | null;
}) {
  const [time, setTime] = useState<Time | null>(null);
  const [state, setState] = useState<"loading" | "before" | "open" | "closed">(
    "loading"
  );

  useEffect(() => {
    if (!closesAt) return;

    const close = new Date(closesAt).getTime();
    const open = opensAt ? new Date(opensAt).getTime() : null;

    function tick() {
      const now = Date.now();

      if (open !== null && now < open) {
        setState("before");
        return;
      }
      const diff = close - now;
      if (diff <= 0) {
        setState("closed");
        return;
      }

      setState("open");
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
  }, [opensAt, closesAt]);

  // No close date configured — say nothing rather than guess.
  if (!closesAt) return null;

  if (state === "before" && opensAt) {
    return (
      <div className="count-closed">
        Registration opens{" "}
        {new Date(opensAt).toLocaleDateString("en-NG", {
          day: "numeric",
          month: "long",
        })}
        .
      </div>
    );
  }

  if (state === "closed") {
    return <div className="count-closed">Enrollment is closed for this cohort.</div>;
  }

  return (
    <div className="count" aria-label="Time until enrollment closes">
      <div className="u">
        <div className="cn">{time?.d ?? "--"}</div>
        <div className="cl">Days</div>
      </div>
      <div className="u">
        <div className="cn">{time?.h ?? "--"}</div>
        <div className="cl">Hours</div>
      </div>
      <div className="u">
        <div className="cn">{time?.m ?? "--"}</div>
        <div className="cl">Minutes</div>
      </div>
      <div className="u">
        <div className="cn">{time?.s ?? "--"}</div>
        <div className="cl">Seconds</div>
      </div>
    </div>
  );
}
