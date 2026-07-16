# 004 — KIT ID format (12-week program)

**Status:** Accepted

## Context
Every enrolled student needs a unique, human-readable ID that's meaningful at a glance — encoding course, year, cohort, and student number — per the original platform plan.

## Decision
Format: `[COURSE][YY][COHORT]-[NUMBER]`, e.g. `WD2601-0042`.

- `WD` — course code (`WD` = Web Design, `AI` = AI course, etc.)
- `26` — enrollment year
- `01` — cohort number within that year
- `0042` — student's sequential number within their batch

Generated automatically on admission approval, once a student is placed into a batch.

## Alternatives considered
- **Random UUID as the visible ID:** rejected — not human-readable, gives admin/teachers no at-a-glance context when scanning a list of students.

## Consequences
- IDs are predictable/sequential by design, which is fine here — this ID is used for login/identification within an already-authenticated system, not as a security gate (unlike the Summer ID, see ADR 005).
