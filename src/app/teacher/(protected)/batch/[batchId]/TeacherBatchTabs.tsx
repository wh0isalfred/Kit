"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { segment: "overview", label: "Overview" },
  { segment: "class", label: "Class" },
  { segment: "resources", label: "Resources" },
  { segment: "homework", label: "Homework" },
] as const;

export default function TeacherBatchTabs({ batchId }: { batchId: string }) {
  const pathname = usePathname();

  return (
    <nav className="teacher-batch-tabs">
      {TABS.map((tab) => {
        const href = `/teacher/batch/${batchId}/${tab.segment}`;
        const active = pathname === href;
        return (
          <Link
            key={tab.segment}
            href={href}
            className={`teacher-batch-tab${active ? " on" : ""}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
