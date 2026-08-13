# KIT — Bugs, Root Causes, and Lessons Learned

**Purpose:** A complete, honest record of what broke in this project, why it broke, exactly how it was fixed, and what changes as a result — for whoever builds on this next, human or AI. Nothing here is softened. If a mistake was amateur, it's called that.
**Last updated:** 13 August 2026 (session 9)
**Companion to:** doc 06 (`06-BATCH-SHELL-SPEC.md`) has its own shorter as-built deviation log for the batch-shell build specifically. This document is the whole project's bug history — it summarizes those earlier incidents and gives full detail on everything since.

**14 bugs documented, plus one investigation that turned out not to be a bug at all.** Three of them were total outages affecting every student simultaneously, all three sharing a single root cause (see Part 4, item 1).

---

## How to read this document

Each entry follows the same shape: **Symptom** (what a real user saw) → **False leads** (what looked like the cause but wasn't, if any) → **Root cause** (confirmed, not guessed) → **Fix** → **Lesson** (what changes going forward, stated as a rule, not a vague regret).

Bugs are numbered in the order they were found, not severity. **Severity is called out explicitly** where it matters — several of these were "nothing works for anyone," not edge cases.

---

## Part 1 — Before this session (summarized)

These were found and fixed in the batch-shell build (doc 06 covers them in full technical detail; summarized here for a complete single record).

| # | Bug | Severity | One-line cause | Fixed by |
|---|-----|----------|-----------------|----------|
| A | `get_my_submission` / `return_homework` called with wrong argument count | Broken on every use | RPC signatures assumed from memory, not verified against the migration | Read the actual migration file before writing the call |
| B | Admin homework file-preview: "Object not found" | Broken on every use | Code pointed at a `submissions` storage bucket that never existed — real bucket is `summer` with a `submissions/` prefix | Corrected the bucket name after checking the actual upload code |
| C | `/smportal/homework` (list page) 404'd on every visit | Broken on every use | Detail-page logic (expecting an `[id]` route param) was sitting at the parent path, which has no dynamic segment — `params.id` was always `undefined` | Replaced with a real list page |
| D | Doc 05's folder comment claimed the `/admin` auth gate was "future work" | Documentation error, not code | Gate was already built; the comment was just never updated | Corrected the doc |
| E | Four separate broken Vercel builds from hand-merged diffs | Build failures, caught before deploy each time | Diffs pasted into files that had already been edited multiple times dropped types, props, and destructured variables | Established the rule: once a file's been touched more than once in a session, hand back the complete file, not a diff |

**The pattern underneath all five:** almost every early bug traced back to *trusting a claim instead of checking the source* — a doc's description of an RPC, a doc's description of a bucket, a doc's description of an auth gate. Doc 06 §IX and the README's "Critical Gotchas" section both exist because of this pattern specifically.

---

## Part 2 — This session, in full detail

### Bug 1 — Homework "Redo" button did nothing, silently

**Symptom:** Student clicks "Redo this (removes feedback)" on a returned assignment. Button briefly shows "Removing…", then reverts. No error. File is not removed.

**Investigation:** Two layered problems, found in sequence.

**Layer 1 — the UI was swallowing its own error.** `onUnsubmit()` correctly set an `error` state on failure — but the JSX branch for a *returned* submission never rendered `{error}` anywhere. The exact same omission existed in the *turned-in* branch too. So even when something failed loudly on the server, the student (and Alfred, testing it) saw nothing. **Fixed first**, independent of the deeper issue, because you can't diagnose what you can't see.

**Layer 2 — once the error was visible, it said nothing was wrong.** `unsubmit_homework`'s real SQL:
```sql
DELETE FROM summer_submissions
 WHERE summer_student_id = p_summer_student_id
   AND resource_id = p_resource_id
   AND status = 'turned_in';   -- not 'returned'
```
This was a **deliberate** guard, with its own comment explaining why: *"once a teacher has returned it, unsubmitting would silently discard their feedback, so that's blocked."* On a `returned` row, the `WHERE` clause matches zero rows. Postgres reports success (nothing failed — it just deleted nothing). The client function only checks for a Postgres error, not for whether a row actually changed, so it also reported success. Everyone was telling the truth; the truth was just "I did nothing."

**Root cause:** Two independently-reasonable pieces of code — a UI feature explicitly named "removes feedback," and a database rule explicitly built to prevent feedback being removed — were never checked against each other. Neither one was buggy in isolation.

**Fix, round 1:** A new migration loosening the guard to allow `status IN ('turned_in', 'returned')`, written and ready — **but never applied.**

**Fix, round 2 (what actually shipped):** Alfred decided the simpler, safer answer was to remove the Redo button from the UI entirely rather than loosen a deliberate data-integrity rule. The database guard was left exactly as originally written. UI and database now agree again — neither allows it.

**Lesson:** When a feature request and an existing safety rule point in opposite directions, that's a product decision, not a bug to code around silently. The fix that shipped was "change the product," not "change the database" — and that was the right call once surfaced, not the first instinct.

---

### Bug 2 — Every student, portal-wide, saw the URL "flash" between `/summer` and `/smportal` and a blank white screen

**Severity: total outage of the student portal, for every student, discovered on the day it mattered most.**

**Symptom:** Two students reported logging in successfully (nav showed "Sign out") but the portal itself would never load — URL bouncing between `/summer` and `/smportal`, blank screen, forever.

**False leads chased, in order — kept here because the process matters as much as the answer:**
1. *Stale cookie in one browser?* Ruled out — reproduced in incognito.
2. *Cookie issued before the earlier database wipe, pointing at a deleted row?* A specific, testable theory — decoded the actual session cookie's payload to get the real `sid`, queried `summer_students` directly by name: zero rows. Looked confirmed.
3. *Wrong Supabase project — checking dev data against a different database than production?* Raised as a real possibility given two very differently-named migration files turned up. Also looked plausible.
4. **Then a single command overturned both #2 and #3 at once:** re-inserting the "missing" row hit `ERROR: duplicate key value violates unique constraint`. The row had been there the entire time. A `SELECT` had returned nothing for it minutes earlier. That is not what a missing row does — that is what a permissions problem looks like from the outside, because a blocked read and a genuinely empty result look identical to the person running the query.

**Root cause, confirmed:** `/smportal/page.tsx` read the student's own name/week/batch with a **raw table query**:
```ts
await supabase.from("summer_students").select("name, cohort_year, batch_id").eq("id", session.sid)
```
`summer_students` has exactly **one** RLS policy: `ALL` commands, gated on `is_admin()`. Summer students authenticate via a signed cookie, not Supabase Auth (ADR 002, deliberately — no account needed) — so `is_admin()` evaluates false for every student, unconditionally. This query was never going to return a row for any student, ever. It was not a regression and not specific to these two students — it was broken from the moment it was written, and simply hadn't been exercised by a real student, on a real device, until launch day.

**Fix:** A new `SECURITY DEFINER` function, `get_my_summer_student(p_summer_student_id)`, following the exact same trust pattern already used by every other student-facing read in the app (`get_summer_portal`, `get_summer_resources`, `turn_in_homework`) — the verified cookie's id is trusted, RLS is deliberately bypassed inside a function that itself does the real checking. One line changed in `/smportal/page.tsx`: the raw query became an RPC call.

**Lesson, stated plainly:** *Every other file in the summer-facing codebase used the SECURITY DEFINER pattern specifically because summer students can't pass RLS. One file didn't, and it happened to be the one page every single student's session depends on.* The fix wasn't cleverness — it was applying a pattern that already existed everywhere else, correctly, to the one place it had been skipped. The real lesson is upstream of the code: **the happy path — a brand-new student, signing in for the first time, reaching the portal — had never actually been tested end to end before real students tried it.** Admin-side features were exercised heavily all night; this one wasn't, because nobody had a reason to be a "new student" until launch day made everyone one at once.

---

### Bug 3 — Weekly resource slides: "Couldn't open that file," for every student, on every slide

**Severity: total outage of resource downloads for every student.**

**Symptom:** Clicking "View" on any lesson slide showed "Couldn't open that file." Worked fine when tested from an admin's own browser.

**Investigation:**
1. Exact error text mattered here: `getSummerFileUrl` returns `"Not available."` for a specific known check (a year-prefix mismatch) and a *different* string, `"Couldn't open that file."`, when the Supabase Storage call itself fails. The message students saw ruled out the year-prefix theory immediately and pointed straight at the storage call.
2. The single most decisive fact: **it worked on Alfred's machine and failed for every student, on the identical file, identical path, identical code.** A wrong path fails for everyone equally. A permissions problem fails differently depending on who's asking — which is exactly what a "works for the admin, fails for every student" split looks like.
3. Confirmed by querying `pg_policies` directly rather than inferring: the `summer` bucket had **exactly one policy** — `ALL` commands, gated on `is_admin()`. Same structural mistake as Bug 2, in a different subsystem (storage, not table RLS), discovered independently before the pattern was recognized as a repeat.

**A second problem found while investigating, not the main bug but worth its own line:** the code that called Supabase Storage was silently discarding the real error and replacing it with a generic message — nothing was ever logged. The first fix applied was adding real logging (`console.error` with the actual Supabase error text) specifically so this class of bug would be diagnosable in minutes instead of multiple rounds of hypothesis-testing next time.

**Fix:** A new, narrowly-scoped storage policy:
```sql
CREATE POLICY "summer resources readable by anyone"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'summer'
  AND (storage.foldername(name))[1] <> 'submissions'
);
```
Deliberately **not** a blanket "make the bucket public" fix — that bucket also holds students' own submitted homework files, and a careless fix here would have quietly made every student's private submission readable by anyone holding the public API key. The `submissions/` exclusion is the whole reason this took a real policy, not a one-line settings toggle.

**Status note, for accuracy:** this migration (0029) was written and handed off; the conversation moved to a different task immediately after, and no explicit "confirmed working" was received the way Bug 2's fix was. The diagnosis (identical `pg_policies` output, identical "works for admin, fails for every student" split) is as solid as Bug 2's — but **treat this as "fix provided, deployment/verification not confirmed" until someone actually checks**, not as closed.

**Lesson:** This is the same root mistake as Bug 2 — a table or bucket created for admin write access got an `ALL`-scoped policy and nobody separately asked "and who should be able to *read* this?" **When creating any new table or storage bucket that summer-student-facing code will need to read, write the read policy and the write policy as two deliberate, separate decisions — never assume an admin `ALL` policy silently covers a different role's read access, because it doesn't.** Also: never let a caught error get replaced with a generic message without logging the real one somewhere — the fifteen minutes spent adding logging paid for itself within the same conversation.

---

### Bug 4 — PowerPoint (and other browser-renderable files) opened inline instead of downloading

**Symptom:** Clicking to download a `.pptx` resource opened it as a rendered page in a new tab instead of downloading it. Binary files (`.zip`, sometimes `.docx` depending on browser) had always worked, masking the bug.

**Root cause:** Browsers decide whether to render a file inline or force a download based on the response's `Content-Type` and whether `Content-Disposition: attachment` is set. The signed URL was being generated correctly — it just never told the browser to force a download, so any browser-renderable type (text, markdown, some PDFs, HTML) opened inline instead. This wasn't a bug specific to PowerPoint; PowerPoint was just the first file type used that happened to expose it.

**Fix:** Added the `download` option to `createSignedUrl`, with the filename's upload-time timestamp prefix stripped first so the saved file has a clean, real name rather than `1786xxxxx-README.md`.

**Lesson:** A feature that "works" when tested with one file type can be silently broken for a whole category of other types. Test file-handling code with at least one browser-renderable type (`.md`, `.txt`, `.pdf`) and one that isn't (`.zip`, `.docx`), not just whatever file happened to be on hand while building it.

---

### Bug 5 — The homework upload redesign "still looked the same" across three rounds of fixes

**Severity: no functional break, but three consecutive rounds of design iteration produced no visible change, which is its own kind of expensive.**

**Symptom:** A redesigned file-upload card (dropzone, styled button, disabled/enabled states) was shipped, screenshotted, and reported as looking unchanged — twice in a row, across two different follow-up fixes.

**Root cause, found only by auditing the actual stylesheet with a direct search rather than trusting what had been sent:**
```
.hw-turnin        → defined at line 4816 (the real, original rule)
.hw-turnin        → defined AGAIN at line 6089 (from an earlier fix attempt)
.hw-dropzone       → defined twice
.hw-spinner        → defined twice, including two copies of the same @keyframes
.hw-dropzone-title / .hw-dropzone-btn   → leftover class names from an earlier design
                                            iteration that the component no longer used
.hw-dropzone-text / .hw-dropzone-link   → the classes the CURRENT component actually
                                            needed — not present anywhere in the file
```
Every round of "here's the CSS to add" had been **pasted in addition to** the previous round rather than **replacing** it. CSS doesn't error on a duplicate rule the way a build fails on a duplicate variable — the browser just applies whichever matching rule comes later in the file, silently. The visual result was an unpredictable mix of three different design iterations, while the classes the newest component code actually referenced didn't exist in the stylesheet at all. Every fix up to this point had been reasoning about a version of the file that didn't match reality, because nobody had looked at the whole file — only at what was being added to it.

**Fix:** A full `Select-String` search across every relevant class name, deleting every match found (not "the recent ones" — all of them, including the untouched original `.hw-turnin` from line 4816, which was still using an `opacity: .5` disabled state that had never actually been identified as part of the problem across two prior "fixes"), then pasting exactly one clean, complete copy.

**Lesson — arguably the single most useful one from tonight:** Component code fails loudly when something's wrong (a build error, a missing prop). **CSS fails silently — a duplicate or stale rule doesn't crash anything, it just coexists and produces a result that looks like "the fix didn't work."** Before adding CSS to an existing stylesheet for a class family that's been touched more than once, search for every existing occurrence of those class names first. Don't assume a paste is additive to a clean base; verify the base is actually clean.

---

### Bug 6 — Generated phone country-code list had wrong dial codes for the most commonly-selected countries

**Severity: would have shipped silently wrong for a small number of real countries — caught in QA before deployment, not after.**

**Context:** Rather than type ~250 international dial codes from memory (an approach explicitly rejected as too error-prone for exactly this reason), the list was generated programmatically from a maintained, structured public dataset.

**Root cause:** The dataset's `idd.suffixes` field, for countries that share a country-calling-code root with several others, stores something more granular than "the code" — for `+1` (the North American Numbering Plan), it lists the **actual internal area-code list**, including all ~380 real US area codes and ~62 Canadian ones, alongside the genuinely distinct codes of other `+1` nations (Jamaica's `+1876`, the Bahamas' `+1242`, which really are how those countries are conventionally identified). A naive "root + first suffix" derivation picked an arbitrary US area code (`+1201`) and Canadian one (`+1204`) as if they were "the" code for those countries — wrong for the two most likely countries to actually be selected in this specific context. The same shape of mistake, independently, affected Russia and Kazakhstan sharing `+7`.

**Fix:** Caught by direct verification against the raw source data (not by trusting the derivation logic), specifically checking the countries most likely to matter — the US was checked precisely because it's a likely selection, not because of a hunch. Four countries (US, Canada, Russia, Kazakhstan) special-cased to use the bare root code; every other `+1`/shared-root country kept its real, distinct suffix since those genuinely are correct.

**Lesson:** "Generate it from a trustworthy structured dataset instead of typing it by hand" reduces transcription error, but it does **not** eliminate the need to verify the *meaning* of the fields being used. A reliable source can still be applied incorrectly. When authoring any reference table programmatically, spot-check the derivation against the entries most likely to actually be used — not a random sample, the *predictable* ones.

---

### Bug 7 — Two coordinate-math bugs in the generated fillable homework PDF, caught before the document ever reached a student

**Symptom, caught during the mandatory visual QA pass, not reported by a user:**
1. A field label ("YOUR G.O.A.L. VERSION") was being visually painted over by the input box drawn directly beneath it — only the first letter survived.
2. Even after adding vertical spacing to fix that, the label was *still* obscured — because the real bug wasn't spacing at all.

**Root cause:** The helper function `boxed_field()` computed the interactive form widget's position using arithmetic that didn't match how the visible bordered rectangle was actually drawn — the widget's real height calculation put its top edge roughly 24 points *above* the visible box's own top edge, overlapping whatever content sat above it. This affected every single boxed field in the document (all 12 workbook explanation boxes, all 5 prompt-rewrite boxes) — it was just only *visible* as broken on the one page where a text label happened to sit directly above a box.

**Fix:** Corrected the widget's inset math to be simple, symmetric padding from the visible box's own edges, rather than an independent (and wrong) calculation. One fix in the shared function corrected all 17 affected fields at once.

**Lesson:** This is a version of Bug 5's lesson applied to a completely different medium: **a bug in a shared helper function affects every caller identically, but is only "visible" wherever a human happens to look closely.** The QA process — converting to images and actually looking at every page, not just confirming the script ran without a Python exception — is what caught this. "The code executed successfully" and "the output is correct" are different claims, especially for anything involving visual layout or coordinate math.

---

### Bug 8 — Slide template icons rendered solid black instead of white

**Symptom:** Every icon in a generated PowerPoint template rendered as solid black, regardless of the color explicitly requested when generating it.

**Root cause:** The icon-generation script rendered each icon to SVG, then **stripped the outer `<svg>` tag** to rebuild a fresh wrapper with a hardcoded viewBox. The color information lived in a `style="color:#fff"` attribute *on that exact outer tag* — every inner path used `fill="currentColor"`, which only resolves correctly if something above it in the DOM actually sets `color`. Discarding the outer tag discarded the only thing `currentColor` had to inherit from, so it fell back to the browser/renderer default: black. The hardcoded replacement viewBox was also wrong for any non-square icon, silently distorting them.

**Fix:** Stopped rebuilding the SVG wrapper entirely — kept the full, original, correctly-colored and correctly-sized markup exactly as generated, and rasterized that directly.

**Lesson:** When manipulating generated SVG/XML output, understand *why* an attribute is doing what it's doing before removing or replacing the element that carries it. "This tag looks unnecessary" is not the same claim as "this tag carries no information the rest of the file depends on."

---

### Bug 9 — Homework upload rejected: "Body exceeded 1 MB limit"

**Severity: blocked a real student mid-submission, on the day her homework was due.**

**Symptom:** A student tried to submit her completed assignment. Nothing happened in the UI. Vercel logs showed `Error: Body exceeded 1 MB limit ... statusCode: 413`.

**Root cause:** Next.js caps Server Action request bodies at **1MB by default**, and file uploads go through a Server Action (`uploadSubmissionFile` takes `FormData`). Her filled-in PDF was over that, so the request was rejected by the framework before any application code ran. Nothing in the codebase was wrong — it was an unconfigured platform default nobody had hit yet, because earlier test files happened to be small.

**Fix:** `serverActions.bodySizeLimit: "4mb"` in `next.config.ts`, plus correcting the UI copy which had been promising "up to 25MB."

**The important constraint, and why 4MB and not 25MB:** Vercel's serverless functions have their own hard payload cap of roughly **4.5MB**, independent of any Next.js setting. Raising `bodySizeLimit` to 25MB would not have produced a 25MB limit — it would have failed slightly higher up with a different, more confusing error. **The real fix for larger files is direct-to-Supabase upload** (browser uploads straight to storage via a signed upload URL, bypassing Vercel entirely), which removes the ceiling completely. That remains unbuilt.

**Lesson:** When a framework or platform default blocks something, check whether the *next* layer up has its own limit before raising the first one. Raising a limit to a number a lower layer will reject anyway produces a worse failure than the original, because the error message no longer points at the real constraint. Also: the UI was advertising a limit (25MB) that no layer of the stack actually supported — **advertised limits should be derived from the real constraint, not aspirational.**

---

### Bug 10 — Homework upload rejected: "new row violates row-level security policy"

**Severity: blocked the same student, immediately after Bug 9 was fixed.**

**Symptom:** With the body-size limit raised, the upload got further and then failed with an RLS violation on insert.

**Root cause:** **The third independent instance of the same pattern as Bugs 2 and 3** — this time on the *write* side. The `summer` storage bucket's only write policy was `is_admin()`-gated, which no summer student can ever satisfy. Reads had been fixed in migration 0029; writes were never addressed because, until the body-size limit was raised, no upload had ever gotten far enough to attempt one.

**Fix:** Migration 0030 — a narrowly-scoped `INSERT` policy allowing writes to the `submissions/` prefix only:
```sql
CREATE POLICY "summer submissions writable by anyone"
ON storage.objects FOR INSERT TO public
WITH CHECK (
  bucket_id = 'summer'
  AND (storage.foldername(name))[1] = 'submissions'
);
```
Deliberately `INSERT` only, not `ALL` — students can create submission files but cannot overwrite or delete existing ones directly through storage. And deliberately scoped to `submissions/` so students can never write into `{year}/week{n}/` where admin lesson materials live.

**A limitation stated openly rather than glossed:** this policy permits *anyone* holding the public anon key to write into `submissions/`. That is consistent with how the whole summer program already works — summer students have no Supabase Auth identity, so the database genuinely cannot distinguish one student from another; the real gate is the Server Action, which verifies the session cookie before touching storage (ADR 002). But the database is not enforcing "student A can't write into student B's folder" — only application code is. Worth knowing explicitly rather than discovering later.

**Lesson:** By the third occurrence, this stops being a bug and becomes a design gap. **When creating any table or bucket, write down the answer to all four questions before moving on: who can read, who can write, who can update, who can delete — for every role that will touch it.** Bugs 2, 3, and 10 were the same unanswered question in three different places.

---

### Bug 11 — The resources page showed nothing at all

**Severity: an entire page of the student portal was non-functional.**

**Symptom:** `/smportal/resources` displayed no resources, despite slides and homework existing and rendering correctly on the portal dashboard.

**Root cause — two separate bugs in the same file, either of which alone would have broken it:**

1. **The RPC was called with a missing required argument.** `get_summer_resources` takes both `p_cohort_year` and `p_summer_student_id` — the second was added in migration 0022 when resources became batch-aware. This page passed only the year. With no student id, the batch-scoping filter matched nothing and returned an empty list, every time, for everyone. The portal dashboard called the *same* RPC correctly with both arguments, which is exactly why one page worked and the other didn't.

2. **A raw `.from("summer_students")` query** — the identical mistake that caused the total portal outage in Bug 2, in a file nobody had re-checked afterward. Since that table is admin-gated, it returned `null` for every student, and the `if (!student) redirect("/summer")` line meant the page may not even have been rendering empty — it may have been bouncing students straight back out.

**Fix:** Pass `p_summer_student_id`, and replace the raw query with the `get_my_summer_student` RPC that already existed from Bug 2's fix.

**What actually closed this bug class:** after fixing it, a codebase-wide search for both patterns:
```powershell
Get-ChildItem -Recurse -Include *.tsx,*.ts | Select-String 'from\("summer_students"\)'
Get-ChildItem -Recurse -Include *.tsx,*.ts | Select-String 'get_summer_resources'
```
Result: five remaining raw `summer_students` queries, **all five correctly in `/admin/` code** (admins do satisfy `is_admin()`), and all four `get_summer_resources` call sites confirmed passing both arguments. The class is now verifiably closed rather than assumed closed.

**Lesson:** **When you fix a bug caused by a repeatable pattern, immediately grep for every other instance of that pattern — the same day, not eventually.** Bug 2 was fixed and the same mistake sat undiscovered in a second file for days. A two-minute search after the first fix would have caught it.

---

### Bug 12 — The resources sort toggle appeared to do nothing

**Symptom:** The "Newest first / Oldest first" dropdown on the resources page had no visible effect.

**Root cause:** The sort was real, but it only ordered the **week groups** relative to each other — not the resources *within* each week. With only Week 1 populated at the time, there was exactly one group, so reordering groups changed nothing visible. Items inside stayed in the RPC's own `week, day_number, sort_order` ascending order regardless of the toggle.

**Fix:** Sort within each week as well as between weeks, with the direction applied to both.

**A related mistake made while fixing it, worth recording:** the first version of the fix sorted on `day_number` *and* `sort_order` — but `sort_order` isn't exposed on the `PortalResource` type, so it produced type errors in two files. The type was assumed rather than checked. Corrected to sort on `day_number` alone, which is sufficient (items already arrive in `sort_order` sequence, so a stable sort preserves it as a natural tiebreak).

**Lesson:** A feature that is "working correctly" at one scope can be indistinguishable from broken at another. **When a sort, filter, or grouping appears not to work, check whether it's operating at a different level than the user is looking at** — grouping vs items, page vs section — before assuming the logic is wrong.

---

### Bug 13 — Dashboard revenue permanently showed ₦0

**Symptom:** The admin dashboard's "Revenue received" figure showed zero despite six paid applications.

**Root cause:** The `admin_stats` view computed `revenue_naira` and `outstanding_naira` by summing `payments.amount_kobo` — and **nothing in the entire codebase ever writes a row to the `payments` table.** Confirmed by a full search: the only matches for `"payments"` anywhere are admin navigation labels. Both the Paystack webhook and the manual `markApplicationPaid` action update `applications.payment_status` directly and never touch `payments`. The table exists as schema scaffolding for a financial trail that was never built.

**Fix:** Migration 0032 — rewrote just those two columns to compute from `applications.amount_due_kobo` filtered on `payment_status = 'paid'`. The other eight stats in the view were copied byte-for-byte unchanged.

**A design decision made deliberately here, worth recording because the obvious alternative is wrong:** the request was originally to store prices "in an array so the amount can be changed later." That would have been a real mistake — `applications.amount_due_kobo` already captures the price *at submission time*, so historical revenue stays correct even after a course price changes. A price array would have retroactively restated past revenue at today's prices every time a price was updated, silently corrupting historical figures. Course prices already live in the `courses` table and are admin-editable; an array would have been a third place prices live and the one most likely to drift.

**Also fixed by the same change, without extra work:** revenue now counts manual bank-transfer payments identically to Paystack ones, because both routes set the same `payment_status = 'paid'`.

**Lesson:** **A stat reading zero is not always "no data" — check whether the source it reads from is ever actually written to.** An empty table and a broken pipeline look identical from the dashboard. Also: when someone asks for a mechanism (an array of prices), check whether the underlying need is already met by existing data before building it — storing a value at transaction time is almost always better than recomputing it from current configuration.

---

### Bug 14 — Test account inflated revenue and roster counts, then the badge didn't render

**Symptom:** An internal test application (student name "KIT") that had been manually marked paid was counted in real revenue and in the summer student count.

**Fix, part 1:** Migration 0034 added an `is_test` boolean to both `applications` and `summer_students`, flagged the known test rows *by id* (not by name), and rebuilt `admin_stats` to exclude them from every figure. A flag rather than a `where name <> 'KIT'` filter, deliberately: a name filter breaks the day a real student is called Kit, and offers no way to mark the *next* test account without another migration.

**Then a second bug, in the fix itself:** the update statement targeted `summer_students` via `where application_id = '<id>'` — but that column was null on the test row, so it matched nothing. Revenue corrected (the `applications` update worked), the roster didn't. Fixed by updating directly on `summer_id`.

**Then a third bug, in the same feature:** with the data finally correct, the badge still didn't render and counts still read 6. Root cause: `is_test` was **not included in the `.select()` list** on the summer query. Supabase returns only explicitly requested columns, so `s.is_test` was `undefined` on every row and the `?? false` fallback made every student look non-test.

**Why that third bug got through, and this is the actual lesson:** the TypeScript workaround used earlier — `(s as { is_test?: boolean }).is_test` — was applied because `database.types.ts` was stale and didn't know the column existed. **That cast silenced exactly the check that would have caught the missing column in the select.** With properly regenerated types, TypeScript would have flagged it immediately. Regenerating the types (`npx supabase gen types typescript --linked`) and dropping the cast fixed the underlying cause, not just the symptom.

**Lesson:** **A type cast used to silence an error caused by stale generated types will also silence real errors in the same area.** When generated types are out of date, regenerate them — do not cast around them. The cast is not a smaller version of the fix; it is the removal of the safety net precisely where you have just demonstrated you need one.

---

### Non-bug — Paystack "not working" was payment abandonment

**Recorded because several hours went into investigating it as a bug, and the conclusion matters for anyone who sees the same symptom.**

**Reported symptom:** an application went through without Paystack ever appearing.

**Actual cause:** nothing was broken. Two people had already paid successfully, proving the whole chain works — init, checkout, webhook, marked paid. The reported case was someone closing the Paystack modal without completing payment. `submitApplication` is *deliberately designed* to save the application anyway and return `checkoutUrl: null` rather than erroring, so a parent never has to fill the form twice. The code was doing exactly the right thing.

**What made this hard to see:** `submitApplication` has three separate paths that all return `ok: true, checkoutUrl: null` — missing key, Paystack init failure, and normal abandonment — and from the outside they are indistinguishable. Two of the three log; one (the missing-key path) is silent.

**Resolution:** no code change. Alfred now manually texts bank account details to applicants who haven't paid. At current volume, a personal WhatsApp message converts better than any automated recovery email.

**Lesson:** **Before debugging "X is broken," establish whether X has ever worked for anyone.** Two successful payments would have reframed the entire investigation in thirty seconds. "It didn't work for this one person" and "it doesn't work" are different claims requiring different investigations.

---

## Part 3 — Still open, not fixed (listed honestly, not implied resolved)

**Deferred by explicit decision:**
- **USD / international payments.** Foreign applicants are charged the naira price. A full USD implementation was designed and written (migration 0033, phone-based foreign detection, per-currency revenue splitting) but **is deliberately not deployed** — Paystack could not enable USD on this account. The work is parked pending a Stripe integration. Do not run migration 0033 as-is; it assumes a Paystack USD capability that does not exist.
- **Teachers page** is a deliberate stub. The `teachers` table is empty and summer instructor names are free text on `summer_batch_sessions`, so there is nothing to manage yet. Revisit when there is a real teaching structure.
- **5 admin nav items still 404:** `/admin/courses`, `/admin/batches`, `/admin/payments`, `/admin/classes`, `/admin/audit`. (`/admin/students` and `/admin/teachers` are now built.)

**Real, unfixed:**
- **File uploads capped at ~4MB** by Vercel's serverless payload limit. Direct-to-Supabase upload would remove the ceiling entirely (see Bug 9).
- **The "N payments are overdue" dashboard alert** reads from `admin_outstanding_payments`, a view built on the same never-written `payments` table as Bug 13. It silently never fires. Same shape of fix as Bug 13 if it's wanted.
- **`applications` has no country field.** Foreign applicants are detectable only by parsing the phone number's dial code — a heuristic that will misfire for a Nigerian parent abroad or a foreign parent using a Nigerian number.
- **Day 2 lesson deck's Wrap-Up slide** previews a homework format that doesn't match what shipped as "KIT Assignment 1."

**Closed since the last revision:** the storage read policy (0029) is confirmed applied and working; SEO is fully implemented (robots, sitemap, per-page metadata, Open Graph image, structured data verified parsing, Google Search Console and Bing both submitted, homepage and `/apply` both indexed).

---

## Part 4 — Patterns that showed up more than once (the actual takeaways)

If only these are kept in mind going forward, that's enough:

1. **Every new table and bucket needs all four access questions answered explicitly — read, write, update, delete, per role.** The same unanswered question caused three separate total outages (Bugs 2, 3, 10). An `is_admin()`-gated `ALL` policy grants *nothing* to a cookie-authenticated summer student, and the failure is silent: no error, just empty results or a rejected insert.
2. **When you fix a bug caused by a repeatable pattern, grep the whole codebase for that pattern immediately.** Bug 2's root cause sat undiscovered in a second file until Bug 11 surfaced it days later. The search that eventually closed the class took two minutes.
3. **CSS must be verified by searching the whole file before pasting, every time a class family has been touched more than once.** Unlike component code, a duplicate or stale CSS rule doesn't error — it silently wins or loses on file order and looks exactly like "the fix didn't work" (Bug 5).
4. **Never let a caught error be replaced with a generic message without logging the real one.** Every multi-round diagnosis in this document was slowed by a real error being discarded before anyone could see it.
5. **Never cast around stale generated types — regenerate them.** The cast removes the type safety precisely in the area you've just proven you need it, and it directly caused a third round of the same bug (Bug 14).
6. **Before debugging "X is broken," establish whether X has ever worked for anyone.** Distinguishing "broken for everyone" from "failed for one person" reframes the entire investigation, and the two need completely different approaches.
7. **The happy path — a brand-new user's very first real attempt — must be tested with genuinely fresh data.** Two total outages existed from day one and simply hadn't been exercised until real students arrived.
8. **A stat reading zero may mean its source is never written to, not that there's no data.** Check the write path before debugging the read path (Bug 13).

---

**This document is not exhaustive of every small fix** (see doc 06 for the batch-shell-specific log, and doc 01's version history for the broader timeline) — it's the complete record of everything that actually broke for a real user, or would have, and had to be understood before it could be fixed.
