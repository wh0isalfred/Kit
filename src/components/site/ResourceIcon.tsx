import type { ReactElement } from "react";

/* ── Resource presentation — icon, accent colour, and the verb that
   actually describes what happens, per kind. Reuses the same
   blue/green/purple/amber accent hexes already defined for
   .acc-blue/.acc-green/.acc-purple/.acc-amber in Programs.tsx, so every
   resource card across the site reads as the same design language. ── */
export type Accent = "blue" | "green" | "purple" | "amber" | "gray";

export const KIND_STYLE: Record<string, { accent: Accent; verb: string }> = {
  slides: { accent: "blue", verb: "View" },
  video: { accent: "green", verb: "Watch" },
  recording: { accent: "green", verb: "Watch" },
  code: { accent: "purple", verb: "Download" },
  homework: { accent: "amber", verb: "View" },
  file: { accent: "gray", verb: "Download" },
};
export const DEFAULT_STYLE = { accent: "gray" as Accent, verb: "Open" };

/* Browsers treat a URL with no protocol (e.g. "kit-ph.vercel.app") as a
   RELATIVE path off the current site, not an external address — that's
   why a resource link entered without "https://" was resolving to
   "yoursite.com/kit-ph.vercel.app" instead of actually going to
   kit-ph.vercel.app. This prepends https:// only when there's no
   scheme already present, so it's safe to run on anything — an
   already-correct https:// URL, a mailto:, a tel:, etc. all pass
   through unchanged. */
export function normalizeUrl(url: string): string {
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) return url;
  return `https://${url}`;
}

export function ResourceIcon({ kind }: { kind: string }): ReactElement {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (kind) {
    case "video":
    case "recording":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M10 8l6 4-6 4V8z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "code":
      return (
        <svg {...common}>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    case "homework":
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M7 3h7l5 5v13H7z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6M9 17h6" />
        </svg>
      );
  }
}
