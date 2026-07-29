"use client";

import { usePathname } from "next/navigation";

const TABS = [
  { slug: "overview", label: "Overview" },
  { slug: "class", label: "Class" },
  { slug: "resources", label: "Resources" },
  { slug: "homework", label: "Homework" },
] as const;

export default function BatchTabs({ batchId }: { batchId: string }) {
  const pathname = usePathname();

  return (
    <nav className="batch-tabs">
      {TABS.map((tab) => {
        const href = `/admin/summer/batch/${batchId}/${tab.slug}`;
        const active = pathname?.startsWith(href) ?? false;
        return (
          <a key={tab.slug} href={href} className={`batch-tab${active ? " batch-tab-active" : ""}`}>
            {tab.label}
            {/* Grading count badge lands here in step 5 — not wired yet */}
          </a>
        );
      })}
    </nav>
  );
}