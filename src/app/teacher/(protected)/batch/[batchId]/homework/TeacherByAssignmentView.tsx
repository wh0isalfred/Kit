"use client";

import { useState } from "react";
import TeacherHomeworkReview from "./TeacherHomeworkReview";
import type { HomeworkAssignment } from "../actions";

export default function TeacherByAssignmentView({
  batchId,
  assignments,
}: {
  batchId: string;
  assignments: HomeworkAssignment[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(assignments[0]?.id ?? null);

  if (assignments.length === 0) {
    return (
      <div className="admin-empty">
        <p>No gradeable homework assignments exist yet for this cohort.</p>
        <em>Ask an admin to add one from the Resources tab — kind: Homework, with a submission type set.</em>
      </div>
    );
  }

  const byWeek = new Map<number, HomeworkAssignment[]>();
  assignments.forEach((a) => {
    if (!byWeek.has(a.week)) byWeek.set(a.week, []);
    byWeek.get(a.week)!.push(a);
  });

  const selected = assignments.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="hw-picker">
      <div className="hw-picker-list">
        {Array.from(byWeek.entries())
          .sort(([a], [b]) => a - b)
          .map(([week, items]) => (
            <div key={week} className="hw-picker-week">
              <div className="hw-picker-week-label">Week {week}</div>
              {items.map((a) => (
                <button
                  key={a.id}
                  className={`hw-picker-item${a.id === selectedId ? " hw-picker-item-active" : ""}`}
                  onClick={() => setSelectedId(a.id)}
                >
                  {a.day_number != null && <span className="hw-picker-day">Day {a.day_number}</span>}
                  {a.title}
                </button>
              ))}
            </div>
          ))}
      </div>

      <div className="hw-picker-detail">
        {selected ? (
          <TeacherHomeworkReview
            key={selected.id}
            resourceId={selected.id}
            resourceTitle={selected.title}
            batchId={batchId}
            submissionType={selected.submission_type}
          />
        ) : (
          <p className="admin-hint">Pick an assignment on the left.</p>
        )}
      </div>
    </div>
  );
}
