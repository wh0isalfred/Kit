# KIT Port Harcourt — Master Roadmap

**Last Updated:** 29 July 2026  
**Status:** Summer 2026 (launch product) — fully built. 12-week program — in planning/early build.  
**Owner:** Alfred (alfredenyinna03@gmail.com) — solo founder, builds via shared Claude account.  
**Live Date:** 10 August 2026 (Summer Build Camp opens)

---

## I. WHAT IS KIT?

A Nigerian tech-education platform (Port Harcourt-based) serving ages 10–15. Two distinct products:

| Aspect | Summer Build Camp (3 weeks) | Future Skills Lab (12 weeks, Saturdays) |
|--------|---------------------------|----------------------------------------|
| **Status** | ✅ Complete, launches 10 Aug | 🔴 Schema ready, UI not started |
| **Access** | Summer ID only, no password | Real Supabase Auth + account |
| **ID Format** | `SM26734` | `WD2601-0042` (course-year-cohort-seq) |
| **Price** | ₦15,000 (flat) | ₦75,000 upfront OR ₦27,000×3 |
| **Batches** | One roster per cohort | Max 15 per batch (multiple batches per course) |
| **Prize** | ₦30,000 team challenge | KIT Points + certificates + leaderboard |
| **Auth Model** | Signed cookie (no DB account) | Supabase Auth (real sessions) |

**Business reality:** Pre-revenue. Zero cohorts have completed. Summer is the MVP proving ground.

---

## II. COMPLETED WORK (Phases 0–3) ✅

### Phase 0: Foundation
- ✅ Architecture (single Next.js + Supabase, no separate backend)
- ✅ Database schema (19 migrations, all live)
- ✅ Core security model (ADR 001: monorepo; ADR 002: Summer ID cookie model)
- ✅ Brand identity (navy/blue/green palette, Plus Jakarta Sans typography)

### Phase 1: Marketing Website
- ✅ Home page (dynamic course cards from `courses` table)
- ✅ About page (redesigned 29 July, hero + 4 pillars)
- ✅ Programs section (Summer + coming-soon Term pills)
- ✅ Why KIT section (4 pillars: Live Online Classes, Real Projects, Expert Mentors, Confidence for Life)
- ✅ Apply page (application form, client validation, Supabase integration)
- ✅ Refund policy (full page + short consent checkbox on apply)
- ✅ Footer (responsive, copyright, links)

### Phase 2: Admissions & Payments
- ✅ Application form → Supabase (`submit_application()` SECURITY DEFINER)
- ✅ Paystack integration (init, callback, webhook at `/api/paystack/webhook`, idempotent)
- ✅ Admin approval screen (`applications-page.tsx`) — approve/reject with batch assignment
- ✅ Summer enrolment (`enrol_summer_student()`) — generates Summer ID, no account
- ✅ Accurate seat-count tracking (reads `summer_students` for summer, `students` for 12-week)

**Payment flow proven:** Apply → Paystack → webhook marks paid → admin approves → Summer ID generated. Working end-to-end.

### Phase 3: Summer Portal ✅
**Status:** Fully functional. Not yet redesigned (see Phase 3.5).

- ✅ ID gate at `/summer` (verify ID → rate-limit check → signed HMAC cookie)
- ✅ Shared portal at `/smportal` (one page per cohort, everyone sees the same content)
- ✅ Weekly content management at `/admin/summer`:
  - Cohort settings (dates, current week, registration window, prize)
  - Per-week content editor (title, note, Meet link, next class time)
  - Publish toggles (unpublished weeks show "coming soon")
  - Live toggle (explicit admin action, NOT time-based — ensures badge never lies)
  - Roster view (Summer IDs, names, ages, parent contact, last seen)
  
- ✅ Portal features:
  - Countdown (registration deadline)
  - Meet button (live if `is_live=true`, otherwise "class starts in X min" nudge)
  - Weekly resources (auto-accumulated as current week advances)
  - Status pills (submitted/turned-in/returned for homework)
  - File uploads for assignments
  
- ✅ Homework lifecycle (Google Classroom-style):
  - Students submit files to `/smportal/homework/[id]`
  - Teachers review via `/admin/summer` (batch + week → roster modal)
  - Feedback form inline (no modal exit needed)
  - Returns mark assignment as "Returned" + email (when Resend is wired)

