# KIT Port Harcourt — Master Roadmap

**Last Updated:** 29 July 2026 (session 7)
**Status:** DEPLOYED AND LIVE at https://kitacademy.net. Summer 2026 fully built, including the batch shell and homework grading system (Phase 3.6). 12-week program — schema ready, UI not started.
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
| **Batches** | Multiple batches per cohort, each with its own class schedule and grading queue | Max 15 per batch (multiple batches per course) |
| **Prize** | ₦30,000 team challenge | KIT Points + certificates + leaderboard |
| **Auth Model** | Signed cookie (no DB account) | Supabase Auth (real sessions) |

**Business reality:** Pre-revenue. Zero cohorts have completed. Summer is the MVP proving ground.

---

## II. COMPLETED WORK (Phases 0–3.6) ✅

### Phase 0: Foundation
- ✅ Architecture (single Next.js + Supabase, no separate backend)
- ✅ Database schema — **26 migrations, all confirmed live** (see Migration Timeline below)
- ✅ Core security model (ADR 001: monorepo; ADR 002: Summer ID cookie model)
- ✅ Brand identity (navy/blue/green palette, Plus Jakarta Sans typography)

### Phase 1: Marketing Website
- ✅ Home page, About page, Programs section, Apply page, Refund policy, Footer

### Phase 2: Admissions & Payments
- ✅ Application form → Supabase (`submit_application()` SECURITY DEFINER)
- ✅ Paystack integration (init, callback, webhook, idempotent)
- ✅ Admin approval screen — approve/reject with batch assignment
- ✅ Summer enrolment (`enrol_summer_student()`) — generates Summer ID, no account
- ✅ Live Paystack key rotated after an earlier leak (a key was pasted into a chat session; confirmed rotated 29 July)

**Payment flow proven:** Apply → Paystack → webhook marks paid → admin approves → Summer ID generated.

### Phase 3: Summer Portal ✅
- ✅ ID gate at `/summer`, shared portal at `/smportal`
- ✅ Weekly content management, publish toggles, per-batch live toggle
- ✅ Portal features: countdown, Meet button, weekly resources, homework status pills, file uploads
- ✅ Homework lifecycle (Google Classroom-style): submit → review → return, with feedback

### Phase 3.5: Portal Redesign ✅
Portal CSS and markup brought in line with the new visual direction (SVG line icons, warmer but more credible tone). Complete.

### Phase 3.6: Batch Shell + Homework Grading System ✅ **COMPLETE**

**This is the major addition since the last revision of this document.** Previously designed but not built; now fully shipped across all 9 planned build steps, tested against real deploys, and live.

**What it replaced:** a single, increasingly overloaded `/admin/summer` page that tried to hold cohort settings, every batch's session controls, every batch's homework review, and the full curriculum editor all at once. There was no way to see "what's waiting on me right now" without opening every assignment by hand.

**What it is now:**

```
/admin/summer                              cohort settings + batch cards (batches shown FIRST)
/admin/summer/batch/[batchId]               redirects → /overview
/admin/summer/batch/[batchId]/overview      read-only summary: roster, live status, next class, grading progress
/admin/summer/batch/[batchId]/class         instructor, meet link, next class, GO LIVE / END CLASS toggle
/admin/summer/batch/[batchId]/resources     resources visible to this batch, tagged Shared / Batch-only
/admin/summer/batch/[batchId]/homework      grading queue (default) + by-assignment roster with filter chips
```

Each batch card on `/admin/summer` shows real-time seats, current week, live status, and a grading count pulled from one cohort-wide `get_grading_queue(null)` call, grouped client-side — not one query per batch.

**Full build record, deviations from the original spec, and every bug hit along the way (three genuinely serious ones) are documented in doc 06.** Read that before extending this system.

