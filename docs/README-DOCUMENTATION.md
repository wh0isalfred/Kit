# KIT Project Documentation — Complete Reference

**Last updated:** 29 July 2026 (session 7 — Phase 3.6 shipped)
**Project:** KIT Port Harcourt — kids' tech education platform
**Live at:** https://kitacademy.net
**Status:** Deployed. Summer 2026 launches 10 August. Batch shell + homework grading system (Phase 3.6) is built, tested, and live. 12-week program is schema-ready; UI not started.

> ### This documentation set was rewritten end-to-end on 29 July 2026
> Everything below reflects what is actually running in production, not what was planned. Where the previous revision of these docs described bugs, gaps, or half-built features, those sections have been corrected or removed. If you're reading an older printout of these files, throw it away — several things it says are now wrong.
>
> One standing rule survives from the old docs and should outlive this rewrite too: **verify RPC signatures against the migration files, not against any document, including this one.** Documentation drifts. `pg_proc` doesn't lie.

---

## Why These Docs Were Rewritten

Phase 3.6 — the batch shell and homework grading system — went from "designed, not built" to fully shipped across nine build steps in a single long session. Along the way, three genuinely serious bugs were found and fixed (wrong RPC arities, a storage bucket that didn't exist, a homework list page that 404'd on every single visit), and two of the old docs turned out to describe things that weren't true anymore — one said an auth gate didn't exist when it did, another said a `git` history detail was still pending when it had shipped weeks earlier. The pattern across all of it: **docs that describe code, rather than the docs being generated from the code, will always drift.** This rewrite is a snapshot, not a promise — treat every claim below the same skeptical way the project itself was built: verify before you rely on it.

---

## Documentation Files (Read in This Order)

### 📍 **START HERE**

#### 1. **01-MASTER-ROADMAP.md** (READ FIRST)
**Purpose:** Project overview, timeline, and strategic roadmap
**Covers:** What KIT is, what's complete (Phases 0–3.6, all done), what's next (Phase 4), the full ADR decision log, and the architecture diagram.
**Who should read:** Everyone. This is the authoritative project status.
**Time:** 15–20 minutes

#### 2. **02-TECHNICAL-REFERENCE.md** (FOR DEVELOPERS)
**Purpose:** Deep technical manual — architecture, security model, verified RPC signatures, storage buckets.
**Covers:** The two access models (summer cookie vs. 12-week Auth), database schema essentials, every RPC used by the batch shell with its confirmed signature, the real storage bucket layout (corrected — `submissions` is not a real bucket name), environment variables, common gotchas.
**Who should read:** Developers, DevOps, anyone about to write a Server Action or RPC call.
**Time:** 20–25 minutes (skim first, refer back as needed)

#### 3. **03-ADMIN-OPERATIONS-MANUAL.md** (FOR ALFRED/OPERATORS)
**Purpose:** Day-to-day workflows — now describing the actual batch shell, not the old single-page admin.
**Covers:** Cohort settings, weekly content, the batch shell's four tabs (Overview, Class, Resources, Homework), the grading queue workflow, resource scoping (Shared vs. batch-only), student enrolment.
**Who should read:** Alfred, any ops person managing the platform.
**Time:** 20–25 minutes

#### 4. **04-DEPLOYMENT-AND-DOMAIN.md** (FOR DEPLOYMENT)
**Purpose:** Production deployment, domain migration template, rollback procedures.
**Covers:** Launch checklist, launch-day timeline, generic domain migration steps (kept as a reusable template for the *next* migration), rollback procedure.
**Who should read:** DevOps, Alfred on deployment day.
**Time:** 15 minutes

#### 5. **05-DEVELOPER-QUICK-START.md** (FOR NEW DEVS)
**Purpose:** Get a new developer (human or AI) productive in 15 minutes.
**Covers:** Local setup, the **real, current** folder structure (including the batch shell tree), common tasks, styling guide, git workflow, common errors — including the specific ones this project actually hit.
**Who should read:** New developers, onboarding checklist.
**Time:** 15–20 minutes

