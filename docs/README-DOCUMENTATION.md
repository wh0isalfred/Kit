# KIT Project Documentation — Complete Reference

**Last updated:** 13 August 2026 (session 9)
**Project:** KIT Port Harcourt — Kids' tech education platform
**Live at:** https://kitacademy.net
**Status:** Deployed and running with **5 real summer students**. All student-facing features confirmed working end to end — portal access, resource downloads, homework upload and submission, grading. SEO fully implemented and indexed on Google and Bing. 12-week program still schema-ready, UI not started.

> ### What changed since the last revision
> **Everything that was flagged as broken or unverified last time is now resolved.** Resource downloads confirmed working. Paystack turned out never to have been broken — the reported symptom was payment abandonment, which is expected behaviour the code handles deliberately (see doc 07).
>
> Fixed this session: homework uploads (blocked twice — first by a 1MB Next.js limit, then by a missing storage write policy), the resources page showing nothing, the resources sort toggle doing nothing, dashboard revenue permanently reading ₦0, and a test account inflating revenue and roster counts.
>
> Built this session: `/admin/students` (combined roster with test-account badging), a stubbed `/admin/teachers`, a rate limit on public application submission, and complete SEO implementation.
>
> **The single most valuable thing in these docs is doc 07 Part 4** — eight patterns that each caused more than one bug. Three separate total outages traced to one unanswered question: *who can read and write this table?*
>
> **Still open by choice:** international/USD payments (blocked on Paystack, parked pending Stripe), direct-to-Supabase uploads (4MB ceiling), and 5 admin nav stubs.

---

## Documentation Files (Read in This Order)

### 📍 **START HERE**

#### 1. **01-MASTER-ROADMAP.md** (READ FIRST)
Project overview, timeline, roadmap, decision log (ADRs), and the current honest status of every open item — including Paystack and SEO, both unresolved.
**Time:** 15–20 minutes

#### 2. **02-TECHNICAL-REFERENCE.md** (FOR DEVELOPERS)
Deep technical manual — architecture, security rules, verified function signatures, storage policies (now including the two RLS fixes from doc 07), environment variables, debugging patterns.
**Time:** 20 minutes, refer back as needed

#### 3. **03-ADMIN-OPERATIONS-MANUAL.md** (FOR ALFRED/OPERATORS)
Day-to-day workflows — cohort management, the batch shell, homework grading, the welcome-email flow, admin account management.
**Time:** 20–25 minutes

#### 4. **04-DEPLOYMENT-AND-DOMAIN.md** (FOR DEPLOYMENT)
Production deployment, domain migration, rollback procedures.
**Time:** 15 minutes

#### 5. **05-DEVELOPER-QUICK-START.md** (FOR NEW DEVS)
Local setup, real folder structure, common tasks, debugging tips — including the CSS-duplication trap from doc 07, now called out explicitly as a first-week gotcha.
**Time:** 15–20 minutes

#### 6. **06-BATCH-SHELL-SPEC.md** (WHAT WAS BUILT — batch shell)
Full spec and as-built notes for the per-batch admin area and homework grading system, plus its own shorter build-problems log specific to that feature.
**Time:** 20 minutes

#### 7. **07-BUGS-AND-LESSONS-LEARNED.md** (READ THIS ONE)
**The complete bug history of the whole project.** 14 documented bugs plus one investigation that turned out not to be a bug at all. For each: the symptom a real user saw, every false lead chased before the real cause was found, the confirmed root cause, the fix, and the specific lesson. Includes **three total-outage incidents, all three sharing a single root cause.** Ends with eight recurring patterns worth knowing before you touch this codebase.
**Who should read:** Everyone, but especially anyone about to build something new on top of student-facing reads/writes or touch an already-styled component.
**Time:** 25–30 minutes. Worth it.

---

## Quick Navigation by Role

### 👨‍💼 Founder / Manager (Alfred)
Read: 01 → 03 → 07 (know what already broke once). Bookmark 03 for recurring workflows.

### 👨‍💻 Backend / Frontend Developer
Read: 01 → 02 → 05 → **07 before writing any new student-facing read or touching styled CSS** → 06 if working in the batch shell specifically.

### 🤖 AI Assistant (Claude / GPT)
Read: 01 → 02 → 05 → **07 in full before doing anything with RLS, storage buckets, or CSS on an already-styled component.**

**Non-negotiable, from doc 07's own pattern list:**
- Any new table or storage bucket a summer student needs to *read* needs its own explicit read policy — an admin-only `ALL` policy does not cover it, and this exact gap caused two separate full-outage bugs.
- Before adding CSS to a stylesheet for any class family that's been touched more than once, search the whole file for existing occurrences first. CSS doesn't error on duplicates — it just silently produces wrong-looking results.
- Never replace a caught error with a generic message without logging the real one somewhere.
- **When a file's been edited more than once in a session, hand back the complete file, not a diff.**
- Never trust a doc's claim about an RPC signature, bucket name, or auth gate over the actual source — verify directly.

### 🚀 DevOps / Deployment Engineer
Read: 01 → 02 (env vars, deployment, monitoring) → 04.

---

## Key Facts (Memorize These)

### The Project
- **Two products:** Summer (3 weeks, no Auth) + 12-week (Saturdays, real Auth)
- **Status:** Deployed and **live with real students actively using it.** Summer portal access confirmed fixed and working (doc 07 Bug 2). Resource-download fix written and handed off but not explicitly confirmed deployed (doc 07 Bug 3) — verify. 12-week: schema ready, UI pending.
- **Owner:** Alfred (solo founder)