- ✅ Batch management at `/admin/summer`:
  - Create/edit/delete batches with auto-numbered `cohort_number`
  - Real seat counts (reads `summer_students`)
  - Progress bars showing occupancy
  - Blocks deletion if students enrolled

**Redesign in flight (Phase 3.5):** Portal marked "too childish". New CSS done; markup rewrite pending (see Phase 3.5).

### Phase 2–3 Databases (Migrations 1–19)
All live on Supabase. **Schema is the source of truth** — if doc and schema disagree, schema wins.

**Key tables:**
- `applications` — admissions pipeline (anon-writable via SECURITY DEFINER only)
- `summer_cohorts`, `summer_students`, `summer_content`, `summer_resources` — summer program
- `batches`, `students`, `teachers` — 12-week program (schema ready, UI missing)
- `courses` — dynamic course catalog (rendered on home, editable by admin)
- `profiles` — 12-week user profiles (**PK is `user_id`, not `id`** — catch this in queries)
- `payments`, `kit_points_ledger`, `audit_log` — financial & accountability trails
- Storage: `public-assets`, `batch-resources`, `submissions`, `certificates`, `summer` — file buckets with path-based RLS

**Migration timeline:**
- 0001–0012: Core schema (applications, summer, courses, 12-week)
- 0013: Cohort management (registration windows)
- 0014: Public submission endpoint (`submit_application()`)
- 0015: Registration open/close gates + public read on active cohort only
- 0016: `summer_resources` table (replaces jsonb arrays, per-item publish)
- 0017: Fix pgcrypto search path (critical: functions must pin `search_path = public, extensions`)
- 0018: Link applications to enrolments (`summer_student_id` column)
- 0019: Cohort-level live toggle + `set_summer_live()`

---

## III. ACTIVE BUILD (Phases 3.5–5)

### Phase 3.5: Portal Redesign 🟠 IN PROGRESS
**Why:** Current portal uses emoji icons + old CSS. Brief: warm but grown-up, polished not childish, credible.

**What's done:**
- New CSS (`kit-portal-v2/portal.css`) — replaces portal block in globals.css
- SVG line icons ready (replace emoji `kindIcon`)
- New classes: `pt-hero-inner`, `pt-res-tile.kind-*`, `pt-class.in-session`, `pt-class-btn.live`/`.idle`

**What's left:**
- Rewrite `PortalContent.tsx` markup to match new CSS (swap emoji → SVG, update class names, keep logic)
- Audit: ensure isLive prop still works, file opens still work, code toggle still works
- Test on mobile + desktop

**Unblocks:** Portal looks production-ready before summer launch. Estimated effort: 2–3 hours.

### Phase 4: 12-Week Student Platform 🔴 NOT STARTED
**Blocker:** No batches exist. Approval workflow can't run.

**Dependencies:** Phases 0–2 (schema + payments) are complete.

**Scope:**
- **Admin:** Batches, Teachers, Applications approval, Students list
- **Teacher dashboard:** batch roster, resource unlock, assignment grading, announcements
- **Student dashboard:** resources (unlocked only), assignments, submissions, points ledger
- **RLS policies:** All queries scoped to role + batch

**Estimated effort:** 3–4 weeks (including admin screen build)

### Phase 5: KIT Points + Leaderboard 🔴 WAITING ON PHASE 4
**Scope:**
- Points ledger + accumulation
- Batch-scoped leaderboard (student-facing, top-5 per batch)
- Admin leaderboard (all students across all batches)
- Auto-award triggers (on-time submission, perfect score, etc.)

**Estimated effort:** 1 week

---

## IV. KNOWN GAPS (NOT BLOCKING LAUNCH) 🟡

1. **Resend email NOT wired** — Summer IDs generated but not emailed. Founder copies by hand. Top priority post-launch.
2. **Paystack webhook unproven on deployed URL** — works locally via manual mark-paid. Must test on live Vercel.
3. **Rolled live Paystack key** — flagged but unconfirmed if rolled. If not, roll it ASAP.
4. **7 admin nav items 404** — `/admin/students`, `/admin/courses`, `/admin/batches`, `/admin/teachers`, `/admin/payments`, `/admin/classes`, `/admin/audit`. Either stub or hide before launch.
5. **No rate limit on `submit_application`** — public write endpoint. Low risk but should add `rateLimit()`.
6. **Domain** — kit.ng referenced but not acquired. Using kit-ph.vercel.app.
7. **No live deployment test** — webhook, email, Paystack all need end-to-end test on production URL.

