# KIT Port Harcourt — Master Roadmap

**Last Updated:** 13 August 2026 (session 9)
**Status:** DEPLOYED AND LIVE at https://kitacademy.net. Summer Build Camp is running with **5 real students**, all portal features confirmed working. SEO fully implemented and indexed. **Paystack works** — the earlier "broken" report was payment abandonment, not a bug (see doc 07). International (USD) payments are blocked on Paystack and parked pending Stripe. 12-week program — schema ready, UI not started.
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
| 0029 | Storage read policy for the `summer` bucket — student resource downloads | **Confirmed run and working** |
| 0030 | Storage write policy — students uploading their own homework | **Confirmed run and working** (doc 07, Bug 10) |
| 0031 | Rate limit on `submit_application` — 5 per IP per hour | **Confirmed run and working** |
| 0032 | `admin_stats` revenue/outstanding computed from `applications`, not the never-written `payments` table | **Confirmed run and working** (doc 07, Bug 13) |
| 0033 | USD pricing for foreign applicants | **Written, deliberately NOT run** — Paystack cannot enable USD on this account. Parked pending Stripe. Do not run as-is. |
| 0034 | `is_test` flag on `applications` + `summer_students`, excluded from all dashboard figures | **Confirmed run and working** (doc 07, Bug 14) |

Everything from 0001–0026 unchanged from the prior revision.

---

## III. WHAT'S ACTIVELY NEXT

### 🟠 International payments — blocked on Paystack, needs Stripe
Foreign applicants (currently: Georgia, plus expected UK applications) are charged the naira price. A complete USD implementation was designed and written — migration 0033, phone-dial-code foreign detection, per-currency revenue splitting — but **Paystack could not enable USD on this account**, so none of it is deployed. The work is parked pending a Stripe integration. **Do not run migration 0033 as-is**; it assumes a Paystack USD capability that doesn't exist.

Interim approach: foreign parents pay the naira amount, and their bank handles the FX conversion. Workable, but the applicant sees naira rather than a familiar figure.

### 🟠 Direct-to-Supabase file uploads
Homework uploads are capped at ~4MB by Vercel's serverless payload limit (not a Next.js setting — raising `bodySizeLimit` past ~4.5MB doesn't help). Routing uploads straight from the browser to Supabase Storage via a signed upload URL removes the ceiling entirely and takes load off the serverless functions. See doc 07, Bug 9.

### 🟡 Phase 3.5: Portal Redesign — status unchanged
New CSS and SVG icons ready; `PortalContent.tsx` markup rewrite still pending.

### 🔴 Phase 4: 12-Week Student Platform — not started
Unchanged. `/admin/students` is now built and will show 12-week students automatically once they exist; the remaining admin pages (`/courses`, `/batches`, `/payments`, `/classes`, `/audit`) are still stubs.

---

## IV. KNOWN GAPS & OPEN ITEMS

### ✅ Closed since the prior revision — see doc 07 for full detail on each
1. Student portal totally inaccessible (RLS) — **confirmed fixed and working**
2. Resource/slide downloads failing for every student — **confirmed fixed and working** (0029)
3. Homework Redo button silently failing — **fixed** (feature removed, database rule left intact)
4. File downloads rendering inline instead of downloading — **fixed**
5. Homework upload UI "not working" across 3 rounds — **fixed** (duplicate CSS, not a design issue)
6. Phone dial-code data error for 4 countries — **caught before shipping**
7. Two PDF coordinate-math bugs — **caught before shipping**
8. Slide template icon color bug — **caught before shipping**
9. Homework upload rejected at 1MB — **fixed** (0009 → `bodySizeLimit: 4mb`)
10. Homework upload rejected by storage RLS — **fixed** (0030)
11. Resources page showing nothing — **fixed** (missing RPC arg + RLS-blocked raw query)
12. Resources sort toggle doing nothing — **fixed** (was only sorting week groups, not items within them)
13. Dashboard revenue permanently ₦0 — **fixed** (0032; was reading from a table nothing writes to)
14. Test account inflating revenue and roster counts — **fixed** (0034 `is_test` flag)
15. **SEO fully implemented** — robots, sitemap, per-page metadata, Open Graph image, structured data verified parsing; Google Search Console + Bing both submitted; homepage and `/apply` indexed
16. **Rate limit on `submit_application`** — **built and deployed** (0031)
17. **`/admin/students`** — built (combined summer + 12-week roster, with test-account badging)
18. **"Paystack is broken"** — **was never a bug.** Payment abandonment. See doc 07.

### 🔴 Open and real
19. **International/USD payments** — see §III. Blocked on Stripe.
20. **File uploads capped at ~4MB** — see §III.
21. **The "N payments are overdue" dashboard alert** reads from `admin_outstanding_payments`, a view built on the same never-written `payments` table that caused the revenue bug. It silently never fires. Same shape of fix as 0032 if wanted.
22. **`applications` has no country field** — foreign applicants are detectable only by parsing the phone dial code, a heuristic that misfires for a Nigerian parent abroad or a foreign parent with a Nigerian number.
23. `current_week` still cohort-wide, not per-batch.
24. 5 admin nav items still 404: `/courses`, `/batches`, `/payments`, `/classes`, `/audit`.
25. `/admin/teachers` is a deliberate stub — the `teachers` table is empty and summer instructor names are free text on `summer_batch_sessions`. Revisit when there's a real teaching structure.
26. Day 2 lesson deck's Wrap-Up slide previews a different homework format than what shipped as KIT Assignment 1.
27. Old `submit_homework` (0021) still exists, superseded by `turn_in_homework` — cleanup candidate.

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