### What's Actually Open Right Now
Nothing is *broken* for students or parents. Open items are deferred by choice:
- **International/USD payments** — designed and written (migration 0033), but Paystack can't enable USD on this account. Parked pending Stripe. **Do not run 0033 as-is.**
- **File uploads capped at ~4MB** by Vercel's platform limit. Direct-to-Supabase upload removes it.
- **5 admin nav items still 404:** `/courses`, `/batches`, `/payments`, `/classes`, `/audit`.
- **The "N payments overdue" dashboard alert** reads from the never-written `payments` table and silently never fires — same shape of fix as the revenue one (0032).

### Money Handling
Stored in kobo (integer), never naira. Kobo = naira × 100.

### Database & Storage — the pattern to know
- 29 migrations live as of this session (0029 added the summer-bucket read policy).
- **RLS rule that caused two full outages:** an admin-only `ALL` policy on a table or bucket does not grant any other role read access. Summer students authenticate via signed cookie, not Supabase Auth, so `is_admin()` is always false for them — any raw table/storage read gated only by `is_admin()` silently returns nothing for every student. The fix pattern is always the same: a `SECURITY DEFINER` function (for tables) or a scoped `SELECT` policy (for storage) that trusts the already-cookie-verified caller.
- One storage bucket for summer files (`summer`), prefix-scoped, not several buckets.

### International Students
Phone numbers now accept any country's dial code via a picker (248 countries, generated from a verified dataset — see doc 07 Bug 6 for a real mistake caught in that process before it shipped).

---

## Critical Gotchas (Don't Forget)

1. **Cookies outside request scope:** Module-level cookie reads fail. Move inside async.
2. **profiles.user_id is the PK:** Not `id`.
3. **All money is kobo.**
4. **Bump current_week Mondays:** Still cohort-wide, not per-batch.
5. **Redeploy after env changes.**
6. **A new table/bucket needs ALL FOUR access questions answered — read, write, update, delete, per role.** An admin `ALL` policy covers none of them for a cookie-authenticated summer student. (Caused **three** full outages — doc 07, Bugs 2, 3 & 10. ADR 011.)
7. **CSS additions to an already-touched stylesheet must be preceded by a search for existing occurrences of those classes.** (Doc 07, Bug 5 — three rounds of "it still looks the same" traced to duplicate, conflicting rules.)
8. **Never discard a caught error without logging the real message somewhere.**
9. **A dynamic route folder (`[id]/`) does not serve its parent path.**
10. **When editing a file touched more than once this session, hand back the complete file, not a diff.**
11. **Verify RPC signatures, bucket names, and column names against the actual source — never a doc's claim or memory.**
12. **A trustworthy data source doesn't guarantee correct field usage — spot-check the derivation against the most likely-to-be-used entries**, not a random sample. (Doc 07, Bug 6.)
13. **Regenerate Supabase types after every migration — never cast around stale ones.** A cast silences the real errors in the same area, not just the phantom one. (Doc 07, Bug 14. ADR 012.)
14. **Supabase returns only the columns you name in `.select()`.** A column that exists but isn't listed comes back `undefined`, and a `?? false` fallback turns that into a silent wrong answer.
15. **Before debugging "X is broken," check whether X has ever worked for anyone.** "Failed for one person" and "broken for everyone" need completely different investigations. (Doc 07 — the Paystack non-bug.)
16. **A stat reading zero may mean its source is never written to.** Check the write path before the read path. (Doc 07, Bug 13.)

---

## Version History

| Version | Date | What Changed |
|---------|------|--------------|
| 1.0–2.1 | 29 July 2026 | Initial docs through the batch-shell build spec. |
| 3.0 | 29 July 2026 (session 7) | Phase 3.6 shipped end to end. Corrected two documentation errors that had caused real bugs (storage bucket name, auth-gate comment). |
| **5.0** | **13 August 2026 (session 9)** | **All previously-open bugs closed or resolved.** Homework uploads fixed (1MB Server Action limit, then a missing storage write policy — the third instance of the same RLS gap). Resources page fixed (missing RPC arg + RLS-blocked raw query). Resource sort fixed. Dashboard revenue fixed (was reading from a table nothing writes to). Test-account flag added and excluded from all figures. `/admin/students` built; `/admin/teachers` stubbed. Rate limit on application submission. SEO fully implemented, indexed on Google and Bing. Paystack confirmed working — the earlier report was payment abandonment. USD payments designed but blocked on Paystack, parked for Stripe. ADRs 011–013 added. |
| 4.0 | 12 August 2026 (session 8) | **Added doc 07 — full bug history.** Two full-portal outages found and fixed on launch day (student portal access, resource downloads) — both traced to the same root pattern: admin-only RLS with no separate student read policy. Five further bugs fixed and documented in detail (homework Redo silent failure, file-download MIME handling, a three-round CSS duplication issue, a phone-dial-code data error, two PDF-generation coordinate bugs). International phone number support added. Welcome email personalized. SEO fully audited (not implemented). Paystack investigation started, then paused — still broken. |

---

## How to Use This Documentation

**Starting a feature that reads/writes summer-student data:** read doc 07's pattern list first. This isn't optional — it's the fastest way to not repeat the two outages already documented.

**Debugging:** doc 02's gotchas → verify signatures/buckets/columns against source → doc 07 to check if this exact shape of bug has already happened → smoke test → Vercel/Supabase logs.

**Launching something new:** doc 01 for status → doc 04's checklist → doc 07 for what's already gone wrong once.

---

**Last verified:** 12 August 2026 (session 8)
**Next review:** After Paystack is actually fixed, or after the next real incident — whichever comes first.

—Alfred & Claude
