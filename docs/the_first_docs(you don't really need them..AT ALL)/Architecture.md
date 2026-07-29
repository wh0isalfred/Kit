# Architecture

## Product surfaces

```
kit.ng
│
├── /                marketing site (home, programs, why, about)
├── /summer          summer camp landing + ID-gate + shared portal
├── /apply            application form → Paystack → Supabase
├── /login             student / teacher / admin auth (Supabase Auth)
├── /student            student dashboard (role-gated, batch-scoped)
├── /teacher             teacher dashboard (role-gated, batch-scoped)
└── /admin                admin dashboard (full access)
```

One Next.js app, one Vercel deploy. No separate backend service, no monorepo tooling. See [ADR 001](adr/001-single-nextjs-supabase-app.md) for why.

## Stack

- **Frontend/backend:** Next.js App Router — Server Actions and Route Handlers replace what would otherwise be a separate API service
- **Data/auth/storage:** Supabase — Postgres, Auth, Storage, Row Level Security
- **Payments:** Paystack — applications and summer enrollment
- **Deploy:** Vercel

## The two access models

KIT has two genuinely different access patterns, and the architecture treats them differently on purpose:

**12-week program (real accounts):** Supabase Auth issues a session; a `profiles` table maps `user_id → role + batch_id`; RLS policies scope every query to that role and batch. Students, teachers, and admin all use this.

**Summer program (no accounts):** A Summer ID is checked against a roster table; on match, a short-lived signed cookie grants read access to one shared content record. There is no Supabase Auth session involved — this is intentionally lighter weight because the content behind it isn't sensitive per-student data, it's the same page for everyone. See [ADR 002](adr/002-id-only-summer-auth.md).

## Courses as data, not code

Program cards on the marketing site render from a `courses` table (`type: 'summer' | 'term'`, `track: '10-12' | '13-15'`). Adding a new offering (Game Dev, Robotics, Python) is a database insert, not a redeploy.

## Build order

See [Roadmap.md](Roadmap.md).
