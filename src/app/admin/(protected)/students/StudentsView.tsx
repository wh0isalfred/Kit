"use client";

import { useState, useMemo } from "react";

export type RosterRow = {
  id: string;
  programme: "summer" | "term";
  displayId: string;
  name: string;
  batch: string | null;
  status: string;
  contactEmail: string | null;
  contactPhone: string | null;
  points: number | null;
  loginEmailSent: string | null;
  joinedAt: string;
  cohortYear: number | null;
};

export default function StudentsView({ rows }: { rows: RosterRow[] }) {
  const [query, setQuery] = useState("");
  const [programme, setProgramme] = useState<"all" | "summer" | "term">("all");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (programme !== "all" && r.programme !== programme) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const hit =
          r.name.toLowerCase().includes(q) ||
          r.displayId.toLowerCase().includes(q) ||
          (r.contactEmail ?? "").toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [rows, query, programme]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      summer: rows.filter((r) => r.programme === "summer").length,
      term: rows.filter((r) => r.programme === "term").length,
    }),
    [rows]
  );

  // Surfaces the same condition the dashboard already alerts on, but
  // here you can actually see WHO it is.
  const needsLoginEmail = rows.filter(
    (r) => r.programme === "term" && r.status === "active" && !r.loginEmailSent
  );

  return (
    <>
      <header className="admin-head">
        <div>
          <h1>Students</h1>
          <p>Everyone enrolled at KIT, across both programmes.</p>
        </div>
      </header>

      {needsLoginEmail.length > 0 && (
        <p className="admin-warn">
          {needsLoginEmail.length} student{needsLoginEmail.length === 1 ? "" : "s"} have an
          account but were never sent login details:{" "}
          {needsLoginEmail.map((r) => r.name).join(", ")}
        </p>
      )}

      <div className="admin-toolbar">
        <input
          className="admin-search"
          placeholder="Search name, ID, or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="admin-segmented">
          {(["all", "summer", "term"] as const).map((p) => (
            <button
              key={p}
              className={`admin-seg${programme === p ? " admin-seg-active" : ""}`}
              onClick={() => setProgramme(p)}
            >
              {p === "all" ? "All" : p === "summer" ? "Summer" : "12-week"} ({counts[p]})
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="admin-empty">
          {rows.length === 0 ? (
            <>
              <p>No students enrolled yet.</p>
              <em>Approved applications appear here automatically.</em>
            </>
          ) : (
            <p>No students match that search.</p>
          )}
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Programme</th>
              <th>Batch</th>
              <th>Contact</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={`${r.programme}-${r.id}`}>
                <td>
                  <strong>{r.name}</strong>
                  <em>{r.displayId}</em>
                </td>
                <td>
                  <span className={`admin-pill prog-${r.programme}`}>
                    {r.programme === "summer" ? `Summer ${r.cohortYear ?? ""}`.trim() : "12-week"}
                  </span>
                  {r.points !== null && r.points > 0 && (
                    <em className="admin-roster-points">{r.points} pts</em>
                  )}
                </td>
                <td>{r.batch ?? <em className="admin-muted">Unassigned</em>}</td>
                <td>
                  {r.contactEmail ? (
                    <a href={`mailto:${r.contactEmail}`}>{r.contactEmail}</a>
                  ) : (
                    <em className="admin-muted">No email</em>
                  )}
                  {r.contactPhone && <em className="admin-roster-phone">{r.contactPhone}</em>}
                </td>
                <td>
                  <span className={`admin-pill stat-${r.status}`}>{r.status}</span>
                  {r.programme === "term" && r.status === "active" && !r.loginEmailSent && (
                    <em className="admin-roster-flag">No login email</em>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}