**Also shipped as part of this phase, beyond the original spec:**
- A read-only Overview tab per batch (roster, live status, next class, assignments published vs. graded).
- `/admin/summer` reorganized: batches moved to the top as the primary hub, cohort settings below, and the full shared-curriculum resource editor collapsed behind a toggle by default — since most day-to-day resource work now happens per-batch.
- A previously orphaned component (`GoLiveControl.tsx`, built for a cohort-wide live toggle that migration 0022 superseded) was adapted rather than discarded — its "largest element on the page, decisive color change" design became the batch-level live toggle, now correctly wired to `set_batch_live` instead of the old `set_summer_live`.
- The homework list page at `/smportal/homework` was found to be completely broken — misplaced detail-page logic sitting at the wrong route, causing every visit to 404 — and was rebuilt from scratch as an actual list, using `get_my_submissions` (0024) for accurate per-assignment status in one call.

### Phase 2–3.6 Databases (Migrations 0001–0026)
All confirmed live on Supabase. **Schema is the source of truth** — if a document and the schema disagree, the schema wins; verify with `information_schema.columns` or `pg_proc`, not by reading a doc.

**Key tables:**
- `applications` — admissions pipeline
- `summer_cohorts`, `summer_students`, `summer_content`, `summer_resources` (now with a nullable `batch_id` — confirmed present via direct column query), `summer_batch_sessions`, `summer_submissions` — summer program
- `batches`, `students`, `teachers` — 12-week program (schema ready, UI missing)
- `courses` — dynamic course catalog
- `profiles` — 12-week user profiles (**PK is `user_id`, not `id`**)
- `payments`, `kit_points_ledger`, `audit_log`
- Storage buckets: `public-assets`, `batch-resources`, `certificates`, `summer` — **there is no bucket named `submissions`; see doc 02 §VI for the corrected table.**

**Migration timeline:**
- 0001–0012: Core schema (applications, summer, courses, 12-week)
- 0013: Cohort management (registration windows)
- 0014: Public submission endpoint
- 0015: Registration open/close gates
- 0016: `summer_resources` table, per-item publish, RLS grants SELECT to `is_admin()` only
- 0017: Fix pgcrypto search path
- 0018: Link applications to enrolments
- 0019: Cohort-level live toggle + `set_summer_live()` — **superseded by 0022's per-batch version; the cohort-wide function and its UI (`GoLiveControl.tsx`) are legacy but the component was repurposed rather than deleted (see Phase 3.6 above)**
- 0020: Summer batches, `summer_batch_sessions`, `summer_submissions`, `summer_attendance`
- 0021: `check_in_attendance()`, `submit_homework()` (superseded by 0023)
- 0022: Batch-aware RPCs — `enrol_summer_student` requires batch, `set_batch_live()`
- 0023: Homework lifecycle — `turn_in_homework`, `unsubmit_homework`, `return_homework`, `get_homework_roster`
- 0024: Student read path — `get_my_submission`, `get_my_submissions`
- **0025 — CONFIRMED RUN.** `summer_resources.batch_id` (nullable) + the `get_summer_resources` leak-prevention filter. Verified directly: `select column_name from information_schema.columns where table_name = 'summer_resources'` returns `batch_id`. An earlier draft of this document said 0025 was still pending — it wasn't; the document was stale, not the database.
- **0026 — CONFIRMED RUN.** `get_grading_queue(p_batch_id)`. Verified against the function's actual return columns while building the grading queue tab.

---

## III. ACTIVE / NEXT (Phase 4 and beyond)

### Phase 4: 12-Week Student Platform 🔴 NOT STARTED
**Blocker:** No batches exist yet for this program. Approval workflow can't run without at least one.

**Scope:**
- **Admin:** Batches, Teachers, Applications approval, Students list
- **Teacher dashboard:** batch roster, resource unlock, assignment grading, announcements
- **Student dashboard:** resources (unlocked only), assignments, submissions, points ledger
- **RLS policies:** all queries scoped to role + batch

**Estimated effort:** 3–4 weeks

### Phase 5: KIT Points + Leaderboard 🔴 WAITING ON PHASE 4
Points ledger, batch-scoped leaderboard, admin leaderboard, auto-award triggers. Estimated effort: 1 week.

---

## IV. KNOWN GAPS & OPEN ITEMS

### 🟡 Open, not blocking launch

