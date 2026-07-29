# 06 — Batch Shell & Homework System: Build Spec

**Status:** Designed 29 July 2026. Not built.
**Depends on:** migrations 0025 + 0026 (run these first)
**For:** whoever builds Phase 3.6 — human or AI
**Companion docs:** 01 (roadmap, ADRs 005–006), 02 (RPC signatures)

This is the spec, not a summary. If something here contradicts doc 01, this file
is more specific and wins — except on RPC signatures, where the **migration files**
always win over any document.

---

## I. THE PROBLEM THIS SOLVES

Everything lives on one `/admin/summer` page: cohort settings, batch list, live
toggle, weekly resources, homework. It works, but it answers no question well.

The admin's real questions, in the order they get asked:

1. *"What's waiting on me right now?"* — asked every morning
2. *"Who hasn't done Week 2 Day 3?"* — asked before class
3. *"Is Batch 1 ready to go live?"* — asked 10 minutes before class
4. *"Is anyone falling behind?"* — asked in week 2, usually too late

Question 1 is the one the current UI answers worst. There's no "waiting on me"
anywhere — you have to remember which assignments exist, open each one, and scan.
That does not survive three batches.

**Design principle: the homework tab is a queue to drain, not a database to
browse.** Browsing is the fallback view, not the default.

---

## II. ROUTE STRUCTURE

```
/admin/summer                          cohort settings + batch cards
/admin/summer/batch/[batchId]          redirects → /overview
/admin/summer/batch/[batchId]/overview
/admin/summer/batch/[batchId]/class
/admin/summer/batch/[batchId]/resources
/admin/summer/batch/[batchId]/homework          ← queue (default landing for grading)
/admin/summer/batch/[batchId]/homework/[resourceId]   ← one assignment's roster
```

Tabs are real routes, not client state. Two reasons: the admin will want to
bookmark the grading queue, and a full page load per tab is fine at this scale
and keeps each tab's data fetch trivially simple.

`/admin/summer` keeps cohort settings and the batch list. It **loses** the
per-batch session controls and the homework section — those move into the batch
shell. Weekly curriculum upload stays at cohort level (see §VI).

---

## III. `/admin/summer` — THE BATCH CARDS

Replaces the current bare batch list. One card per batch:

```
┌────────────────────────────────────────────┐
│  Batch 1 · Morning                    ⋯     │
│  18 / 20 seats    ▓▓▓▓▓▓▓▓▓░                │
│                                             │
│  Week 2   ● Live now                        │
│  7 to grade · 3 missing                     │
│                                             │
│  [ Open batch → ]                           │
└────────────────────────────────────────────┘
```

**Data:**
- seats: existing `batchesWithSeats` computation, unchanged
- week: `summer_cohorts.current_week` (cohort-wide — see the warning in §VIII)
- live: `summer_batch_sessions.is_live` for `(batch, current_week)`
- **to grade:** call `get_grading_queue(null)` ONCE for the whole cohort, group
  by `batch_id` client-side. Not one call per batch, and not a second counts-only
  RPC that can drift out of sync with the queue itself.
- missing: leave it off v1. It's per-assignment, so a batch-level "missing" count
  needs a decision about which assignments are in scope. Don't invent one.

`● Live now` should be visually loud. It's the thing you need to notice you forgot
to turn off.

---

## IV. THE BATCH SHELL

### Header (persists across all tabs)

```
← All batches
Batch 1 · Morning                        18/20 seats · Week 2
[ Overview ] [ Class ] [ Resources ] [ Homework 7 ]
```

The `7` is the grading count as a badge on the tab. That badge is the whole point
of the shell — the admin should learn to glance at it.

### Tab: Overview

Read-only summary. Roster count, seats, current week, live status, next class
time, count of assignments published vs graded. A landing pad, not a workspace.
Build it last; it's the least important tab.

### Tab: Class

Everything currently in `BatchSessionManager`, scoped to this batch:

- instructor (text)
- meet link (url)
- next class at (datetime-local — remember `toLocalInput(x ?? null)`, see doc 05)
- **GO LIVE / END CLASS** toggle → `set_batch_live(p_batch_id, p_week, p_live)`

The live toggle should be the largest element on the page and change colour
decisively. Per ADR 003 this is a deliberate human action, never time-based —
the UI should feel like flipping a switch, not saving a form.

Show a warning if `is_live = true` and `live_started_at` is more than ~2 hours
ago: *"This batch has been live for 3 hours. Did class end?"*

### Tab: Resources