#### 6. **06-BATCH-SHELL-SPEC.md** (AS-BUILT RECORD)
**Purpose:** What was originally designed, and what actually got built — now marked complete, with every deviation from the original spec called out explicitly.
**Covers:** Route structure, the four tabs, the FIFO grading queue, the by-assignment roster, resource scoping, the state model, and — new in this revision — a "What Actually Shipped vs. What Was Specified" section documenting every place the real implementation diverged from the plan and why.
**Who should read:** Anyone extending Phase 3.6, or building the next similar feature.
**Time:** 20 minutes

---

## Quick Navigation by Role

### 👨‍💼 Founder / Operator (Alfred)
**Read:** 01 (status) → 03 (workflows) → 04 (launch checklist)
**Bookmark:** 03, for bumping `current_week`, grading homework, publishing content.

### 👨‍💻 Developer (Building Features)
**Read:** 01 (overview) → 02 (critical details) → 05 (local setup, patterns)
**Bookmark:** 02, for RPC signatures and the storage bucket table.

### 🤖 AI Assistant (Claude / GPT / any coding agent)
**Read:** 01 → 02 → 05 → 03
**Critical to internalize before writing any code:**
- All money is **kobo**, never naira, in the database.
- `profiles.user_id` is the PK, not `id`.
- Cookies only work inside async request scope.
- **Never guess an RPC signature or a storage bucket name.** Ask for the migration file or the calling code. This project shipped broken code from wrong signatures more than once, and a wrong bucket name caused a full outage of file previews that took a working feature down for hours.
- **When editing a file that's been touched across multiple sessions or several edit rounds, ask for or regenerate the complete current file rather than describing a diff to apply by hand.** This project hit the same class of bug three times in one session — a piece dropped while a person manually merged a diff into a file neither party could see in the same state. Full-file replacement is slower per message but categorically avoids this failure mode.

