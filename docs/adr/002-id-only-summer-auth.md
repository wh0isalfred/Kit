# 002 — ID-only access for the Summer Portal

**Status:** Accepted

## Context
The Summer Portal is not personalized — every student sees the same page (Meet link, resources, homework, announcements). Full account creation (email + password, or magic link) is unnecessary friction for a 3-week program serving one shared page.

## Decision
Students enter a Summer ID (e.g. `SM25023`) into a single field. A server action checks it against the `summer_students` roster. On match, a short-lived signed cookie (12–24h) grants access to `/summer/portal`. No Supabase Auth session is created for this flow.

To prevent the Meet link from being reachable by a stranger guessing IDs:
- The ID-check endpoint is rate-limited per IP.
- Summer IDs are not sequential/enumerable — a random suffix, not an incrementing counter (see [ADR 005](005-summer-id-format.md)).

## Alternatives considered
- **Full Supabase Auth account per summer student:** rejected — the content isn't sensitive per-student data, and account creation overhead doesn't match a 3-week program.
- **No rate limiting on the ID check:** rejected — even non-sensitive content includes a live video call link; brute-forcing it is a real (if low-severity) risk worth closing cheaply.

## Consequences
- Very low friction for students (a single input, no password reset flows to build or support).
- Content sensitivity must stay low by design — this pattern should not be reused for anything requiring per-student privacy (grades, personal data) without revisiting this ADR.