Lists resources visible to this batch — `batch_id IS NULL` (shared) plus
`batch_id = this batch`.

Each row carries a tag so scope is never ambiguous:

```
Week 2 · Day 3   Intro to Flexbox          [ Shared ]      ⋯
Week 2 · Day 3   Extra grid worksheet      [ Batch 1 only ] ⋯
```

- **Shared** rows: editable, but with a confirm on save — *"This is shared
  curriculum. Changes apply to all batches."* Deletion of a shared row from
  inside a batch page should be blocked entirely; send them to the cohort-level
  curriculum screen.
- **Batch-only** rows: freely editable and deletable here.
- Upload form has a scope selector defaulting to **Batch 1 only**. Rationale:
  someone uploading from inside a batch page is probably adding a supplement.
  Shared curriculum belongs at cohort level.

### Tab: Homework — see §V

---

## V. THE HOMEWORK TAB

Two views. A segmented control at the top switches them. Default is the queue.

```
[ Needs grading (7) ]  [ By assignment ]
```

### V.a — Needs grading (DEFAULT)

`get_grading_queue(p_batch_id)` → every submission with `status = 'turned_in'`,
oldest first. Nothing else. Returned work is done; `assigned` students have
nothing to grade and can't be returned to anyway (see §VII).

One card per submission, stacked, oldest at top:

```
┌──────────────────────────────────────────────────────┐
│ Amara Okeke · SM26734          Week 2 · Day 3        │
│ Intro to Flexbox                    turned in 2d ago │
│ ──────────────────────────────────────────────────── │
│  🔗 https://codepen.io/amara/pen/xyz        [ Open ] │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ Feedback…                                      │  │
│  └────────────────────────────────────────────────┘  │
│                              [ Skip ]  [ Return ▸ ]  │
└──────────────────────────────────────────────────────┘
```

**Interaction rules — these matter more than the visuals:**

- **Never navigate away to grade.** Feedback is typed inline. `Return` calls
  `return_homework(p_submission_id, p_feedback)` and the card **animates out of
  the list**. The queue visibly shortens. That feedback loop is what makes the
  thing pleasant to use.
- **`Skip`** moves the card to the bottom of the local list without touching the
  DB. For "I need to think about this one."
- **Optimistic removal.** Remove the card immediately, restore it with an error
  toast if the RPC fails. At 20 submissions a round-trip wait per card is the
  difference between five minutes and fifteen.
- **Empty feedback is allowed.** Sometimes the work is just fine. Don't force a
  textarea to be non-empty — that's how you train people to type "good".
- **Submission preview inline:**
  - `submission_type = 'link'` → show the URL, `Open` in a new tab.
  - `submission_type = 'file'` → generate a signed URL (existing
    `getSummerFileUrl` pattern) and preview images inline; everything else gets
    a download button.
- **Relative timestamps** (`2d ago`), because the useful signal is staleness,
  not the calendar date. Anything over 3 days old gets an amber tint.

**Empty state** — this is the reward, so make it feel like one:

