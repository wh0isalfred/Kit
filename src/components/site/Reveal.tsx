"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Wraps any block in the existing .reveal / .reveal.in CSS pattern.
 * Fires once when the element scrolls into view, then stops
 * observing — it doesn't re-hide on scroll back up.
 *
 * Usage:
 *   <Reveal><h2>Some heading</h2></Reveal>
 *
 * For a staggered group (cards, list items), wrap the group in a
 * plain div with class="reveal-group" and put each item directly
 * inside its own <Reveal> — the CSS nth-child stagger in globals.css
 * handles the delay automatically, no `delay` prop needed:
 *
 *   <div className="reveal-group">
 *     <Reveal><Card /></Reveal>
 *     <Reveal><Card /></Reveal>
 *     <Reveal><Card /></Reveal>
 *   </div>
 *
 * The optional `delay` prop is only for one-off elements outside a
 * .reveal-group that still want a manual stagger (e.g. a heading
 * that should reveal slightly before the paragraph under it).
 */
export default function Reveal({
  children,
  delay,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={`reveal${visible ? " in" : ""}${className ? ` ${className}` : ""}`}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </Tag>
  );
}
