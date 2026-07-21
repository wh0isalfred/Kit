# KIT — Architecture & Data

**Document 2 of 3** · Supersedes `Architecture.md`, `Database.md`, `adr/001`–`adr/005`, and `KIT-Architecture-Plan.md` (§3–6).

**Status:** Phase 1 — marketing site built, no Supabase project provisioned yet
**Last revised:** July 2026

**Companion documents:**
- [Document 1 — Product & Decisions](KIT-01-Product-and-Decisions.md) — what KIT is, pricing, permissions, decision record
- [Document 3 — Build Handbook](KIT-03-Build-Handbook.md) — code conventions, components, screens, roadmap

---

## Table of contents

1. [System shape](#1-system-shape)
2. [Stack](#2-stack)
3. [The two access models](#3-the-two-access-models)
4. [The schema](#4-the-schema)
5. [Row Level Security](#5-row-level-security)
6. [Payments](#6-payments)
7. [Identity formats](#7-identity-formats)
8. [Scalability](#8-scalability)
9. [Security posture](#9-security-posture)
10. [Architecture Decision Records](#10-architecture-decision-records)

---

## 1. System shape

One Next.js application. One Vercel deployment. One Supabase project. No separate backend service, no monorepo tooling.

```
kit.ng  ·  single Next.js App Router application on Vercel
│
├── /                     marketing site — home, programmes, why, about
├── /about                about page
├── /contact              contact page
├── /apply                application form → Paystack → Supabase
├── /summer               summer camp landing + ID gate
│   └── /summer/portal    shared summer content page (behind ID cookie)
├── /login                student / teacher / admin auth (Supabase Auth)
├── /student              student dashboard   — role-gated, batch-scoped
├── /teacher              teacher dashboard   — role-gated, batch-scoped
└── /admin                admin dashboard     — full access
    ├── /admin/applications
    ├── /admin/students
    ├── /admin/teachers
    ├── /admin/summer
    ├── /admin/courses
    ├── /admin/payments
    └── /admin/analytics

Supabase
├── Postgres        all data
├── Auth            12-week accounts only (students, teachers, admin)
├── Storage         resources, certificates, recordings
└── RLS             per-role, per-batch read/write enforcement

External
├── Paystack        applications + summer enrolment
└── Resend          transactional email
```

Route groups inside one `app/` directory keep the four logical "apps" (marketing, summer, student platform, admin) organised without workspace tooling. See [ADR 001](#adr-001--single-nextjs--supabase-app).

### What replaces a backend

| Would normally be | Is instead |
|---|---|
| REST/GraphQL API service | Server Actions + Route Handlers |
| ORM layer | `supabase-js` with generated types |
| Auth service | Supabase Auth |
| Authorisation middleware | Postgres RLS policies |
| Object storage service | Supabase Storage |
| Background job runner | *Nothing yet* — see [§8.4](#84-what-has-no-answer-yet) |

That last row is a genuine gap rather than a deliberate omission, and it is named as such.

---

## 2. Stack

### Frontend

| | |
|---|---|
| Framework | Next.js 16, App Router |
| Language | TypeScript, strict mode |
| Styling | Tailwind v4 present, but **all real styling lives in `globals.css`** as hand-written classes with CSS variables |
| Fonts | Plus Jakarta Sans (400/500/600/700/800) via `next/font/google` |
| Compiler | React Compiler enabled (`reactCompiler: true`) |
| Images | `next/image`, `priority` on LCP images |
| Icons | Inline SVG, stroke-based. No icon library |

The Tailwind-installed-but-unused situation is [flagged as tech debt in Document 3](KIT-03-Build-Handbook.md#9-known-issues-and-tech-debt).

### Backend and data

| | |
|---|---|
| Database | Supabase Postgres |
| Auth | Supabase Auth (12-week) + signed cookie (summer) |
| Storage | Supabase Storage |
| Authorisation | Postgres Row Level Security |
| API surface | Server Actions + Route Handlers |
| Payments | Paystack |
| Email | Resend |
| Hosting | Vercel, auto-deploy on `main` |

### Why this stack

It is already proven across three shipped projects (AjoBook, SEE.COM, Bonsai). One vendor covers Postgres, auth, storage, and row-level security behind one dashboard, one key set, one bill. For a solo builder, reusing a known stack is worth more than any individual component being marginally better. Full reasoning in [ADR 001](#adr-001--single-nextjs--supabase-app).

---

## 3. The two access models

KIT has two genuinely different access patterns, and the architecture treats them differently on purpose. Collapsing them into one auth system would be the single most costly mistake available here.

### 3.1 The 12-week programme — real accounts

```
Student/teacher/admin
   → Supabase Auth session
   → profiles row (user_id → role, batch_id)
   → RLS policies scope every query to that role and batch
```

Full accounts, because the data is genuinely per-student and genuinely sensitive: grades, submissions, points, parent contact details. Three roles with materially different visibility. Enforcement is at the database, not the route handler. See [ADR 003](#adr-003--role-based-access-via-supabase-rls).

### 3.2 The summer programme — ID only

```
Summer student
   → types Summer ID into one field
   → server action checks summer_students roster
   → on match: short-lived signed cookie (12–24h)
   → /summer/portal reads one shared summer_content row
```

No Supabase Auth session is created. No password exists. There is nothing to reset.

This is defensible **specifically because the content is not personalised.** Every summer student sees the identical page. There is no per-student data to leak, because there is no per-student data. See [ADR 002](#adr-002--id-only-access-for-the-summer-portal).

The one thing behind the gate that *does* need protecting is the live Google Meet link — which is why the ID is random rather than sequential and the check endpoint is rate-limited. See [ADR 005](#adr-005--summer-id-format).

### 3.3 The rule that keeps this safe

**The ID-only pattern must not be reused for anything holding per-student data.** If the summer portal ever gains individual grades, individual feedback, or individual anything, ADR 002 must be reopened first. The lightness of that auth model is purchased entirely by the shallowness of what sits behind it.

---

## 4. The schema

Postgres via Supabase. RLS enabled on every table holding per-student or per-batch data.

This schema **corrects the version in the superseded `Database.md`**, which could not store what the application form actually collects. Changes are annotated.

### 4.1 Admissions

```sql
create table applications (
  id                  uuid primary key default gen_random_uuid(),

  -- student
  student_name        text not null,
  student_dob         date not null,          -- CHANGED: was `age int`
  student_gender      text,                   -- ADDED
  student_school      text,                   -- ADDED (optional on the form)

  -- parent / guardian
  parent_name         text not null,
  parent_email        text not null,
  parent_phone        text not null,          -- ADDED
  parent_relationship text,                   -- ADDED (Mother/Father/Guardian/Other)

  -- programme
  course_slug         text not null references courses(slug),
  plan                text,                   -- ADDED: 'monthly' | 'upfront' | null (summer)
  amount_due_kobo     bigint not null,        -- ADDED: what was actually charged
  amount_total_kobo   bigint not null,        -- ADDED: full programme cost

  -- payment
  payment_ref         text unique,
  payment_status      text not null default 'pending_payment',
                      -- 'pending_payment' | 'paid' | 'failed' | 'refunded'
  paid_at             timestamptz,            -- ADDED: distinct from created_at

  -- admissions
  status              text not null default 'pending',
                      -- 'pending' | 'approved' | 'rejected'
  reviewed_at         timestamptz,
  rejection_reason    text,
  student_id          uuid references students(id),  -- ADDED: set on approval

  -- context
  referral_source     text,                   -- ADDED
  notes               text,                   -- ADDED: free-text "about your child"
  consent_given       bool not null default false,  -- ADDED
  consent_at          timestamptz,            -- ADDED

  created_at          timestamptz not null default now()
);

create index on applications (status, payment_status);
create index on applications (parent_email);
```

**Why `student_dob` and not `age`:** age is only true on the day it is written. A cohort spanning a birthday reports wrong ages forever, and the 10–16 eligibility check needs to be re-evaluatable against a date, not trusted from a number a parent typed months ago.

**Why two amount columns:** `amount_due_kobo` is what Paystack was asked to charge (₦27,000 for a monthly plan); `amount_total_kobo` is what the programme costs in full (₦81,000). Without both, a monthly-plan row is indistinguishable from a partial payment on an upfront plan, and reconciliation becomes guesswork.

**Why kobo, stored as `bigint`:** Paystack works in kobo. Storing naira and converting at the boundary means the conversion happens in more than one place, and one of them will eventually be wrong. Store what Paystack stores. `bigint` because ₦1,000,000 is 100,000,000 kobo and integer headroom is free.

**Why `payment_status` and `status` are separate columns:** they answer different questions — "has money arrived" and "has a human approved this." Collapsing them into one `status` field produces states like `paid_but_pending` that multiply combinatorially.

### 4.2 The 12-week programme

```sql
create table profiles (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  role      text not null,        -- 'student' | 'teacher' | 'admin'
  batch_id  uuid references batches(id),
  created_at timestamptz not null default now()
);

create table students (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid unique references auth.users(id),
  kit_id       text unique not null,   -- WD2601-0042, see ADR 004
  name         text not null,
  email        text not null,          -- may be the parent's
  batch_id     uuid references batches(id),
  kit_points   int not null default 0, -- cached total; ledger is the truth
  status       text not null default 'active',
                                       -- 'active' | 'completed' | 'withdrawn'
  application_id uuid references applications(id),
  enrolled_at  timestamptz not null default now()
);

create table teachers (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid unique references auth.users(id),
  name     text not null,
  email    text not null,
  batch_id uuid references batches(id)
);

create table batches (
  id           uuid primary key default gen_random_uuid(),
  course_slug  text not null references courses(slug),
  cohort_label text not null,          -- 'B-01', '2026 Cohort 1'
  capacity     int not null default 15,
  teacher_id   uuid references teachers(id),
  starts_at    date,
  ends_at      date,
  created_at   timestamptz not null default now()
);

create table courses (
  slug        text primary key,        -- 'web-development'
  code        text unique not null,    -- 'WD' — used in KIT ID, see ADR 004
  title       text not null,
  type        text not null,           -- 'term' | 'summer'
  track       text,                    -- '10-12' | '13-15' | null
  description text,
  status      text not null default 'coming_soon',  -- 'live' | 'coming_soon'
  price_kobo         bigint,           -- upfront price
  price_monthly_kobo bigint,           -- per-instalment price, null if N/A
  sort_order  int not null default 0
);

create table resources (
  id          uuid primary key default gen_random_uuid(),
  batch_id    uuid not null references batches(id) on delete cascade,
  title       text not null,
  url         text not null,
  locked      bool not null default true,
  unlocked_at timestamptz,
  created_at  timestamptz not null default now()
);

create table assignments (
  id          uuid primary key default gen_random_uuid(),
  batch_id    uuid not null references batches(id) on delete cascade,
  title       text not null,
  description text,
  due_at      timestamptz,
  created_at  timestamptz not null default now()
);

create table submissions (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id    uuid not null references students(id) on delete cascade,
  content       text,
  grade         int,
  graded_at     timestamptz,
  graded_by     uuid references teachers(id),
  submitted_at  timestamptz not null default now(),
  unique (assignment_id, student_id)
);

create table kit_points_ledger (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  points     int not null,
  reason     text not null,   -- 'punctuality' | 'class_task' | 'first_correct'
                              -- | 'assignment' | 'grade' | 'manual'
  ref_id     uuid,            -- optional link to the assignment/submission
  created_at timestamptz not null default now()
);

create index on kit_points_ledger (student_id, created_at desc);

create table announcements (
  id         uuid primary key default gen_random_uuid(),
  batch_id   uuid not null references batches(id) on delete cascade,
  message    text not null,
  created_at timestamptz not null default now()
);
```

**Additions worth noting:**

- `courses.slug` is now the primary key and `code` is a separate column. The KIT ID generator needs a short course code (`WD`, `AI`), and the URL/form needs a slug (`web-development`). Deriving one from the other is guesswork; store both. **This is what [Document 1 §10.2](KIT-01-Product-and-Decisions.md#102-the-course-catalogue-does-not-agree-with-itself) is blocked on** — Python and Game Development have no assigned code yet.
- `courses.price_kobo` / `price_monthly_kobo` move pricing out of the component constant and into data, matching the "courses as data" principle. Until Phase 2, the constants in `ApplicationForm.tsx` are the source of truth and this column is unused.
- `students.status` distinguishes active from completed from withdrawn. Without it, a finished cohort pollutes every active-student count forever.
- `submissions` has a uniqueness constraint on `(assignment_id, student_id)` — one submission per student per assignment. Without it, a double-click creates two rows and the grade lands on the wrong one.
- `kit_points_ledger.ref_id` lets a points award point back at what caused it, which is what makes "why do I have 120 points" answerable.

### 4.3 The summer programme

```sql
create table summer_students (
  id          uuid primary key default gen_random_uuid(),
  summer_id   text unique not null,   -- SM26734, see ADR 005
  name        text not null,
  cohort_year int not null,
  application_id uuid references applications(id),
  created_at  timestamptz not null default now()
);

create index on summer_students (summer_id);

create table summer_content (
  id            uuid primary key default gen_random_uuid(),
  cohort_year   int not null,
  week          int not null,
  published     bool not null default false,   -- ADDED
  meet_link     text,
  class_title   text,                          -- ADDED
  homework      jsonb,
  announcements jsonb,
  schedule      jsonb,
  recordings    jsonb,
  resources     jsonb,
  updated_at    timestamptz not null default now(),
  unique (cohort_year, week)
);
```

`summer_content` is effectively a singleton per cohort-week: admin writes one row, every summer student reads it.

**Why `published` was added:** the wireframes explicitly call out the state everyone forgets — *the portal exists before admin has typed anything into it.* Without a published flag, an unfilled week renders as a page of empty sections, which reads as broken software rather than as "materials coming soon."

**Why `class_title` was added:** the portal's most prominent element is "Today's Class — [title]". There was nowhere to store the title.

### 4.4 What the schema still lacks

Named honestly rather than discovered later:

- **Attendance.** The admin student-detail wireframe has an Attendance tab, KIT Points award punctuality, and nothing records who joined a class or when. Needs an `attendance` table before Phase 4.
- **Payment instalments.** Monthly-plan months 2 and 3 have nowhere to live. Currently a spreadsheet by deliberate choice ([Document 1 §9.4](KIT-01-Product-and-Decisions.md#94-pushback-do-not-build-paystack-subscriptions-yet)) — but when that stops scaling, it needs a `payments` table, not more columns on `applications`.
- **Certificates.** Referenced in the admin wireframe, absent from the schema.
- **Organisations / locations.** Needed for school partnerships or a second city ([Document 1 §12.3](KIT-01-Product-and-Decisions.md#123-where-the-model-grows)). Deliberately not built speculatively.
- **Audit log.** Admin actions — approvals, rejections, grade overrides, points adjustments — are not recorded anywhere. For a system handling children's records and money, this becomes uncomfortable at the first dispute.

---

## 5. Row Level Security

### 5.1 The principle

The database is the enforcement point. Application-level filtering is defence in depth, not the mechanism. A forgotten `WHERE batch_id = ...` in one new route handler must not be able to expose another family's child. See [ADR 003](#adr-003--role-based-access-via-supabase-rls).

### 5.2 The shape of every policy

Every policy resolves through `profiles`, keyed to `auth.uid()`:

```sql
-- Reusable helpers
create function current_role() returns text
  language sql stable security definer as $$
    select role from profiles where user_id = auth.uid()
  $$;

create function current_batch() returns uuid
  language sql stable security definer as $$
    select batch_id from profiles where user_id = auth.uid()
  $$;
```

Applied to a batch-scoped table:

```sql
alter table resources enable row level security;

-- students and teachers see their own batch; admin sees everything
create policy resources_read on resources for select
  using (
    current_role() = 'admin'
    or batch_id = current_batch()
  );

-- students never write resources; teachers write only their own batch
create policy resources_write on resources for all
  using (
    current_role() = 'admin'
    or (current_role() = 'teacher' and batch_id = current_batch())
  );
```

Applied to a student-scoped table:

```sql
alter table submissions enable row level security;

create policy submissions_student_own on submissions for select
  using (
    current_role() = 'admin'
    or student_id in (select id from students where user_id = auth.uid())
    or (current_role() = 'teacher'
        and student_id in (select id from students where batch_id = current_batch()))
  );
```

### 5.3 The visibility matrix

| Table | Student | Teacher | Admin |
|---|---|---|---|
| `students` | own row | own batch, **limited columns** | all, all columns |
| `teachers` | own batch's teacher | own row | all |
| `batches` | own | own | all |
| `resources` | own batch, **unlocked only** | own batch | all |
| `assignments` | own batch | own batch | all |
| `submissions` | own | own batch | all |
| `kit_points_ledger` | own | own batch | all |
| `announcements` | own batch | own batch | all |
| `applications` | — | — | all |
| `courses` | public read | public read | all |
| `summer_*` | — (cookie path) | — | all |

### 5.4 Two things RLS alone will not give you

**Column-level teacher restriction.** Teachers must see only *name, email, batch, KIT score* — not phone, not parent contact. RLS gates rows, not columns. This needs either a Postgres view exposing only the permitted columns, or column-level grants. **Do not rely on the UI simply not rendering the extra fields** — the row still travels to the client, and anyone can open a network tab.

**Resource locking.** A student must not receive a locked resource. `locked = true` filtering belongs inside the policy itself, not in the query:

```sql
create policy resources_student_read on resources for select
  using (
    current_role() in ('admin','teacher')
    or (batch_id = current_batch() and locked = false)
  );
```

If locking is filtered in application code only, a locked resource's URL is one API call away from any student who is curious.

---

## 6. Payments

### 6.1 The flow

```
Parent submits the application form
   ↓
Server Action:
   1. validate server-side (never trust the client)
   2. insert applications row → status 'pending_payment'
   3. initialise a Paystack transaction for amount_due_kobo
   4. return the checkout URL
   ↓
Redirect to Paystack
   ↓
Parent pays
   ↓
┌─────────────────────┬──────────────────────────────┐
│ Redirect back       │ Paystack webhook             │
│ to /apply/success   │ → /api/paystack/webhook      │
│                     │                              │
│ COSMETIC ONLY       │ THE SOURCE OF TRUTH          │
│ Shows a nice page   │ Verify x-paystack-signature  │
│ Proves nothing      │ → mark paid, set paid_at     │
│                     │ → notify admin via Resend    │
└─────────────────────┴──────────────────────────────┘
```

### 6.2 The one thing people get wrong

**The redirect is not proof of payment.** A user can close the tab, lose signal mid-transaction, or navigate directly to the success URL. Only the webhook — with `x-paystack-signature` verified against the secret key — is trusted to flip a row to paid.

A success page that marks the application paid is a free-enrolment vulnerability that any curious teenager will find, and KIT's users are curious teenagers.

### 6.3 Environment variables

```
PAYSTACK_SECRET_KEY=sk_live_xxx      # server only — never NEXT_PUBLIC_
NEXT_PUBLIC_PAYSTACK_KEY=pk_live_xxx # publishable, safe client-side
RESEND_API_KEY=re_xxx                # server only
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx        # server only — bypasses RLS entirely
```

Two of these end the project if leaked: `SUPABASE_SERVICE_ROLE_KEY` bypasses every RLS policy in the database, and `PAYSTACK_SECRET_KEY` can move money. Neither may ever appear behind a `NEXT_PUBLIC_` prefix, be logged, or be returned in an error message.

### 6.4 Setup checklist before Phase 2

- [ ] Paystack account with live keys. **Verify Nigerian onboarding requirements** — business registration vs. individual/starter account. Test keys work instantly, so the entire flow can be built today either way, but confirm this before planning a launch date around it.
- [ ] Webhook URL registered in the Paystack dashboard, pointing at `/api/paystack/webhook`
- [ ] Signature verification implemented and tested with a deliberately bad signature
- [ ] Prices confirmed in kobo (₦75,000 = `7500000`)
- [ ] Idempotency on the webhook — Paystack retries, and a retried webhook must not create two students

---

## 7. Identity formats

### 7.1 KIT ID — 12-week programme

```
WD  26  01  -  0042
│   │   │      │
│   │   │      └── student's sequential number within the batch
│   │   └───────── cohort number within that year
│   └───────────── enrolment year
└───────────────── course code
```

Generated automatically on admission approval, once the student is placed in a batch. Human-readable by design: an admin scanning a list can tell course, year, cohort, and student at a glance. Sequential and predictable, which is fine — it identifies a student inside an already-authenticated system, it is not a security gate. See [ADR 004](#adr-004--kit-id-format).

**Blocked:** codes exist for `WD` (Web Design) and `AI` only. Python and 3D Game Development have none, so a Python student cannot be issued an ID today. See [Document 1 §10.2](KIT-01-Product-and-Decisions.md#102-the-course-catalogue-does-not-agree-with-itself).

### 7.2 Summer ID

```
SM  26  734
│   │   │
│   │   └── RANDOM 3-digit suffix — not a counter
│   └────── cohort year
└────────── prefix
```

Random specifically because this ID *is* the credential guarding a live video call with children in it. See [ADR 005](#adr-005--summer-id-format).

**Two open items:**
1. Format disagreement — ADR says `SM26734`, the login wireframe shows `SM26-___` with a hyphen. Settle before building the gate.
2. A 3-digit suffix is a 1,000-value space. At 48 students that is 4.8% occupancy and brute force is impractical with rate limiting. **At ~100+ summer students, widen to 4 digits.**

---

## 8. Scalability

The honest framing: **the software is not the constraint, and will not be for a long time.** [Document 1 §12](KIT-01-Product-and-Decisions.md#12-growth-and-scale--the-business-side) covers the business ceilings. This section covers the technical ones, in the order they will actually be hit.

### 8.1 What scales without any work

| Dimension | Ceiling | Why |
|---|---|---|
| Concurrent readers on the marketing site | Effectively unbounded | Static/ISR pages on Vercel's CDN |
| Summer portal readers | Thousands | One shared row, cacheable, identical for everyone |
| Students in the database | Hundreds of thousands | Postgres does not notice 500 rows |
| Batches | Unbounded | Just rows |
| Courses | Unbounded | Data, not code — adding one is an insert |
| File storage | Terabytes | Supabase Storage, priced linearly |

The summer portal in particular is close to a best-case scaling story: one row, read by everyone, changing a few times a day. It could serve an order of magnitude more students than KIT will ever have with no architectural change.

### 8.2 What needs attention at moderate scale

**Live class grading (Phase 6 sandbox).** Every student in a class submitting an answer at the same moment, with the teacher grading in real time, is the only genuinely real-time workload in the system. At 15 students per batch this is trivial. At several batches running simultaneously it needs a real transport — Supabase Realtime is the natural fit given the stack, but this is unbuilt and unbenchmarked. Deliberately deferred to Phase 6 ([Document 1 §9.7](KIT-01-Product-and-Decisions.md#97-pushback-defer-the-live-sandbox-entirely)).

**Email volume.** Resend's free tier is 3,000/month. Batch-wide emails on class start, new assignment, and resource unlock mean roughly `batches × 15 × events_per_week`. Ten batches at three events a week is ~1,800/month — inside the free tier, but not by a wide margin. A paid tier is a small cost, not an architectural problem, but it will arrive sooner than expected.

**KIT Points recalculation.** `students.kit_points` is a cached total over `kit_points_ledger`. If it is maintained by a trigger, that trigger fires on every award — fine at this scale. What matters more is that a **reconciliation path exists**: a way to recompute the cached total from the ledger when they inevitably diverge. Build that with the trigger, not after the first discrepancy.

**Admin list views.** `/admin/students` with a few hundred students needs pagination and server-side search. Loading every student to filter client-side works at 50 and is painful at 500. Build the pagination when the list is written, not when it is slow.

### 8.3 What breaks first, and the trigger to act

| Breaks | At roughly | Do this |
|---|---|---|
| Manual monthly payment chasing | ~50 monthly-plan students | Build a `payments` table + reminder emails. **Not** Paystack subscriptions — revisit that only if card-only is acceptable by then |
| Manual application approval | ~100 applications/cohort | Bulk-approve, or auto-approve on verified payment with review as an exception path |
| Summer ID space | ~100 summer students | 4-digit suffix |
| One teacher, one batch | Teacher supply | Not a software problem. Do not try to solve it with software |
| Single Supabase project | Far beyond any realistic KIT scale | Nothing. This will not happen |

### 8.4 What has no answer yet

**Background jobs.** There is no job runner. Everything happens inside a request. Things that will eventually need to happen out-of-band:

- retrying a failed login-details email
- sending payment reminders for monthly-plan months 2 and 3
- nightly reconciliation of `kit_points` against the ledger
- generating certificates at cohort end

Vercel Cron covers scheduled work and is the cheapest next step. Anything needing a real queue is the point at which [ADR 001](#adr-001--single-nextjs--supabase-app) gets reopened — and that is exactly the trigger the ADR names.

**Idempotency generally.** The webhook needs it. The approve chain needs it. Neither has it specified yet, and both are places where a retry currently creates a duplicate.

### 8.5 The scaling principle

Reused verbatim from ADR 001, because it applies to every item above: **build the service when the manual version becomes the bottleneck, not before.** The trigger is never a date and never a hypothetical — it is an observed pain. Every row in §8.3 names an observable trigger rather than a projection.

---

## 9. Security posture

### 9.1 What is genuinely at risk

This system holds children's names, ages, schools, parents' phone numbers and email addresses, and payment records. That is a more sensitive dataset than most B2B SaaS, and the users are minors. The posture should reflect that.

### 9.2 Controls in place by design

| Risk | Control |
|---|---|
| Cross-batch data access | RLS at the database, not the route ([ADR 003](#adr-003--role-based-access-via-supabase-rls)) |
| Summer ID brute force | Random suffix ([ADR 005](#adr-005--summer-id-format)) + per-IP rate limiting ([ADR 002](#adr-002--id-only-access-for-the-summer-portal)) |
| Payment spoofing | Webhook signature verification, redirect never trusted ([§6.2](#62-the-one-thing-people-get-wrong)) |
| Locked resource access | `locked = false` inside the RLS policy, not the query ([§5.4](#54-two-things-rls-alone-will-not-give-you)) |
| Teacher over-visibility | Column-restricted view, not UI omission ([§5.4](#54-two-things-rls-alone-will-not-give-you)) |
| Credential leakage | Service-role and Paystack secret keys server-only, never `NEXT_PUBLIC_` |

### 9.3 Deliberate accepted risks

**The summer portal has no real authentication.** Anyone holding a valid Summer ID gets in, and IDs will be shared between friends. Accepted because the content is identical for everyone and non-sensitive. The Meet link is the only thing worth protecting, and it is protected by the ID being unguessable rather than by the ID being secret. **The moment per-student data appears behind that gate, this is no longer accepted** — reopen ADR 002.

**Sequential, guessable KIT IDs.** Accepted because they sit behind a real login and identify rather than authenticate.

### 9.4 Gaps to close before real students

- [ ] **Rate limiting is specified but unbuilt.** ADR 002 requires it. It does not exist yet. The summer gate must not ship without it.
- [ ] **No audit log.** Approvals, rejections, grade changes, and points adjustments leave no trace. First dispute with a parent, this will be missed badly.
- [ ] **Server-side validation.** The application form validates in the browser. All of it must be re-validated in the Server Action — age eligibility, programme validity, amount. A client-side price is a suggestion, not a fact.
- [ ] **Consent record.** `consent_given` is captured; what exactly was consented to, and the version of that text, is not. For a service to minors, store the consent text version alongside the timestamp.
- [ ] **Data retention.** No policy on how long applications from rejected or withdrawn students are kept. Children's personal data with no deletion policy is a liability that grows quietly.
- [ ] **Meet link exposure.** The link is visible to every summer student and trivially forwardable. Consider per-cohort rotation, or Meet's own admit-from-lobby controls, before the first live class.

---

## 10. Architecture Decision Records

The five ADRs below replace the individual files `adr/001` through `adr/005`. They are reproduced in full, not summarised — the reasoning is the point.

---

### ADR 001 — Single Next.js + Supabase app

**Status:** Accepted

**Context.** Early architecture drafts proposed a separate NestJS backend on Railway, Postgres via Neon with Prisma, Clerk for auth, Cloudflare R2 for storage, and a Turborepo monorepo — a legitimate team-scale architecture.

KIT is built solo, with AI agents as the development team, on an existing stack (Next.js, Supabase, Paystack, Vercel) already proven across AjoBook, SEE.COM, and Bonsai.

**Decision.** Build KIT as one Next.js (App Router) application. Server Actions and Route Handlers replace a separate API service. Supabase provides Postgres, Auth, Storage, and RLS. No monorepo tooling until there is a genuine second deployable — for example a native mobile app.

**Alternatives considered.**
- *NestJS + Railway + Neon + Prisma + Clerk* — rejected. Four extra vendors, a second codebase to keep in sync, and a new framework to learn, for a v1 that does not need service-level isolation.
- *Turborepo monorepo from day one* — rejected. Workspace tooling overhead before there is a second app to justify it.

**Consequences.**
- Faster to build with existing skills; one deploy target; one bill.
- If KIT later needs background jobs, heavy concurrency, or a separate mobile client hitting the same API, revisit and peel out a service **then** — not speculatively now.
- The absence of a job runner is a known consequence, tracked at [§8.4](#84-what-has-no-answer-yet). Vercel Cron is the intended first step before any service extraction.

---

### ADR 002 — ID-only access for the Summer Portal

**Status:** Accepted

**Context.** The Summer Portal is not personalised — every student sees the same page: Meet link, resources, homework, announcements. Full account creation (email + password, or magic link) is unnecessary friction for a 3-week programme serving one shared page to children.

**Decision.** Students enter a Summer ID (e.g. `SM26734`) into a single field. A Server Action checks it against the `summer_students` roster. On match, a short-lived signed cookie (12–24h) grants access to `/summer/portal`. No Supabase Auth session is created.

To prevent the Meet link being reachable by a stranger guessing IDs:
- the ID-check endpoint is **rate-limited per IP**
- Summer IDs are **not sequential or enumerable** — a random suffix, not an incrementing counter (see [ADR 005](#adr-005--summer-id-format))

**Alternatives considered.**
- *Full Supabase Auth account per summer student* — rejected. The content is not sensitive per-student data, and account creation overhead does not match a 3-week programme aimed at 10-year-olds.
- *No rate limiting on the ID check* — rejected. Even non-sensitive content sits behind a live video call link; brute-forcing it is a real, if low-severity, risk worth closing cheaply.

**Consequences.**
- Very low friction: one input, no password-reset flows to build or support.
- **Content sensitivity must stay low by design.** This pattern must not be reused for anything requiring per-student privacy — grades, personal data — without reopening this ADR.
- Rate limiting is a hard requirement of this decision and is **currently unimplemented** ([§9.4](#94-gaps-to-close-before-real-students)). The gate must not ship without it.

---

### ADR 003 — Role-based access via Supabase RLS

**Status:** Accepted

**Context.** The 12-week platform has three roles with different visibility: Admin (everything), Teacher (own batch only, limited student fields), Student (own batch only, own data). This has to be enforced somewhere.

**Decision.** Store role and batch on a `profiles` table keyed to `auth.uid()`. Enforce visibility with Postgres Row Level Security policies rather than filtering in application code. Every table holding batch- or student-scoped data gets a policy joining back to `profiles`.

**Alternatives considered.**
- *App-level filtering only — trust the API layer to add `WHERE batch_id = ...`* — rejected as the sole mechanism. A missed filter in one route becomes a data leak. RLS makes the database itself the enforcement point, so a bug in a Server Action cannot accidentally return another batch's data.

**Consequences.**
- Slightly more setup cost per table, but access control cannot be bypassed by a forgotten `WHERE` clause in a new route.
- Policies must be revisited whenever a new role or table is added.
- **RLS does not solve column-level restriction.** The teacher's limited view of student fields needs a restricted view or column grants, not a row policy ([§5.4](#54-two-things-rls-alone-will-not-give-you)).

---

### ADR 004 — KIT ID format

**Status:** Accepted

**Context.** Every enrolled student needs a unique, human-readable ID that is meaningful at a glance — encoding course, year, cohort, and student number.

**Decision.** Format `[COURSE][YY][COHORT]-[NUMBER]`, e.g. `WD2601-0042`.

- `WD` — course code (`WD` = Web Design, `AI` = AI, …)
- `26` — enrolment year
- `01` — cohort number within that year
- `0042` — sequential student number within the batch

Generated automatically on admission approval, once a student is placed into a batch.

**Alternatives considered.**
- *Random UUID as the visible ID* — rejected. Not human-readable; gives admin and teachers no at-a-glance context when scanning a list of students.

**Consequences.**
- IDs are predictable and sequential by design. This is fine: the KIT ID identifies a student *within* an already-authenticated system and is not a security gate — unlike the Summer ID ([ADR 005](#adr-005--summer-id-format)).
- **Course codes must exist for every launchable course.** Only `WD` and `AI` are defined; Python and 3D Game Development have none, which currently blocks issuing IDs for those tracks.

---

### ADR 005 — Summer ID format

**Status:** Accepted

**Context.** Unlike the KIT ID, the Summer ID doubles as the *only* access credential for the Summer Portal (see [ADR 002](#adr-002--id-only-access-for-the-summer-portal)). That changes the requirements: it cannot be trivially guessable in sequence.

**Decision.** Format `SM[YY][RANDOM3]`, e.g. `SM26734` — `SM` prefix, two-digit year, then a **randomly assigned** 3-digit suffix, not a sequential counter. Assigned at enrolment; uniqueness enforced at the database level.

**Alternatives considered.**
- *Sequential numbering (`SM26001`, `SM26002`, …)* — rejected. Trivially enumerable, which matters specifically because this ID is also the auth mechanism, unlike the KIT ID in ADR 004 which sits behind a real login.

**Consequences.**
- Slightly less orderly at a glance than a sequential ID, but this is the credential guarding a live video call with children on it — worth the trade.
- Combined with rate limiting ([ADR 002](#adr-002--id-only-access-for-the-summer-portal)), brute-forcing a valid ID is impractical at realistic cohort sizes — dozens, not thousands.
- **A 3-digit suffix is a 1,000-value space.** At ~48 students, 4.8% occupancy. At ~100+ students, widen to 4 digits; the guessing odds degrade linearly with cohort growth.
- Format must be reconciled with the login wireframe, which shows a hyphen (`SM26-___`) this ADR does not specify.

---

*Continue to [Document 3 — Build Handbook](KIT-03-Build-Handbook.md).*
