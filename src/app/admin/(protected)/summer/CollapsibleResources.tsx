"use client";

import { useState } from "react";
import SummerResources, { type Resource } from "./SummerResources";

export default function CollapsibleResources({
  cohortYear,
  currentWeek,
  weeksWithContent,
  resources,
}: {
  cohortYear: number;
  currentWeek: number;
  weeksWithContent: number[];
  resources: Resource[];
}) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <>
        <div className="admin-collapse-bar">
          <button className="admin-collapse-toggle" onClick={() => setOpen(false)}>
            ▲ Hide resources
          </button>
        </div>
        <SummerResources
          cohortYear={cohortYear}
          currentWeek={currentWeek}
          weeksWithContent={weeksWithContent}
          resources={resources}
        />
      </>
    );
  }

  const publishedCount = resources.filter((r) => r.published).length;

  return (
    <section className="admin-section admin-section-collapsed">
      <button
        className="admin-collapse-toggle admin-collapse-toggle-closed"
        onClick={() => setOpen(true)}
      >
        <span>
          <strong>Resources</strong>{" "}
          <span className="admin-hint">
            {resources.length} total · {publishedCount} published
          </span>
        </span>
        <span className="admin-collapse-chevron">▼</span>
      </button>
      <p className="admin-hint">
        Shared curriculum visible to every batch — links, slides, recordings, and homework. Click to expand and manage.
      </p>
    </section>
  );
}