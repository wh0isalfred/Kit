# KIT — Port Harcourt

> Every career needs tech literacy.

KIT is a tech education platform for ages 12–16, running a 12-week Future Skills Lab and a 3-week Summer Program in Port Harcourt, Nigeria.

## What's in this repo

A single Next.js application serving four surfaces:

- **Marketing site** — public pages, programs, apply flow
- **Summer Portal** — ID-only shared classroom for the 3-week summer cohort
- **Student / Teacher / Admin platform** — the 12-week program's batch-based dashboards

See [`docs/Architecture.md`](docs/Architecture.md) for the full breakdown and [`docs/adr/`](docs/adr/) for why things are built the way they are.

## Stack

Next.js (App Router) · TypeScript · Supabase (Postgres, Auth, Storage, RLS) · Paystack · Vercel

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in Supabase + Paystack keys
pnpm dev
```

## Docs

| File | What it covers |
|---|---|
| [Architecture.md](docs/Architecture.md) | System design, routes, why no separate backend |
| [Database.md](docs/Database.md) | Schema |
| [Roadmap.md](docs/Roadmap.md) | Phased build plan |
| [adr/](docs/adr/) | Architecture Decision Records |

More docs (`Curriculum.md`, `API.md`, `UI.md`, `Brand.md`) get added when there's real content to put in them — not before.

## License

Proprietary — Adegbola Industries.
