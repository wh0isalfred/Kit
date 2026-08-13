# 06 — Batch Shell & Homework System: As-Built Record

**Status:** ✅ **BUILT, DEPLOYED, AND CONFIRMED WORKING.** All 9 planned build steps shipped.
**Originally designed:** 29 July 2026
**Built:** 29 July 2026, same day, one continuous session
**For:** whoever extends this system next — human or AI
**Companion docs:** 01 (roadmap, ADRs), 02 (RPC signatures, Server Actions reference), 05 (folder structure), 07 (full project-wide bug history, session 8)

This document was originally a build spec written before any code existed. It is now a record of what was actually built, including every place the real implementation differs from the original plan, and every bug that was found along the way. **Where this document and the original spec disagree, this document — the as-built record — is correct.** Where this document and the actual code disagree, the code wins; verify before relying on any claim here.

> **Note added session 9 (13 August 2026):** every bug found since this doc was written has been in student-facing code outside the batch shell (`/smportal`, the application form, storage policies, the admin dashboard) — **none inside this system.** The batch shell has run in production through a full cohort without a reported defect. This doc's own bug log below remains accurate and specific to the batch-shell build. See doc 07 for the full project bug history, including three full-outage incidents that all shared one root cause.

---

## I. THE PROBLEM THIS SOLVED

Before this build, everything lived on one `/admin/summer` page: cohort settings, batch list, live toggle, weekly resources, homework grading. It worked, but it answered no question well — there was no "what's waiting on me right now" view; you had to remember which assignments existed, open each one, and scan.

**Design principle that held up in practice: the homework tab is a queue to drain, not a database to browse.** Browsing (the "By assignment" view) is the fallback, not the default.

---

## II. ROUTE STRUCTURE — AS BUILT

```
/admin/summer                          cohort settings + batch cards (reordered: batches now come FIRST)
/admin/summer/batch/[batchId]          redirects → /overview
/admin/summer/batch/[batchId]/overview
/admin/summer/batch/[batchId]/class
/admin/summer/batch/[batchId]/resources
/admin/summer/batch/[batchId]/homework          queue (default) + by-assignment, both inside ONE route
```

**Deviation from the original spec:** the spec called for a separate route per assignment, `/admin/summer/batch/[batchId]/homework/[resourceId]`, for the by-assignment roster. **This was not built as a separate route.** Instead, `homework/page.tsx` renders a client-side segmented control (`HomeworkQueue.tsx`) that switches between the queue view and a `ByAssignmentView.tsx` component, which itself holds an in-page assignment picker (grouped by week) and renders `HomeworkReview.tsx` for whichever assignment is selected, all without a URL change. This means an admin cannot currently bookmark or deep-link directly to one specific assignment's roster — they can bookmark `/homework` and will land on the queue, but reaching a specific assignment always requires picking it from the in-page list first. If deep-linking to a specific assignment turns out to matter in practice, this is a real, contained piece of follow-up work — not a bug, a scope decision that turned out to be reasonable given how the picker+roster ended up being built together as one client component.

---

## III. `/admin/summer` — THE BATCH CARDS

Built as specified, with real data:

```
┌────────────────────────────────────────────┐
│  Batch 1 · Morning                          │
│  18 / 20 seats    ▓▓▓▓▓▓▓▓▓░                │
│                                              │
│  Week 2   ● Live now                        │
│  7 to grade                                 │
│                                              │
│  [ Open batch → ]                           │
└────────────────────────────────────────────┘
```

**Data, confirmed as-built:**
- Seats: the existing `batchesWithSeats` computation, extended (not replaced) with `current_week`, `is_live`, and `grading_count`.
- Week: `summer_cohorts.current_week` — cohort-wide, per the known limitation in doc 01 §IV.
- Live: `summer_batch_sessions.is_live` for `(batch, current_week)`, fetched once for all batches, not per-card.
- To grade: **one** `get_grading_queue(null)` call for the whole cohort, grouped by `batch_id` client-side in `page.tsx` — exactly as specified, and exactly why it's fast at any number of batches.
- Missing: not built, as specified — no clear single scope for a batch-level "missing" count without inventing one.

**Deviation, small:** the original mockup showed a "⋯" overflow menu on each card. What was actually built keeps Edit/Delete as visible buttons (matching the pre-existing pattern in `BatchManagement.tsx`) rather than introducing a new overflow-menu pattern. Purely a visual/interaction decision, not a functional gap.

---

## IV. THE BATCH SHELL

### Header (persists across all tabs) — as built