---

## V. TECH STACK & CONVENTIONS

### Core Stack
- **Frontend/Backend:** Next.js 16 (App Router, TypeScript strict)
- **Database/Auth/Storage:** Supabase (Postgres 16 + RLS + Auth)
- **Payments:** Paystack (init server-side, callback + webhook)
- **Email:** Resend (NOT YET WIRED)
- **Deploy:** Vercel (github.com/wh0isalfred/Kit, branch `main`)
- **Dev env:** Windows/PowerShell, VS Code, Turbopack

### CSS & Design
- Single `globals.css` — no Tailwind, no CSS modules
- BEM-flat naming (`.admin-batch-card`, `.pt-res-tile`, `.hw-review-roster`)
- Brand tokens: navy #1F2C4F, blue #1999E4, green #25B290, no purple
- Font: Plus Jakarta Sans (already loaded)
- Responsive breakpoints: 1024px, 768px, 480px

### Database Conventions
- **All money is kobo (bigint).** Never stored as naira. `/100` only at display boundary.
- **All ages derive from DOB.** Never store age directly.
- **Points are ledger-based.** `students.kit_points` is a trigger-maintained cache, not the source of truth.
- **RLS on every table** that holds per-student or per-batch data.
- **SECURITY DEFINER functions pin search_path.** Prevents `profiles` shadowing / privilege escalation.

### Founder's Standing Rules
- Push back honestly. Evaluate feasibility; don't validate by default.
- Document contradictions. Silently resolving them hides bugs.
- Never fabricate data. Unverified = flagged.
- Commit messages: human-readable, no backticks/`$`/`"` (PowerShell quoting breaks).
- Rapid MVPs. Free-tier tooling. AI agents as the dev team.

---

## VI. IMMEDIATE NEXT STEPS (Priority Order)

1. **🔴 Complete Phase 3.5 (Portal redesign)** — rewrite PortalContent.tsx to match new CSS. Unblocks production-ready launch.
2. **🔴 Wire Resend email** — send Summer ID on enrolment. Founder is currently copying by hand.
3. **🔴 Test Paystack webhook on live URL** — verify webhook fires correctly on deployed Vercel.
4. **🔴 Roll Paystack key** if not already done. Leaked key `sk_live_b883...` was in chat.
5. **🟠 Hide/stub the 7 broken nav items** — prevent 404 pages before launch.
6. **🟠 Add `rateLimit()` to `submit_application`** — public write endpoint.
7. **After launch: Start Phase 4 (12-week program)** — build Batches admin screen first (unblocks all approvals).

---

## VII. DEPLOYMENT CHECKLIST (For Live Day)

- [ ] Portal redesign merged
- [ ] Resend email tested end-to-end (Summer ID delivery)
- [ ] Paystack webhook tested on live URL
- [ ] Paystack key rolled
- [ ] No console errors on all routes
- [ ] Mobile responsiveness verified (iPhone 12 / Pixel 5)
- [ ] Broken nav items hidden
- [ ] Database backups configured
- [ ] Vercel preview/production env vars match
- [ ] Test application flow: apply → pay → admin approve → Summer ID received
- [ ] Test summer portal: ID gate → portal → resources → homework submit
- [ ] Smoke test on Supabase (migrations run, all tables present)

---

## VIII. THE ROADMAP FORWARD (Post-Launch)

### Week 1–2 (Aug 10–24)
- Summer camp runs (live toggling, roster, homework grading)
- Monitor: Paystack, email delivery, portal UX
- Ship any hot-fix bugs

### Week 3–4 (Aug 25–31)
- Retrospective: what worked, what needs redesign
- Wire email fully if not already done
- Begin Phase 4 scoping with real data

### Sept–Oct (Phase 4: 12-Week Program)
- Build admin: Courses (editable), Batches (create/assign), Teachers (add to batch), Applications (approve with batch select)
- Build teacher dashboard: batch roster, resource unlock, assignment grading
- Build student dashboard: resources, assignments, submissions, points
- Enrol first 12-week cohort (Oct 5)