> **Nothing waiting.** All 18 students are up to date on graded work.
> *[ Check who hasn't submitted → ]*

That link goes to the By-assignment view, because "queue empty" and "everyone has
submitted" are different facts and conflating them is the one way this design
misleads you.

### V.b — By assignment

Assignment picker (grouped by week) → roster via
`get_homework_roster(p_resource_id, p_batch_id)`.

Counts strip and filter chips are the same control:

```
Week 2 · Day 3 — Intro to Flexbox

[ All 18 ]  [ Turned in 7 ]  [ Returned 8 ]  [ Missing 3 ]
```

The RPC already LEFT JOINs and does `coalesce(sub.status, 'assigned')`, and sorts
non-submitters first. **So Missing costs one client-side filter on data you
already have.** No extra query, no extra migration.

Row states:

| Status | Row shows | Action |
|---|---|---|
| `assigned` | greyed name, "Not submitted" | *(none in v1 — Nudge later)* |
| `turned_in` | submission + feedback box | **Return** |
| `returned` | submission + existing feedback, timestamp | *(read-only, see §VII)* |

Rows expand in place. Same inline-grade behaviour as the queue — never a modal,
never a navigation.

---

## VI. WHAT DOES **NOT** MOVE INTO THE BATCH SHELL

Deliberate, so nobody "helpfully" moves them later:

- **Cohort settings** (dates, prize, active toggle, `current_week`) — cohort-wide
  by definition.
- **Creating shared curriculum** — stays at cohort level. If uploading Week 2's
  core lesson is possible from inside Batch 1, it will eventually be done three
  times. Per ADR 005 the whole point is that the core lesson lives in one row.
- **Batch CRUD** (create/delete/capacity) — stays on `/admin/summer`.
- **Applications & enrolment** — stays at `/admin/applications`.

---

## VII. STATE MODEL — READ THIS BEFORE WRITING ANY QUERY

Three states, **two rows**:

```
assigned    NO ROW in summer_submissions
turned_in   row exists, status = 'turned_in'
returned    row exists, status = 'returned', feedback + returned_at set
```

Consequences that trip people up:

1. **You cannot return work that was never submitted.** `return_homework` takes a
   `p_submission_id`. No submission, no id, no return. The Missing list's only
   possible action is a nudge.
2. **A student resubmitting after you returned wipes your feedback** — 0023 sets
   `feedback = NULL, returned_at = NULL` on re-turn-in, deliberately: it's new
   work, the old review no longer applies. The UI should warn on the student side,
   and the admin should understand why feedback vanished.
3. **`unsubmit_homework` is blocked once status is `returned`** — otherwise a
   student could silently delete your feedback.
4. **There is no edit-feedback path.** Returning again on the same submission
   would work at the DB level (`return_homework` just UPDATEs), so a v1.1 "edit
   feedback" is cheap if the admin asks for it. Don't build it unprompted.

---

## VIII. TRAPS

**🚩 `current_week` is cohort-wide.** `get_summer_resources` gates on
`summer_cohorts.current_week` for every batch at once. Batches on different days
will see content unlock early. The fix is a `current_week` column on
`summer_batch_sessions` — do NOT bolt a per-batch week onto the UI without that
column, or the display will lie about what students can actually see.

**🚩 Never fetch grading counts per batch in a loop.** One
`get_grading_queue(null)`, group client-side.

**🚩 Verify RPC signatures against the migration files.** Two were documented
wrong and shipped broken code. `return_homework` is **2 args**
(`p_submission_id`, `p_feedback`). `get_my_submission` is **2 args**
(`p_summer_student_id`, `p_resource_id`).

**🚩 `summer_resources` has no `file_url` column.** It's `url` and
`storage_path`. Files need a signed URL, they are not directly linkable.

**🚩 All admin RPCs here are `is_admin()` gated** and throw rather than returning
empty. Catch and show the message; don't render an empty roster on an auth error,
because "nobody submitted" and "you're not an admin" would look identical.

---

## IX. BUILD ORDER

Each step leaves the app working. Don't skip ahead.

1. **Fix the two broken call sites first** (doc 01 §IV). Fixing bugs before adding
   surface area.
2. **Run 0025 + 0026**, then the smoke test.
3. **Batch shell + header + routing.** Tabs render, all empty. Confirm nav works.
4. **Class tab** — move `BatchSessionManager` in, unchanged behaviour. This is the
   one that must work on 10 August.
5. **Homework queue.** The core deliverable.
6. **By-assignment roster + filter chips.**
7. **Batch cards** on `/admin/summer` with the grading count.
8. **Resources tab** with Shared / Batch-only tagging.
9. **Overview tab.**

Steps 1–5 are the launch-critical path. 6–9 can land during week 1.

---

## X. EXPLICITLY DEFERRED

Not forgotten — decided against for v1, with reasons:

| Feature | Why deferred |
|---|---|
| **Progress matrix** (students × assignments grid of dots) | High value, catches the student who quietly stopped submitting. But it needs real data to be worth reading, and there is none until week 2. Build it in week 1 when there are rows to look at. |
| **Nudge missing students** | Emails the parents of everyone in the Missing list. Resend is already wired so this is ~1 hour. Deferred only because it's the wrong thing to test for the first time on launch week. **Genuinely valuable — students are 10–15, the person who acts on a missing assignment is the parent.** |
| **Keyboard nav (j/k/Enter) in the queue** | Turns a five-minute job into a two-minute one, but only matters past ~30 submissions per sitting. Revisit if the queue regularly exceeds that. |
| **Edit feedback after returning** | DB supports it. Wait until someone actually asks. |
| **Per-batch `current_week`** | Only needed if batches stagger. Requires a schema change; don't pre-build. |
| **Attendance view** | `summer_attendance` is populated by `check_in_attendance` and nothing reads it yet. Whole feature, not part of this one. |

---

**Written:** 29 July 2026
**Build target:** steps 1–5 before 10 August