### 🚀 DevOps / Deployment Engineer
**Read:** 01 (what's deployed) → 02 (env vars, deployment pipeline) → 04 (full deployment guide)

---

## Key Facts (Memorize These)

### The Project
- **Two products:** Summer (3 weeks, no Auth) + 12-week (Saturdays, real Auth)
- **Launch:** 10 August 2026
- **Status:** Summer fully built and live, including the batch shell (Phase 3.6). 12-week schema ready, UI not started.
- **Owner:** Alfred (solo founder)

### Money Handling
- Stored in kobo (integer), never naira. Kobo = naira × 100. Display does `/100`; storage never does.

### Database
- **26 migrations, all confirmed live** as of this revision (0025 and 0026 — the batch-scoped resources column and the grading queue function — were confirmed run and verified directly against `information_schema.columns` and `pg_proc`, not just assumed from a doc).
- `profiles.user_id` is the PK, not `id`.
- RLS on every sensitive table; SECURITY DEFINER functions pin `search_path`.

### Deployment
- Next.js 16 on Vercel. Supabase (Postgres) for everything else.
- Env vars baked at build time — redeploy after any change.
- **Paystack live key was rotated** after a leaked key was pasted into a chat session earlier in the build. Confirmed done.

### Storage — corrected in this revision
- There is **no bucket literally named `submissions`.** Homework file submissions live in the `summer` bucket, under a `submissions/{student_id}/{resource_id}/...` path prefix. An earlier build session assumed a separate bucket existed (it doesn't), which silently broke every admin file preview until caught and fixed. See doc 02, section VI, for the corrected bucket table.

---

## Critical Gotchas (Don't Forget)

1. **Cookies outside request scope fail.** Move cookie reads inside async functions.
2. **`profiles.user_id` is the PK**, not `id`. Queries using `id` silently return nothing.
3. **All money is kobo.** Display logic does `/100`. Storage never does.
4. **Bump `current_week` Mondays** — students see nothing new until it's incremented. It is cohort-wide, not per-batch (see doc 01, Known Gaps).
5. **Redeploy after env var changes** — they're baked at build time.
6. **SECURITY DEFINER functions must pin `search_path`.**
7. **Verify RPC signatures against migration files**, never from memory or from a doc. This project shipped broken code from wrong signatures twice before the rule was taken seriously.
8. **There is no `submissions` storage bucket.** It's `summer`, with a path prefix. See above.
9. **`assigned` homework = NO ROW**, not a row with a status. Non-submitters only appear via the LEFT JOIN in `get_homework_roster` and `get_grading_queue`.
10. **A dynamic route folder (`[id]/`) does not serve its parent path.** `/smportal/homework/page.tsx` and `/smportal/homework/[id]/page.tsx` are two separate files with two separate responsibilities. This project once had detail-page logic sitting at the list-page path, which meant the list page 404'd on every single visit — the `id` param was always `undefined`.
11. **When adding a scoping column** (like `summer_resources.batch_id`), update every function that reads that table in the *same* migration, or you silently leak data across scopes. This is why 0025 shipped the column and the leak fix together.
12. **On a file that's been edited more than once in a session, ask for the complete current file before making further changes.** See the AI Assistant section above — this isn't optional advice, it's a lesson paid for in real build time.

---

## Version History

| Version | Date | What Changed |
|---------|------|--------------|
| 1.0 | 29 July 2026 | Initial consolidated documentation (from 14 older files). |
| 2.0 | 29 July 2026 | Session 6. Deployed to kitacademy.net. Corrected `return_homework` and `get_my_submission` signatures. Added Phase 3.6 design (batch shell + grading queue) as a spec, not yet built. |
| 2.1 | 29 July 2026 | Added 06-BATCH-SHELL-SPEC as a full build spec. |
| **3.0** | **29 July 2026 (session 7)** | **Phase 3.6 fully built across all 9 spec steps and shipped.** Full documentation rewrite. Corrected: the storage bucket table (no `submissions` bucket), doc 05's stale claim that the admin auth gate didn't exist (it does, and works), doc 01's stale "0025/0026 pending" status (both confirmed run), the misplaced homework list-page logic. Paystack key rotation confirmed complete. `/admin/summer` reorganized (batches first, cohort settings second, shared-resources editor collapsed by default) now that the batch shell owns per-batch work. |

---

## How to Use This Documentation

**Starting a feature:** Read 01 to find where it fits, check 02 for the relevant technical section, check 05 for local patterns, then ask: does this match how the batch shell was built?

**Debugging:** Check 02's gotchas and RPC signature table first. If it's a "column does not exist" or "function does not exist" error, verify against the actual database (`information_schema.columns`, `pg_proc`) before assuming the docs are current.

**Handing off to someone else:** Have them read this README, then 01, then whichever doc matches their role above. Have them run local setup from 05. Pair on the first real task.

---

## Related Resources

- Supabase docs: https://supabase.com/docs
- Next.js docs: https://nextjs.org/docs
- Paystack docs: https://paystack.com/developers
- Vercel docs: https://vercel.com/docs

**Real files, not covered by this doc set:**
- Database migrations: `supabase/migrations/`
- Server actions: `src/app/**/actions.ts`, `batch-actions.ts`, `resource-actions.ts`

---

## Contact & Support

**Technical questions:** This documentation first, then Alfred (alfredenyinna03@gmail.com)
**Deployment issues:** Doc 04, then Alfred
**Operational questions:** Doc 03, then Alfred

---

**Last verified:** 29 July 2026 (session 7 — Phase 3.6 shipped)
**Next review:** 15 August 2026 (post-launch retrospective)

---

## Summary: What You've Just Inherited

A fully built, deployed platform for the Summer 2026 cohort, including a purpose-built admin system (the batch shell) for running multiple batches with independent class schedules, homework grading queues, and resource scoping — built, tested, and documented in one continuous session. The 12-week program's database schema exists but has no UI yet; that's the next major phase.

**You must remember:**
1. All money is kobo.
2. Bump `current_week` Mondays.
3. `profiles.user_id` is the PK.
4. Redeploy after env changes.
5. Verify RPC signatures and bucket names against the actual database — not this document, not any document.
6. When editing a file with edit history, get the whole file, not a diff.

**Good luck.**

— Alfred & Claude
