# 005 — Summer ID format

**Status:** Accepted

## Context
Unlike the 12-week KIT ID, the Summer ID doubles as the *only* access credential for the Summer Portal (see ADR 002). That changes the requirements: it can't be trivially guessable in sequence.

## Decision
Format: `SM[YY][RANDOM3]`, e.g. `SM25734` — `SM` prefix, two-digit year, followed by a **randomly assigned** 3-digit suffix (not a sequential counter). Assigned at enrollment; uniqueness enforced at the database level.

## Alternatives considered
- **Sequential numbering (`SM25001`, `SM25002`, ...):** rejected — trivially enumerable, which matters specifically because this ID is also the auth mechanism (unlike the KIT ID in ADR 004, which sits behind a real login).

## Consequences
- Slightly less "at a glance" orderly than a sequential ID, but this is the credential guarding the live Meet link — worth the tradeoff.
- Combined with the rate limiting in ADR 002, brute-forcing a valid ID is impractical at realistic cohort sizes (dozens, not thousands, of students).
