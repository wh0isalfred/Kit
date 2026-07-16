# 003 — Role-based access via Supabase RLS, not app-level middleware

**Status:** Accepted

## Context
The 12-week platform has three roles with different visibility: Admin (everything), Teacher (own batch only, limited student fields), Student (own batch only, own data). This needs to be enforced somewhere.

## Decision
Store role and batch on a `profiles` table keyed to `auth.uid()`. Enforce visibility with Postgres Row Level Security policies rather than filtering in application code. Every table holding batch- or student-scoped data gets a policy joining back to `profiles`.

## Alternatives considered
- **App-level filtering only (trust the API layer to add `WHERE batch_id = ...`):** rejected as the sole mechanism — a missed filter in one route becomes a data leak. RLS makes the database itself the enforcement point, so a bug in a Server Action can't accidentally return another batch's data.

## Consequences
- Slightly more setup cost per table (writing policies), but access control can't be bypassed by a forgotten `WHERE` clause in a new route.
- Policies need to be revisited any time a new role or table is added.