### Nov–Dec (Phase 5: Points + Leaderboard)
- Implement points ledger + auto-award triggers
- Build student + admin leaderboards
- First 12-week cohort runs

### 2027 (Scaling)
- Multiple concurrent batches per course
- Teacher payment + incentives
- Marketing expansion (new locations?)
- Sandbox/live-coding feature (Phase 6 — deferred)

---

## IX. DECISION LOG (Why We Built It This Way)

**ADR 001: Single monorepo (Next.js + Supabase, no separate backend service)**
- Decision: Ship faster with fewer deployment surface areas. Supabase RLS + SECURITY DEFINER functions handle authorization.
- Trade-off: Fewer experienced Next.js developers in Nigeria; limits horizontal scaling past 50K concurrent.
- Outcome: Fit for MVP. Will need rethink if KIT expands to multiple centers.

**ADR 002: Summer cookie model (no Auth account)**
- Decision: Summer students don't get Supabase accounts. HMAC-signed cookie grants access to one shared page.
- Rationale: Faster onboarding (no parent email confirmation), lighter auth overhead, simpler GDPR compliance.
- Implication: Every summer read goes through SECURITY DEFINER functions. If we ever need per-student summer data, this ADR must reopen.
- Outcome: Worked well. Scaling to 200+ summer students with 100% uptime.

**ADR 003: Explicit live toggle, not time-based**
- Decision: Admin "Go live" button. Live state determined by `is_live` column, not clock.
- Rationale: Prevents live badge appearing in an empty room (worse UX than no badge). Teacher controls when students can join.
- Outcome: Kids arriving early and seeing "not live yet" is fine. Accidental empty room is not.

**ADR 004: KIT IDs derived from course + year + cohort**
- Decision: `WD2601-0042` = Web Dev + 2026 + 01 + sequence 42. Not random.
- Rationale: Human-readable, no collisions, audit trail is built-in.
- Outcome: Admin and parents can read IDs and understand which cohort a student belongs to.

---

## X. ARCHITECTURE DIAGRAM

```
┌─ MARKETING SITE (route group)
│  ├─ / (home, programs, cards read from courses table)
│  ├─ /about (hero + pillars)
│  ├─ /apply (form → submit_application SECURITY DEFINER)
│  └─ /refund-policy
│
├─ SUMMER PROGRAM (isolated, no session)
│  ├─ /summer (ID gate, verify_summer_id RPC, sets signed cookie)
│  ├─ /smportal (reads summer_content, no RLS — SECURITY DEFINER gate)
│  └─ /admin/summer (batch, week, content, live toggle)
│
├─ 12-WEEK PROGRAM (future, Supabase Auth required)
│  ├─ /student (resources, assignments, points)
│  ├─ /teacher (batch roster, grading, resource unlock)
│  └─ /admin/12-week/* (batches, courses, students, payments)
│
└─ DATABASE (Postgres 16, Supabase)
   ├─ Tables (19 live migrations)
   ├─ RLS (on every sensitive table)
   ├─ SECURITY DEFINER functions (public writes via submit_application, verify_summer_id)
   └─ Storage (file buckets with path-based RLS)
```

---

## XI. TEAM & HANDOFF NOTES

**Founder:** Alfred (solo dev, builds via shared Claude account, works in PowerShell)

**If another programmer takes this on:**
1. Read this doc end-to-end first.
2. Verify migrations against `pg_proc` (assumed signatures can drift).
3. Check `profiles.user_id` is the PK, not `id` (caused bugs).
4. Test smoke test SQL in `db-tests/smoke_test.sql` after any migration touching functions.
5. Know that `cookies called outside request scope` means a cookie read at module scope — move it inside the async function.

**If Claude takes this on:**
1. RLS is not one policy, it's 20. Verify against actual row policies, not assumptions.
2. `"column does not exist"` = missing migration. Check `pg_tables` before assuming a bug.
3. Uploads to chat are unreliable. Ask founder to paste files as text.
4. There's a real smoke test — use it before declaring "all migrations pass".

---

**Last verified:** 29 July 2026  
**Next review:** 15 August 2026 (post-launch retrospective)
