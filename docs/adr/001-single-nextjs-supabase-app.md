# 001 — Single Next.js + Supabase app, no separate backend

**Status:** Accepted

## Context
Early architecture drafts proposed a separate NestJS backend (Railway), Postgres via Neon + Prisma, Clerk for auth, Cloudflare R2 for storage, and a Turborepo monorepo — a legitimate team-scale architecture.

KIT is built solo, with AI agents as the development team, on an existing stack (Next.js, Supabase, Paystack, Vercel) already proven across AjoBook, SEE.COM, and Bonsai.

## Decision
Build KIT as one Next.js (App Router) application. Server Actions and Route Handlers replace a separate API service. Supabase provides Postgres, Auth, Storage, and RLS. No monorepo tooling until there's a genuine second deployable (e.g. a native mobile app).

## Alternatives considered
- **NestJS + Railway + Neon + Prisma + Clerk:** rejected — four extra vendors, a second codebase to keep in sync, and a new framework to learn, for a v1 that doesn't need service-level isolation.
- **Turborepo monorepo from day one:** rejected — adds workspace tooling overhead before there's a second app to justify it.

## Consequences
- Faster to build with existing skills; one deploy target; one bill.
- If KIT later needs background jobs, heavy concurrency, or a separate mobile client hitting the same API, revisit this decision and peel out a service then — not speculatively now.