1. **`current_week` is cohort-wide, not per-batch.** `get_summer_resources` gates on `summer_cohorts.current_week` for every batch simultaneously. If batches run on different days, bumping the week unlocks content early for whichever batch runs later. Harmless if batches share a schedule; needs a `current_week` column on `summer_batch_sessions` if they ever stagger. **Explicitly deferred during the Phase 3.6 build — do not bolt a per-batch week selector onto the UI without that schema change, or the display will lie about what students can actually see.**
2. **7 admin nav items still 404** — `/admin/students`, `/admin/courses`, `/admin/batches`, `/admin/teachers`, `/admin/payments`, `/admin/classes`, `/admin/audit`. These belong to Phase 4. Stub or hide before launch if visible in the nav.
3. **No rate limit on `submit_application`** — public write endpoint.
4. **Paystack webhook on kitacademy.net — status unverified in this revision.** It was flagged for testing in the previous document version; there is no confirmation in this session that it was actually tested end-to-end on the live domain. **Do not assume this is done. Test it before launch.**
5. **Old `submit_homework` (0021) still exists**, superseded by `turn_in_homework`. Candidate for a cleanup migration once confirmed unused.
6. **A known bug in the student-facing file-open path, found but not fixed:** `getSummerFileUrl` (in `summer-session.ts`) gates access with a check that assumes every storage path is prefixed with the cohort year (`2026/week1/...`). Submission paths are actually prefixed `submissions/{student_id}/{resource_id}/...` — meaning a student clicking to review their *own already-submitted* homework file likely fails that check. This was discovered while fixing the equivalent admin-side bug (see doc 06) but was never fixed on the student side. **Worth testing and fixing before launch**, since it affects a core student journey.
7. **`get_summer_resources`'s ADR 005 batch-scoping predicate exists at the RPC level**, but the admin resource-creation form (`SummerResources.tsx`, used only at the cohort level) has no way to set `batch_id` — nor should it; that's intentional, see ADR 005. The batch-scoped Resources tab (Phase 3.6) is the only place batch-specific resources get created.

### ✅ Closed since last revision

- ~~`/smportal/homework/[id]/page.tsx` calls RPCs wrongly~~ — **verified correct.** This file matches the real signatures; it turned out a *different*, more broken file had been misplaced at `/smportal/homework/page.tsx` (the list route) — see Phase 3.6 above and doc 06 for the full story.
- ~~`HomeworkReview.tsx` calls `return_homework` with the wrong arity~~ — **fixed.** Also fixed a deeper bug in the same area: the roster-fetching function was passing RPC rows through as untyped `any[]`, silently dropping the `submission_id` field the Return button needed.
- ~~Duplicate `.btn-primary` in globals.css~~ — investigated. There is no literal duplicate declaration; there's a scoped override for the mobile nav CTA with a comment explaining why, which appears to already be resolved. This item can likely be closed, pending a quick visual check on mobile.
- ~~0025/0026 pending~~ — **both confirmed run**, see Migration Timeline above.
- ~~Paystack key exposure~~ — **key rotated**, confirmed.

---

## V. TECH STACK & CONVENTIONS

### Core Stack
- **Frontend/Backend:** Next.js 16 (App Router, TypeScript strict)
- **Database/Auth/Storage:** Supabase (Postgres 16 + RLS + Auth)
- **Payments:** Paystack
- **Email:** Resend, sending from `noreply@kitacademy.net`
- **Deploy:** Vercel (github.com/wh0isalfred/Kit, branch `main`) → https://kitacademy.net
- **Dev env:** Windows/PowerShell, VS Code, Turbopack

### CSS & Design
- Single `globals.css` — no Tailwind, no CSS modules
- BEM-flat naming (`.admin-batch-card`, `.hw-queue-card`, `.batch-shell-head`)
- Brand tokens: navy #1F2C4F, blue #1999E4, green #25B290, no purple
- Font: Plus Jakarta Sans
- Responsive breakpoints: 1024px, 768px, 480px
- **Reuse before inventing.** Several times during the Phase 3.6 build, CSS classes that looked like they'd need to be created from scratch already existed — built for an earlier, unfinished attempt at the same feature. Search the file before writing new rules.

### Database Conventions
- **All money is kobo (bigint).** Never naira in storage.
- **All ages derive from DOB.**
- **Points are ledger-based.**
- **RLS on every table** holding per-student or per-batch data.
- **SECURITY DEFINER functions pin `search_path`.**

