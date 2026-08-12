# KIT Port Harcourt — Master Roadmap

**Last Updated:** 12 August 2026 (session 8)
**Status:** DEPLOYED AND LIVE at https://kitacademy.net. Summer Build Camp is running with real students. Two launch-day outages found and fixed (one confirmed, one pending verification — see §IV). **Paystack is currently broken.** 12-week program — schema ready, UI not started.
**Owner:** Alfred (alfredenyinna03@gmail.com) — solo founder, builds via shared Claude account.

---

## I. WHAT IS KIT?

Unchanged from prior revisions — a Nigerian tech-education platform (Port Harcourt-based) serving ages 10–15, with Summer Build Camp (live now) and Future Skills Lab (12-week, not started) as the two products.

---

## II. COMPLETED WORK ✅

### Phases 0–3.6 — unchanged from prior revision (see doc 06 for the full batch-shell build)

### Phase 3.7 — Launch-day stabilization ✅ (session 8)

Summer Build Camp actually launched, and — as is typical for any first real production traffic — surfaced bugs that had been structurally present but never exercised by real users. **Full technical detail on every one of these is in the new doc 07 (`07-BUGS-AND-LESSONS-LEARNED.md`).** Summary:

- **Fixed and confirmed working:** the student portal was completely inaccessible to every summer student — a raw table query was gated by an RLS policy only admins could ever satisfy. Replaced with a `SECURITY DEFINER` function matching the pattern used everywhere else in the codebase.
- **Fixed, not yet confirmed deployed:** resource/slide downloads failed for every student with "Couldn't open that file" — the `summer` storage bucket had no read policy for anyone but admins. A scoped policy was written (deliberately excluding student submission paths) and handed off, but nobody has confirmed it's actually live. **Verify this before assuming it's closed.**
- **Fixed:** the homework "Redo" button silently did nothing on a returned assignment — two layered bugs (a swallowed error with no UI feedback, and a deliberate database guard the button was never supposed to be able to bypass). Resolved by removing the Redo option from the UI rather than loosening the database rule.
- **Fixed:** file downloads (PowerPoint specifically, but any browser-renderable type) opened inline instead of downloading — missing `Content-Disposition: attachment` on the signed URL.
- **Fixed:** three rounds of a homework-upload UI redesign appeared not to work — root cause was duplicated, conflicting CSS rules accumulating across multiple paste-in-addition-to-instead-of-replace edits, not a design problem at all.

### Phase 3.8 — Internationalization & polish ✅ (session 8)

- **International phone numbers.** The application form was hardcoded to Nigerian numbers only (`+234`, exactly 10 digits). Replaced with a full country dial-code picker — 248 countries, generated from a maintained public dataset rather than typed by hand. **Caught a real data-derivation bug before shipping**: the US, Canada, Russia, and Kazakhstan initially showed nonsensical dial codes because the source dataset's "suffixes" field stores internal area-code lists for shared-root country codes, not a single representative code — fixed by special-casing those four countries after direct verification against the raw data. See doc 07, Bug 6.
- **Welcome email personalization.** The automatic summer-enrolment email now opens with `Dear Mr./Mrs./Mr.-or-Mrs. {parent_name},`, derived from the `parent_relationship` column (Father → Mr., Mother → Mrs., Guardian/Other → Mr./Mrs.). The old automatic "Summer ID" email was deliberately removed — Alfred sends that one manually now.
- **File downloads force-download** rather than rendering inline in-browser — applies to every resource type, not just the one that surfaced the bug (see Phase 3.7 above).

### Phase 3.9 — Course materials ✅ (session 8)