```
← All batches
Batch 1 · Morning                        18/20 seats · Week 2
[ Overview ] [ Class ] [ Resources ] [ Homework 7 ]
```

Matches spec. The `7` badge is computed in `batch/[batchId]/layout.tsx` via one extra `get_grading_queue(batchId)` call, passed down to `BatchTabs.tsx` as a prop, and only rendered when greater than 0 — "no badge" rather than a "0" badge, matching the same convention already used elsewhere in the admin UI for pending-count badges.

**Known minor inefficiency, accepted:** this means `get_grading_queue` is called twice per Homework-tab page load for one batch — once in the layout for the badge, once in `homework/page.tsx` for the actual list. This is not the "one call per batch in a loop" problem the spec warned against (that's about looping across *many* batches); it's a small, accepted redundancy for one batch on one page. Flagged as a candidate for a shared-fetch refactor if it ever matters.

### Tab: Overview — as built

Built last, as the spec instructed ("least important tab"). One bundled Server Action (`getBatchOverview` in `batch-actions.ts`) rather than the page firing several separate queries. Shows roster count/capacity, current week, live status, next class time, and assignments published vs. graded.

**One interpretive call made here, not fully specified:** the spec asked for "count of assignments published vs graded" without defining "graded" precisely. What was built is **submission-level**: of everything actually turned in so far, how much has been returned (`returned / (returned + turned_in)`). The alternative reading — assignment-level, "how many assignments have zero pending submissions" — was not built. If the assignment-level version turns out to be what's actually wanted, this is a real rebuild of that one metric, not a small tweak.

### Tab: Class — as built, with one deliberate enhancement beyond "unchanged"

The spec's literal instruction was "move `BatchSessionManager` in, unchanged behaviour." What actually happened: `BatchSessionManager.tsx`'s session-management fields (instructor, meet link, next class, live toggle) were extracted into a new `ClassSessionForm.tsx`, scoped to the batch already known from the route (so the old batch-selector dropdown was dropped — redundant once you're already inside one batch's page). The week selector was kept, since sessions are still per-week.

**The live toggle itself was not moved unchanged — it was upgraded**, because a literal unchanged move would not have satisfied two things the same spec section asked for in the same breath: "the largest element on the page, change colour decisively" and a warning when a batch has been live for more than ~2 hours. The original toggle was a small checkbox that had neither. **What was discovered and reused instead:** `GoLiveControl.tsx`, a fully-built but completely orphaned component — designed with exactly the large-status-plus-timer treatment the spec wanted, but wired to the old cohort-wide `set_summer_live` RPC that migration 0022 had already superseded, and not rendered anywhere in the app. Its visual design (and its matching, already-written CSS — `.admin-live`, `.admin-live-on`, `.admin-live-dot`) was adapted onto `set_batch_live` instead of being rebuilt from scratch. `GoLiveControl.tsx` itself remains in the codebase, unused, a candidate for deletion.

The ">2 hour live" warning was added as specified, computed client-side from `live_started_at` and a ticking clock (30-second interval), matching the pattern `GoLiveControl.tsx` already used for its own "running for X minutes" display.

### Tab: Resources — as built

Matches spec closely. Resources visible to a batch are `batch_id IS NULL` (shared) plus `batch_id = this batch`, each tagged. Shared rows are editable with a confirmation step before save; deletion of a shared row is blocked outright, with the error message pointing to the cohort-level screen. New resources added from inside a batch default to "this batch only," matching the spec's stated rationale.

**One real gap surfaced and closed during this build, not anticipated by the original spec:** the resource-creation form (`ResourceInput` in `resource-actions.ts`) had no `batchId` field at all before this work — meaning even after migration 0025 added the `batch_id` column to the database, there was no UI path to ever set it. This was closed by making `batchId` an optional field on `ResourceInput` (optional because the cohort-level editor, `SummerResources.tsx`, still never sets it and shouldn't have to) and adding a dedicated `deleteBatchResource` function alongside the existing unrestricted `deleteResource`.

**Known simplification:** new batch-only resources are always inserted with `sort_order: 0` rather than computed against siblings the way the cohort-level editor does. This tab doesn't do day-by-day drag-reordering the way the cohort screen does, so within-day ordering here is cosmetic, not a correctness issue.

### Tab: Homework — see §V

---

## V. THE HOMEWORK TAB — AS BUILT

Segmented control at the top, default is the queue, exactly as specified.

### V.a — Needs Grading (default)

Built as specified: `get_grading_queue(batchId)`, oldest first, one card per submission. **Everything in the interaction-rules list from the original spec was implemented:**

- Feedback typed inline; `Return` calls `return_homework(p_submission_id, p_feedback)` and the card is removed from the list optimistically (before the network call resolves), restored with an error message if the call fails.
- `Skip` moves a card to the bottom of the local list only — no DB write.
- Empty feedback is allowed; nothing forces a non-empty textarea.
- Submission preview: link-type submissions show the URL with an Open link; file-type submissions get an inline image preview (fetched eagerly via a signed URL, detected by file extension) if they look like an image, or a click-to-open link otherwise.
- Relative timestamps (`2d ago`); anything over 3 days gets a visually distinct (amber-tinted) card.
- Empty-queue state reads "Nothing waiting" and explicitly does not conflate "queue empty" with "everyone submitted" — it points toward the By Assignment view for that different question, exactly as the spec insisted on.

**One real bug found and fixed here, not anticipated by the spec:** the file-preview function initially assumed a storage bucket literally named `submissions`. No such bucket exists — homework files are actually stored in the `summer` bucket under a `submissions/` path prefix (confirmed by reading the actual upload code in `summer-session.ts`, after `getSubmissionFileUrl` returned "Object not found" for every single file, indistinguishable at first from a permissions problem). See doc 02 §VI for the corrected bucket table. This is exactly the kind of thing the spec's own "verify RPC signatures against the migration files" warning should have been extended to cover — storage bucket names are just as easy to get wrong from a stale document as a function signature is.

### V.b — By Assignment

Built largely by **adapting an existing, already-working component** (`HomeworkReview.tsx`) rather than writing a new one — it already had roster-fetching, expand-in-place rows, inline feedback, and a working Return call (fixed for arity back at the start of this build; see §IX). What it didn't have: an assignment picker (it took a `resourceId` as a prop, decided by something above it) and filter chips instead of read-only stat counts.

**What was added:** a new `ByAssignmentView.tsx` wraps `HomeworkReview.tsx` with a picker grouped by week (`getBatchHomeworkAssignments`, itself a new Server Action applying the ADR 005 batch-scoping predicate). Inside `HomeworkReview.tsx` itself, the previously read-only stat counts (`Total`, `Not turned in`, `Turned in`, `Returned`) became clickable filter buttons — `All / Turned in / Returned / Missing` — filtering the same already-fetched roster client-side, with no new query, exactly as the spec's "Missing costs one client-side filter" principle intended.

**Small drive-by fix made while in this file:** the roster array was being sorted via `roster.sort(...)`, which mutates state in place during render — not a bug that manifested visibly, but a latent one. Changed to `[...roster].sort(...)`.

---

## VI. WHAT DID **NOT** MOVE INTO THE BATCH SHELL — CONFIRMED AS BUILT

As specified, and confirmed still true after the full build:

- **Cohort settings** (dates, prize, active toggle, `current_week`) — still cohort-wide, still on `/admin/summer`.
- **Creating or deleting shared curriculum** — still only possible from the cohort-level Resources section. The batch-level Resources tab can edit a shared row (with confirmation) but cannot create or delete one.
- **Batch CRUD** — still on `/admin/summer`.
- **Applications & enrolment** — unchanged, still at `/admin/applications`.

**Additional, not originally specified but decided during the build:** `/admin/summer` itself was reorganized once the batch shell existed to make all of this obvious — batches moved to the top as the primary hub (since almost everything an admin does day-to-day now happens by opening a batch), cohort settings moved below, and the full shared-curriculum editor (`SummerResources.tsx`) wrapped in a new `CollapsibleResources.tsx` component that hides it behind a summary card by default. This was a direct response to the page feeling cluttered once its old per-batch sections had been removed but its remaining sections hadn't been re-prioritized for the new shape of daily work.

---

## VII. STATE MODEL — UNCHANGED, CONFIRMED CORRECT THROUGHOUT

Three states, two rows, exactly as designed:

```
assigned    NO ROW in summer_submissions
turned_in   row exists, status = 'turned_in'
returned    row exists, status = 'returned', feedback + returned_at set
```

All four consequences the original spec called out were confirmed true during the build and remain true:
1. You cannot return work that was never submitted — `return_homework` requires a `p_submission_id`.
2. A student resubmitting after a return wipes the prior feedback and `returned_at`, by design.
3. `unsubmit_homework` is blocked once status is `returned`.
4. There is still no edit-feedback-after-returning path — not built, per the original "don't build it unprompted" instruction, which held.

---

## VIII. TRAPS — UPDATED WITH WHAT ACTUALLY BIT

**🚩 `current_week` is still cohort-wide.** Confirmed still true, still not fixed — see doc 01 §IV. Do not bolt a per-batch week selector onto any UI without the schema change this actually needs.

**🚩 Never fetch grading counts per batch in a loop.** Followed correctly — one `get_grading_queue(null)` call, grouped client-side, used both for the batch cards on `/admin/summer` and would be the pattern for any future whole-cohort view.

**🚩 Verify RPC signatures against the migration files — this bit the build twice before it was taken seriously.** `return_homework` (2 args) and `get_my_submission` (2 args) were both, at different points, called with the wrong number of arguments by code that predated this session. Neither bug was in a file this session wrote from scratch — both were found in existing files during the fix-first step of the build order.

**🚩 New trap, not in the original spec: verify storage bucket names against the actual upload code, not a document.** The `submissions`-bucket assumption (see §V.a above) is the storage-layer equivalent of a wrong RPC signature, and it's just as easy to get from a stale document.

**🚩 Newest trap, found after the batch shell itself was finished, while fixing an unrelated page: a dynamic route folder does not serve its parent path.** `/smportal/homework/page.tsx` (the list) and `/smportal/homework/[id]/page.tsx` (one assignment's detail) are different files with different jobs. A file containing `{ id }`-shaped detail-page logic was found sitting at the parent, list-page path — meaning `params.id` was always `undefined`, nothing ever matched, and the page fell through to `notFound()` on every single visit, unconditionally. Not a subtle bug — a total, permanent 404 — but one that looked at first like a missing file rather than a misplaced one.

**🚩 All admin RPCs are `is_admin()` gated and throw rather than returning empty.** Confirmed still true. Catch and show the message; an auth failure should never look like "nobody submitted."

---

## IX. BUILD ORDER — AS ACTUALLY EXECUTED

All nine steps completed, in order, each confirmed working (via a real deploy) before the next began:

1. **Fixed the two broken call sites first.** One turned out to already be correct (the file pasted for verification matched the real signatures) — the other (`return_homework`'s arity, plus a deeper bug where the roster-fetch function was silently dropping `submission_id` by passing RPC rows through as untyped `any[]`) was real and was fixed.
2. **Confirmed 0025 and 0026 were run** — directly, via `information_schema.columns` and by reading the actual function, not by trusting a document that at the time still said they were pending.
3. **Batch shell + header + routing.** Tabs rendered empty; nav confirmed working before any tab got real content.
4. **Class tab.** Built as the enhanced version described in §IV above, not a literal unchanged move — and a real decision about whether to leave the old homework-grading UI temporarily duplicated on `/admin/summer` was made explicitly (it was cut immediately, accepting a short window with no homework-grading UI until step 5 landed minutes later in the same session).
5. **Homework queue.** The core deliverable, including the storage-bucket bug fix from §V.a.
6. **By-assignment roster + filter chips**, including the confirmed `batch_id` column check before writing the ADR 005 predicate into the picker query.
7. **Batch cards on `/admin/summer`** with the live grading count.
8. **Resources tab**, including closing the `ResourceInput.batchId` gap described in §IV.
9. **Overview tab**, built last as instructed.

**Followed by, not originally numbered in the spec:** discovery and fix of the misplaced homework-list-page bug on `/smportal/homework` (§VIII, last trap), and the `/admin/summer` page reorganization (§VI).

---

## X. EXPLICITLY DEFERRED — STATUS UNCHANGED

Still not built, still deliberate, reasons unchanged from the original spec:

| Feature | Why deferred |
|---|---|
| **Progress matrix** (students × assignments grid) | Needs real data to be worth reading; there wasn't any until camp actually started. Reconsider once week 2 has real submissions. |
| **Nudge missing students** (email to parents) | Resend is already wired, so this is genuinely cheap — deferred only because launch week is the wrong time to test a new parent-facing email for the first time. Still flagged as the single most valuable deferred item. |
| **Keyboard nav in the queue** | Only matters past ~30 submissions in one sitting. Revisit if that becomes routine. |
| **Edit feedback after returning** | The database supports it trivially (`return_homework` just UPDATEs). Build it if someone actually asks, not before. |
| **Per-batch `current_week`** | Requires the schema change described throughout this document. Real work, not a UI tweak. |
| **Attendance view** | `summer_attendance` is populated by `check_in_attendance` and nothing reads it yet. A whole separate feature. |

---

**Written:** 29 July 2026 (original spec)
**Rewritten as as-built record:** 29 July 2026, same day (session 7)
**Confirmed working via real deploys throughout.**