### Founder's Standing Rules
- Push back honestly. Evaluate feasibility; don't validate by default.
- Document contradictions rather than silently resolving them.
- Never fabricate data. Unverified = flagged.
- Never guess a function signature or a storage bucket name — ask for the migration file, or the calling code, or run the query.
- Commit messages: human-readable, no backticks/`$`/`"` (PowerShell quoting breaks).
- Rapid MVPs. Free-tier tooling. AI agents as the dev team.
- **On a file that's been edited across multiple sessions: ask for the complete current file before making further edits, rather than describing a diff to be hand-applied.** This project hit the identical failure — a piece silently dropped during a manual merge — three separate times in one session before adopting this rule.

---

## VI. IMMEDIATE NEXT STEPS (Priority Order)

1. **🔴 Verify the Paystack webhook actually fires on kitacademy.net.** Flagged as unverified twice now across two document revisions — actually test it this time.
2. **🔴 Fix the student-side `getSummerFileUrl` path-check bug** (item 6 above) before students start submitting real homework.
3. **🟠 Stub or hide the 7 broken admin nav items** if they're visible in the current UI.
4. **🟠 Quick visual check on the `.btn-primary` mobile nav question** — likely already resolved, confirm and close.
5. **🟡 Decide whether to build the deferred Phase 3.6 items** (progress matrix, nudge-missing-students email, keyboard nav in the queue) — see doc 06 §X for the full list and reasoning on why each was deferred.
6. **After launch: begin Phase 4 (12-week program) scoping**, ideally with real Summer 2026 usage data in hand.

---

## VII. DEPLOYMENT CHECKLIST (For Live Day)

- [ ] Paystack webhook tested on live URL — **still open, see above**
- [ ] Student-side file-open bug fixed and tested
- [ ] No console errors on all routes
- [ ] Mobile responsiveness verified (iPhone 12 / Pixel 5)
- [ ] Broken nav items hidden
- [ ] Database backups configured
- [ ] Vercel preview/production env vars match
- [ ] Test application flow: apply → pay → admin approve → Summer ID received
- [ ] Test summer portal: ID gate → portal → resources → homework submit → homework list → homework detail
- [ ] Test batch shell: open a batch → Class tab live toggle → Homework tab queue → Return an assignment → Resources tab

---

## VIII. THE ROADMAP FORWARD (Post-Launch)

### Week 1–2 (Aug 10–24)
Summer camp runs. Monitor Paystack, email delivery, portal UX, and the new batch shell under real multi-batch load. Ship hot-fixes as needed.

### Week 3–4 (Aug 25–31)
Retrospective. Decide which of the deferred Phase 3.6 items (doc 06 §X) are worth building now that there's real usage data — the progress matrix and nudge-missing-students email are the two flagged as genuinely valuable, just deliberately not tested for the first time during launch week.

### Sept–Oct (Phase 4: 12-Week Program)
Build admin (Courses, Batches, Teachers, Applications), teacher dashboard, student dashboard. Enrol first 12-week cohort.

### Nov–Dec (Phase 5: Points + Leaderboard)

### 2027 (Scaling)
Multiple concurrent batches per course (the pattern Phase 3.6 was built to support), teacher payment, marketing expansion.

---

## IX. DECISION LOG (Why We Built It This Way)

**ADR 001: Single monorepo (Next.js + Supabase, no separate backend service)**
Fit for MVP; will need rethink if KIT expands to multiple centers.

**ADR 002: Summer cookie model (no Auth account)**
Faster onboarding, lighter overhead. Every summer read goes through a SECURITY DEFINER function. Worked well at 200+ students.

**ADR 003: Explicit live toggle, not time-based**
Admin controls when students can join, per batch. This decision directly shaped the Phase 3.6 Class tab's live toggle — deliberately the largest, most decisive element on the page, never inferred from the clock.

**ADR 004: KIT IDs derived from course + year + cohort**
Human-readable, collision-free, self-documenting.