- **KIT Assignment 1** — a genuinely fillable PDF homework worksheet (24 text fields, 12 YES/NO radio groups, verified with `pdf` skill tooling, not just "the script ran"). Two real coordinate-math bugs were caught and fixed during the mandatory visual QA pass before it ever reached a student — see doc 07, Bug 7.
- **KIT Day-1 lesson slide template** (`.pptx`) — rebuilt three times based on real feedback: first as a generic brand kit, then with the real logo (which required fixing a genuine low-contrast problem against the dark background), then narrowed down to an actual lean, kid-facing daily-lesson deck once real Day 2 content was provided. A real icon-color bug (icons rendering solid black instead of the requested color) was found and fixed mid-build — see doc 07, Bug 8.
- **SEO audit completed, not implemented.** No `robots.txt`, no `sitemap.xml`, every page shares an identical `<title>` and meta description, zero Open Graph/Twitter Card tags, no structured data. Full findings and an implementation plan exist (see §VI); nothing has been built yet.

### Phase 2–3 Databases — Migrations, updated count

**29 migrations as of this session.** Status of the three added since the last roadmap revision:

| # | What | Status |
|---|------|--------|
| 0027 | `get_my_summer_student()` — fixes the student-portal RLS outage | **Confirmed run and working** |
| 0028 | Would have allowed `unsubmit_homework` on returned submissions | **Written, deliberately never run** — superseded by removing the Redo UI instead (see doc 07, Bug 1) |
| 0029 | Storage read policy for the `summer` bucket | **Written and provided, deployment not confirmed** — verify before assuming resource downloads are fixed |

Everything from 0001–0026 unchanged from the prior revision.

---

## III. WHAT'S ACTIVELY NEXT

### 🔴 Paystack — broken, unresolved, highest priority
An application went through without the Paystack payment redirect ever firing. Diagnosis was started — DevTools Network-tab check requested, three files identified as the likely next step (the apply form/page component, the Server Action handling submission, the Paystack init logic) — then explicitly paused mid-investigation to prioritize other launch-week fires. **This needs to be picked back up.** Whatever's actually broken here is currently blocking real payment collection.

### 🟠 SEO — audited, not implemented
Full plan exists: `app/sitemap.ts`, `app/robots.ts`, per-page unique `metadata` exports, Open Graph/Twitter tags via the root layout, `Course` JSON-LD for both programs. Needs the actual page files to implement against.

### 🟡 Phase 3.5: Portal Redesign — status unchanged
New CSS and SVG icons ready; `PortalContent.tsx` markup rewrite still pending.

### 🔴 Phase 4: 12-Week Student Platform — not started
Unchanged.

---

## IV. KNOWN GAPS & OPEN ITEMS

### ✅ Closed this session — see doc 07 for full detail on each
1. Student portal totally inaccessible (RLS) — **confirmed fixed**
2. Resource/slide downloads failing for every student — **fix written, deployment unconfirmed**
3. Homework Redo button silently failing — **fixed** (feature removed, not the database rule loosened)
4. File downloads rendering inline instead of downloading — **fixed**
5. Homework upload UI "not working" across 3 rounds — **fixed** (was duplicate CSS, not a design issue)
6. Phone dial-code data error for 4 countries — **caught and fixed before shipping**
7. Two PDF coordinate-math bugs — **caught and fixed before shipping**
8. Slide template icon color bug — **caught and fixed before shipping**

### 🔴 Open, not blocking a specific feature but real
9. **Paystack redirect not firing.** See §III.
10. **Migration 0029 (storage read policy) — verify it was actually applied.**
11. **SEO — audited, zero implementation.**
12. `current_week` still cohort-wide, not per-batch.
13. 7 admin nav items 404 (12-week stubs).
14. No rate limit on `submit_application`.
15. Day 2 lesson deck's Wrap-Up slide previews a different homework format than what actually shipped as KIT Assignment 1 — not reconciled.
16. Old `submit_homework` (0021) still exists, superseded by `turn_in_homework` — cleanup candidate.

---

## V. TECH STACK & CONVENTIONS

Unchanged from prior revision, with one addition to the founder's standing rules, drawn directly from this session:

- Push back honestly. Evaluate feasibility; don't validate by default.
- Document contradictions. Silently resolving them hides bugs.
- Never fabricate data. Unverified = flagged.
- Never guess an RPC signature, bucket name, or column — ask for the source file.
- **Any new table or storage bucket a summer student needs to read requires its own explicit read policy — an admin-only `ALL` policy does not cover other roles. This caused two full-outage bugs. Check this first, every time, for any new student-facing feature.**
- **CSS additions to a stylesheet for a class family touched more than once must be preceded by a search for existing occurrences. CSS fails silently, not loudly — a duplicate rule looks like "the fix didn't work," not like an error.**
- Commit messages: human-readable, no backticks/`$`/`"`.
- When a file's been edited more than once in a session, hand back the complete file, not a diff.

---

## VI. SEO AUDIT FINDINGS (for whenever implementation starts)

**Critical:**
- No `robots.txt`, no `sitemap.xml` at all (404 on both).
- Home, `/apply`, and `/about` all render an **identical** `<title>` and meta description — a duplicate-content signal that actively hurts every page but whichever one Google picks as canonical.
- Zero Open Graph or Twitter Card tags anywhere — links shared in WhatsApp/Facebook show no image, title, or description, which matters more than usual for a business that spreads by word of mouth.

**Warnings:**
- No canonical tags (low risk currently, matters once query-string variants exist).
- No JSON-LD structured data — no `EducationalOrganization` or `Course` markup, so no rich-result eligibility.

**Passing already:** Next.js `<Image>` used correctly (responsive, real alt text), one clean `<h1>` on the homepage, title/description lengths already within ideal range (just not unique per page), HTTPS/HSTS enforced.

**Implementation plan, when it happens:** `metadataBase` + default OG/Twitter templates in root `layout.tsx`; unique `export const metadata` per page; `app/sitemap.ts` and `app/robots.ts` (Next.js native conventions, no manual XML); `Course` JSON-LD for Summer Build Camp and Future Skills Lab. A dedicated 1200×630 social-share image is worth having — current hero image is the wrong aspect ratio for link previews.

---

## VII. DEPLOYMENT CHECKLIST — unchanged, with one addition

- [ ] **Fix Paystack before relying on it for real payments.**
- [ ] Verify migration 0029 actually applied; test a resource download as a real (non-admin) student.
- [ ] Everything from the prior revision's checklist.

---

## VIII. THE ROADMAP FORWARD

Unchanged in structure from the prior revision — Paystack and SEO are now the two concrete blockers sitting in front of "Phase 4: 12-week program," which remains not started.

---

## IX. DECISION LOG

ADRs 001–008 unchanged from prior revision.

**ADR 009: Admin-only RLS policies do not implicitly cover other roles — treat read access as a separate decision, every time (12 Aug 2026)**
- Decision: whenever a new table or storage bucket is created that summer-student-facing code needs to read, its read policy must be written and reasoned about separately from its write/admin policy — never assumed to be covered by an existing `ALL`-scoped admin policy.
- Rationale: this exact gap caused two independent full-outage bugs on launch day (student portal access, resource downloads) — both were `is_admin()`-gated `ALL` policies with no separate read grant, and summer students structurally can never satisfy `is_admin()` since they authenticate via signed cookie, not Supabase Auth.
- Outcome: doc 07 documents both incidents in full; this is now the first thing checked when a new student-facing feature "works for admin, fails for everyone else."

**ADR 010: CSS changes to an already-styled component require a whole-file search first, not a targeted paste (12 Aug 2026)**
- Decision: when adding or changing CSS for any class family that's been touched more than once, search the entire stylesheet for existing occurrences of those class names before pasting anything new.
- Rationale: three consecutive rounds of a UI redesign appeared to fail because CSS was being pasted in addition to previous rounds rather than replacing them — producing duplicate, conflicting rules that silently coexisted. Unlike component code, CSS doesn't error on this; it just applies whichever matching rule comes later in the file.
- Outcome: doc 07, Bug 5. The rule is now stated explicitly in doc 05's gotchas and this doc's conventions.

---

**Last verified:** 12 August 2026 (session 8)
**Next review:** After Paystack is fixed, or the next real incident.