## VI. SEO — IMPLEMENTED ✅ (session 9)

Audited, built, deployed, and verified. What exists now:

**Code:**
- `src/app/robots.ts` — Next.js native convention, auto-serves `/robots.txt`. Allows everything except `/admin`, `/smportal`, `/summer` (login/portal routes with nothing useful in search results), and points at the sitemap.
- `src/app/sitemap.ts` — auto-serves `/sitemap.xml`. Four public URLs with priorities: home (1.0), `/apply` (0.9), `/about` (0.7), `/refund-policy` (0.3).
- Root `layout.tsx` — `metadataBase`, a title template (`%s · KIT`) so child pages override only their own part, and site-wide Open Graph + Twitter Card defaults.
- Per-page unique `metadata` exports on `/apply`, `/about`, and `/refund-policy`, each with its own canonical. This fixed the duplicate-title problem, where three of four pages had served byte-identical titles and descriptions.
- `EducationalOrganization` JSON-LD on the homepage — verified parsing via Google's Rich Results Test.
- `public/og.png` — 1200×630 social share card, built from the real logo and brand colours.

**Canonical domain:** `https://www.kitacademy.net`. The apex 308-redirects to www; every URL in the sitemap and metadata uses www.

**Registrations:** Google Search Console verified via DNS TXT (Domain property, covering apex + www), sitemap submitted and processed successfully, homepage and `/apply` both indexed via Request Indexing. Bing Webmaster Tools imported from Search Console — worth having since Bing's index feeds ChatGPT and Copilot search.

**Positioning note:** all copy was rewritten mid-session from Port Harcourt-local to global ("an online tech school... open to students worldwide", `areaServed: "Worldwide"`), after students in Abuja, Georgia, and prospective UK applications made the local framing wrong. Port Harcourt is retained in the structured data as a real address — a credibility signal that distinguishes KIT from anonymous online course sellers — but demoted from the lead.

**Known behaviour, not a bug:** Google's cached snippet can lag a deploy by days to weeks. After the global-copy rewrite, search results still showed the old Port Harcourt description for a while. Request Indexing nudges it; there's nothing to fix in code.

**Free, still worth doing:** a Google Business Profile (lower priority now that the audience is international — it drives "near me" local results), and getting KIT listed in directories of online kids' coding programs. Inbound links from other sites are the single biggest factor in ranking for competitive terms, and the one thing that can't be coded.

---

## VII. DEPLOYMENT CHECKLIST

**Standing items before any deploy that touches student-facing reads or writes:**
- [ ] Does any new table or bucket need a policy for a role that isn't admin? Answer read, write, update, delete separately (ADR 009 / ADR 011).
- [ ] Test as a real, non-admin student — not from a browser that's also logged into `/admin`. Three total outages were invisible from an admin session.
- [ ] `npx supabase gen types typescript --linked > src/lib/database.types.ts` after any migration that adds a column (ADR 012).
- [ ] Everything from the prior revision's checklist.

---

## VIII. THE ROADMAP FORWARD

The launch-week blockers are cleared: the platform works end to end for real students, payments collect (locally), and the site is indexed. The two concrete things standing between here and Phase 4 are **Stripe for international payments** and **direct-to-Supabase uploads** — neither blocking day-to-day operation, both blocking growth beyond Nigeria and beyond 4MB files.

Phase 4 (12-week program) remains not started, and now has one piece of groundwork done: `/admin/students` already handles 12-week students and will populate automatically once they exist.

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

**ADR 011: ADR 009 extended to writes — answer all four access questions per table (13 Aug 2026)**
- Decision: ADR 009 covered reads. It is now extended: for every new table or bucket, explicitly answer **read, write, update, and delete** for every role that will touch it, before the migration is considered done.
- Rationale: a third independent instance of the same root cause appeared — a student could not *upload* homework because the `summer` bucket's only write policy was `is_admin()`-gated. Reads had been fixed (0029); writes had never been reachable until a separate body-size limit was raised, so the gap stayed hidden. Three outages, one unanswered question, three different places.
- Outcome: migration 0030. Doc 07, Bug 10, and Part 4 item 1.

**ADR 012: Regenerate Supabase types after every schema migration — never cast around stale types (13 Aug 2026)**
- Decision: after any migration that adds or changes a column, regenerate `src/lib/database.types.ts`. Do not use a type cast (`(row as { col?: T }).col`) to silence an error caused by types being out of date.
- Rationale: a cast used to work around stale types also silenced the check that would have caught a genuinely missing column in a `.select()` list — Supabase returns only explicitly requested columns, so the field was `undefined` at runtime and a feature silently did nothing across two additional rounds of debugging.
- Outcome: doc 07, Bug 14. The cast removes the safety net exactly where it has just been demonstrated to be needed.

**ADR 013: Amounts are captured at transaction time, never recomputed from current configuration (13 Aug 2026)**
- Decision: `applications.amount_due_kobo` is the source of truth for what a given application was charged. Revenue and financial reporting sum that stored value — never a price looked up from `courses` or a hardcoded price table at report time.
- Rationale: the original request for the revenue fix was to hold prices "in an array so the amount can be changed later." That would retroactively restate historical revenue at current prices every time a price changed. Storing the amount at submission time keeps each row at whatever was actually charged, and course prices remain editable in `courses` without corrupting history.
- Outcome: migration 0032. Doc 07, Bug 13.

---

**Last verified:** 13 August 2026 (session 9)
**Next review:** When Stripe integration starts, or the next real incident.
