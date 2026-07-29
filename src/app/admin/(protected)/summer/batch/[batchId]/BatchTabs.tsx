"use client";

import { usePathname } from "next/navigation";

const TABS = [
  { slug: "overview", label: "Overview" },
  { slug: "class", label: "Class" },
  { slug: "resources", label: "Resources" },
  { slug: "homework", label: "Homework" },
] as const;

export default function BatchTabs({
  batchId,
  gradingCount,
}: {
  batchId: string;
  gradingCount: number;
}) {
  const pathname = usePathname();

  return (
    <nav className="batch-tabs">
      {TABS.map((tab) => {
        const href = `/admin/summer/batch/${batchId}/${tab.slug}`;
        const active = pathname?.startsWith(href) ?? false;
        return (
          <a key={tab.slug} href={href} className={`batch-tab${active ? " batch-tab-active" : ""}`}>
            {tab.label}
            {tab.slug === "homework" && gradingCount > 0 && (
              <span className="batch-tab-badge">{gradingCount}</span>
            )}
          </a>
        );
      })}
    </nav>
  );
}