**ADR 005: Batch resources are a nullable overlay, not a duplicate set**
`summer_resources.batch_id` is NULLABLE. `NULL` = shared curriculum every batch sees; set = a supplement only that batch sees. Query is `WHERE batch_id IS NULL OR batch_id = <batch>`. Rejected alternative: full per-batch duplication (drifts — you fix a typo in one copy, the others stay broken). Column and the leak-prevention filter shipped in the same migration (0025) deliberately. **This ADR directly shaped the Phase 3.6 Resources tab:** shared rows can be edited from inside a batch page (with a confirmation, since the change applies everywhere) but never deleted from there — deletion of shared curriculum is only possible from the cohort-level screen, to keep exactly one place where "visible to everyone" gets decided.

**ADR 006: The grading queue is FIFO and separate from the roster**
`get_grading_queue()` answers "what is waiting on me across everything," oldest first. `get_homework_roster()` answers "for THIS assignment, where is everyone." Two questions, two functions, two tabs (Homework's "Needs grading" vs. "By assignment").

**ADR 007 (new, 29 July 2026): Full-file replacement over hand-applied diffs, for any file with edit history**
**Decision:** once a file has been edited more than once in a build session, further changes are delivered as the complete file, not as a diff to manually merge.
**Rationale:** three separate build failures in the Phase 3.6 session traced back to exactly this — a type definition, a prop destructure, and a code block each silently dropped while being hand-merged into a file whose current state wasn't fully visible to whoever was pasting the change in. Each cost a full build-and-deploy cycle to catch.
**Outcome:** adopted partway through the session; zero recurrences after.

---

## X. ARCHITECTURE DIAGRAM

```
┌─ MARKETING SITE (route group)
│  ├─ / (home, programs, cards read from courses table)
│  ├─ /about
│  ├─ /apply (form → submit_application SECURITY DEFINER)
│  └─ /refund-policy
│
├─ SUMMER PROGRAM (isolated, cookie-based, no Supabase Auth session)
│  ├─ /summer (ID gate, verify_summer_id RPC, sets signed cookie)
│  ├─ /smportal (shared dashboard + /homework list + /homework/[id] detail + /resources)
│  └─ /admin/summer
│      ├─ page.tsx                          batches (primary) + cohort settings + collapsible shared resources
│      └─ batch/[batchId]/
│          ├─ layout.tsx                    header, tabs, seat/live computation
│          ├─ overview/                     read-only summary
│          ├─ class/                        live toggle, session settings
│          ├─ resources/                    scoped resources, Shared/Batch-only tagging
│          └─ homework/                     grading queue + by-assignment roster
│
├─ 12-WEEK PROGRAM (future, Supabase Auth required)
│  ├─ /student, /teacher, /admin/12-week/* — none built yet
│
└─ DATABASE (Postgres 16, Supabase)
   ├─ Tables (26 live migrations, all confirmed)
   ├─ RLS on every sensitive table
   ├─ SECURITY DEFINER functions (public writes, and every summer read path)
   └─ Storage: public-assets, batch-resources, certificates, summer (no separate "submissions" bucket)
```

---

## XI. TEAM & HANDOFF NOTES

**Founder:** Alfred (solo dev, builds via shared Claude account, works in PowerShell)

**If another programmer takes this on:**
1. Read this doc end-to-end first, then doc 06 for the batch shell specifically.
2. Verify migrations against `information_schema.columns` and `pg_proc` — assumed signatures and column existence can and did drift from what the docs said.
3. Check `profiles.user_id` is the PK, not `id`.
4. Know that "cookies called outside request scope" means a cookie read at module scope — move it inside the async function.
5. There is no `submissions` storage bucket. It's `summer`, with a path prefix.

**If Claude (or any AI assistant) takes this on:**
1. RLS is not one policy, it's many. Verify against actual row policies, not assumptions.
2. `"column does not exist"` or `"function does not exist"` = don't assume the docs are current. Query the database directly.
3. Ask the founder to paste files as text or upload them; don't proceed on an assumed file path.
4. **If you're about to edit a file that's already been edited once this session, ask for the current complete file rather than describing a change to apply by hand.** See ADR 007.
5. When two uploaded files share a generic name (e.g. two files both called `page.tsx`), don't guess which is which from filename alone — ask for the exact path, or infer carefully from content and confirm before touching anything.

---

**Last verified:** 29 July 2026 (session 7 — Phase 3.6 shipped, full doc rewrite)
**Next review:** 15 August 2026 (post-launch retrospective)
