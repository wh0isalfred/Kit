"use client";

import { useRouter, usePathname } from "next/navigation";
import type { MouseEvent } from "react";

/* ────────────────────────────────────────────────────────────
   "Programs" and "Why Kit?" only exist as sections on the
   homepage. From any other page (/apply, /about, /contact...)
   they need to: navigate to "/", wait for the section to mount,
   then smooth-scroll to it — as one click, not two.

   Instead of guessing a fixed delay, this polls for the element
   every animation frame and scrolls the moment it exists, giving
   up after maxWaitMs so a wrong id can't hang forever. In
   practice it resolves in well under a second once the home
   page hydrates — the 2s ceiling is just a safety net.
   ──────────────────────────────────────────────────────────── */
function scrollToSection(id: string, maxWaitMs = 2000) {
  const start = performance.now();
  const tick = () => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (performance.now() - start < maxWaitMs) requestAnimationFrame(tick);
  };
  tick();
}

export function useSectionLink() {
  const router = useRouter();
  const pathname = usePathname();
  const onHome = pathname === "/";

  return function sectionProps(id: string, onNavigate?: () => void) {
    return {
      href: onHome ? `#${id}` : `/#${id}`,
      onClick: (e: MouseEvent<HTMLAnchorElement>) => {
        // Let cmd/ctrl/shift/middle-click open in a new tab as normal.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

        e.preventDefault();
        onNavigate?.();

        if (onHome) {
          scrollToSection(id);
        } else {
          router.push(`/#${id}`);
          scrollToSection(id);
        }
      },
    };
  };
}
