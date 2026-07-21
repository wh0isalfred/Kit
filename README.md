# KIT — Port Harcourt

> Every career needs tech literacy.

KIT is a tech education platform for ages 12–15, running a 12-week Future Skills Lab and a 3-week Summer Program in Port Harcourt, Nigeria.

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
# KIT Database

Complete Postgres schema for KIT Port Harcourt, built for Supabase.

Twelve migrations, a seed file, and two test suites. Everything here has been applied and exercised against a real Postgres 16 — 24 functional checks and 9 RLS isolation checks, all passing from an empty database.

Reference documentation: [Doc 1 — Product & Decisions](../docs/KIT-01-Product-and-Decisions.md) · [Doc 2 — Architecture & Data](../docs/KIT-02-Architecture-and-Data.md) · [Doc 3 — Build Handbook](../docs/KIT-03-Build-Handbook.md)

---

## ⚠ Read this before running anything

Three decisions are unresolved and are baked into the seed file. They are marked `⚠ BLOCKED` in `seed.sql`.

**1 · KIT ID course codes — blocks approving applications**
ADR 004 defines codes for `WD` and `AI` only. `PY` (Python) and `GD` (Game Development) in the seed are placeholders I chose. A course code is baked into every KIT ID a student will ever hold, printed on their certificate, and used to look them up for three months. Changing one after the first student enrols means reissuing IDs.

**2 · Which courses actually launch**
The seed marks five courses live, including AI — which the built application form does not currently offer, despite the blueprint treating it as a core pillar. If the real launch is Web Dev + AI only, flip Python and Game Dev to `coming_soon`. That is one `UPDATE`; the marketing site follows with no redeploy.

**3 · The age band — currently rejects 16-year-olds**
`age_max` is `15` on term courses, not the `16` the site advertises, because the curriculum tracks are 10–12 and 13–15 and a 16-year-old has nowhere to be placed. As seeded, a 16-year-old's application is **rejected at insert** with a clear message. That is the honest state rather than a silent acceptance into a track that does not exist — but it is a live rejection on a revenue path, so resolve it. **Check the ages of the existing ~50 Google Forms sign-ups first.**

---

## Running it

### Against a Supabase project (recommended)

```bash
supabase link --project-ref <your-project-ref>
supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql
```

### Or paste into the SQL editor

Run each file in `supabase/migrations/` in filename order, then `supabase/seed.sql`. Order matters — later migrations reference earlier tables.

### Verifying locally

The test suites need a plain Postgres 16 plus a shim that stands in for the Supabase-provided pieces (`auth.users`, `auth.uid()`, `storage.*`, the `anon`/`authenticated` roles):

```bash
createdb kit_test
psql -d kit_test -f test/00_supabase_shim.sql
for f in supabase/migrations/*.sql; do psql -v ON_ERROR_STOP=1 -d kit_test -f "$f"; done
psql -d kit_test -f supabase/seed.sql
psql -d kit_test -f test/01_functional_test.sql
psql -d kit_test -f test/02_rls_test.sql
```

Do **not** apply `00_supabase_shim.sql` to a real Supabase project. It exists only so the migrations can be checked before they touch anything live.

---

## What's in each migration

| File | Contents |
|---|---|
| `0001_extensions_and_helpers` | `pgcrypto`, `citext`, `set_updated_at()`, `age_years()`, naira/kobo converters |
| `0002_courses` | `courses` — source of truth for the marketing site and the KIT ID prefix |
| `0003_people_and_batches` | `profiles`, `teachers`, `batches`, `students`, batch capacity enforcement |
| `0004_applications_and_payments` | Corrected `applications` table, `payments` ledger, age and amount validation |
| `0005_learning` | `resources`, `class_sessions`, `attendance`, `assignments`, `submissions`, `announcements` |
| `0006_points_and_certificates` | Points rules, ledger, cached-total triggers, reconciliation, `certificates` |
| `0007_summer` | Summer roster, content, cohorts, **and the ADR 002 rate limiter** |
| `0008_id_generators` | KIT ID, Summer ID, certificate serial |
| `0009_approve_chain_and_audit` | `audit_log`, `approve_application()`, `reject_application()`, `record_payment()`, `enrol_summer_student()` |
| `0010_rls` | RLS helpers and every policy |
| `0011_views` | Teacher-safe student view, leaderboard, admin views, summer portal read |
| `0012_storage` | Five buckets and their path-based access policies |

---

## Gaps from Doc 2 §4.4, now closed

The documentation named six things the old schema lacked. Five are built here:

| Gap | Now |
|---|---|
| Attendance | `class_sessions` + `attendance`, with punctuality computed on join |
| Payment instalments | `payments` ledger. **Not** Paystack subscriptions — Doc 1 §9.4 stands |
| Certificates | `certificates`, with a random public verification serial |
| Audit log | `audit_log` + `write_audit()`, read-only even for admin |
| Rate limiting | `summer_access_attempts` + `check_summer_rate_limit()` |
| Organisations / locations | **Still absent, deliberately.** Needed only for school partnerships or a second city (Doc 1 §12.3); building it speculatively would be the mistake ADR 001 warns about |

---

## Decisions made while building

Things the documentation did not settle, decided here and worth knowing about.

**`teachers.batch_id` is gone.** The old schema had `teachers.batch_id → batches.id` *and* `batches.teacher_id → teachers.id` — a circular foreign key and two places to disagree about who teaches what. `batches.teacher_id` is now the only truth. This also drops the v1 assumption that a teacher holds exactly one batch, which stops being true the moment KIT runs two cohorts at once.

**`app_batch_ids()` returns a set, not a scalar.** Follows from the above. A scalar helper would silently scope a two-batch teacher to whichever batch came back first.

**Teachers have no `select` policy on `students` at all.** Doc 1 §6.2 restricts them to name, email, batch and KIT score. RLS gates rows, not columns, so they read through the `students_for_teacher` view instead. Test 02 asserts both that the direct table is closed to them and that the view exposes no parent contact, DOB or school.

**The approve chain is atomic in the database; the email is not.** `approve_application()` does student creation, batch assignment, KIT ID generation, instalment scheduling and the audit write in one transaction. Sending the login email deliberately sits outside it — making that atomic would mean a failed send rolls back a perfectly good student record. Instead `students.login_email_sent_at` stays null and the send is retryable without re-running admissions.

**Amounts are recomputed in the database.** The `applications` insert trigger recalculates what should be charged from the `courses` table and rejects a mismatch. A tampered request asking to pay ₦100 for a ₦75,000 programme fails at the database, not merely in the Server Action. Test 01 check 3.

**The summer ID generator refuses a space over half full.** ADR 005's 3-digit suffix is a 1,000-value space. Rather than silently degrading as the cohort grows, `generate_summer_id()` raises past 50% occupancy and tells you to widen. The column regex already accepts 3 or 4 digits, so widening is one default argument and no migration.

**`gen_random_bytes`, not `random()`.** `random()` is seeded and predictable. A predictable "random" summer ID defeats the whole of ADR 005.

**Every `security definer` function pins `search_path`.** Without it, a caller can shadow `profiles` with their own table and escalate privileges. This is a real vulnerability, not a style preference.

---

## Bugs the tests caught

Worth recording, because both would have reached production and neither is obvious by reading:

1. **`enrol_summer_student()` dereferenced an unassigned record.** Enrolling a summer student *without* an application — the CSV roster import path, which is how most summer students will actually arrive — read `a.parent_email` from a record that was never populated. Every roster import would have failed.

2. **An already-unlocked resource could not be inserted.** The unlock-consistency constraint required `unlocked_at` to be set whenever `locked = false`, but the trigger that sets it only fired on `UPDATE`. Creating a resource that is immediately available — the normal case for slides posted after class — failed on insert.

---

## Wiring this to the app

The two calls that carry the most risk.

**Paystack webhook.** Verify `x-paystack-signature` first, then:

```sql
update applications
   set payment_status = 'paid', paid_at = now(), payment_ref = $1
 where id = $2 and payment_status <> 'paid';
```

Idempotent by the `payment_status <> 'paid'` guard — Paystack retries, and a retried webhook must not double-record. Never flip this from the redirect (Doc 2 §6.2).

**Summer gate.** One call does rate limiting, lookup, and attempt recording:

```sql
select * from verify_summer_id($1, $2::inet, $3);
```

Returns `ok`, `reason` (`ok` / `not_found` / `rate_limited`), and `retry_after`. It deliberately does not indicate whether the prefix or the number was wrong — no hints for guessing.

---

## Still to build outside the database

- **Auth user creation on approval.** `approve_application()` creates the student row; the Server Action must create the `auth.users` entry and link `students.user_id`.
- **Scheduled jobs** (Doc 2 §8.4 — no job runner exists yet). Vercel Cron is the cheapest next step: nightly `reconcile_kit_points()`, weekly `purge_summer_attempts()`, and payment reminders off `admin_outstanding_payments`.
- **A refund policy.** `reject_application()` returns the refund exposure. It does not decide what to do about it, because Doc 1 §11.3 has no answer yet.


## License

Proprietary — Adegbola Industries.
