# KIT Admin Operations Manual

**For:** Alfred (founder/admin) and future admins
**What:** Day-to-day workflows at `/admin` and how the system works
**Live at:** https://kitacademy.net/admin
**Last updated:** 29 July 2026 (session 7 — reflects the batch shell, Phase 3.6)

> **What changed since the last revision:** almost everything to do with a single batch — its class schedule, its live toggle, its homework grading, its own resources — moved off the main `/admin/summer` page and into a dedicated space per batch: `/admin/summer/batch/[batchId]`. The old single-page workflow this manual used to describe no longer exists. Read this version, not an older printout.

---

## I. THE TWO SCREENS YOU WORK IN NOW

**`/admin/summer`** — the hub. Shows, in order: your batches (as cards, click through to any of them), cohort-wide settings (dates, prize, active cohort, per-week titles), and a collapsed shared-curriculum editor.

**`/admin/summer/batch/[batchId]`** — one specific batch's home, opened by clicking "Open batch" on its card. Has four tabs:

```
[ Overview ] [ Class ] [ Resources ] [ Homework 7 ]
```

The number on Homework is how many submissions are waiting to be graded for that batch, right now — that's the number you should learn to glance at every morning.

---

## II. `/admin/summer` — THE HUB

### A. Batch Cards

Each batch shows a seat-fill bar, current week, a live indicator if that batch is in class right now, and a grading count if anything's waiting. Click **"Open batch →"** to go to its shell.

**Creating a batch:** "+ Add batch" at the bottom of the Batches section. You set a label (e.g. "Morning cohort") and a capacity. The system auto-numbers the cohort.

**Editing:** click Edit on any card — you can change the label and capacity.

**Deleting:** blocked entirely if the batch has any students enrolled. Reassign or remove them first.

### B. Cohort Settings

Below the batches. What you control:
- **Label:** display name (e.g., "Summer 2026")
- **Current week:** 1–3. **This is cohort-wide, not per-batch** — see the warning below.
- **Camp start/end dates**, **registration open/close** (drives the homepage countdown)
- **Prize amount**
- **Active toggle:** only one cohort is active at a time; the ID gate at `/summer` checks this

**⚠️ `current_week` is cohort-wide, not per-batch.** Bumping it unlocks that week's content for *every* batch simultaneously. If your batches run on genuinely different schedules (Batch 1 meets Monday, Batch 2 meets Thursday), bumping the week after Batch 1's Monday class unlocks Week 2 material for Batch 2 three days before their class actually happens. This is a known, deliberately-deferred limitation — fixing it properly means adding a `current_week` column to `summer_batch_sessions`, not just moving the existing dropdown onto a batch page. If your batches share a schedule, this doesn't matter. If they don't, flag it — it's real scoped work, not a quick fix.

### C. Weekly Content

Still cohort-wide — title and a short note per week, plus the publish toggle (unpublished = "coming soon" in the portal). Meet link, instructor, and the live toggle are **not** here anymore; they live inside each batch's own Class tab.

### D. Shared Resources (Collapsed by Default)

Click to expand. This is where you create curriculum every batch should see — slides, videos, homework assignments, code snippets. Anything created here is visible to every batch automatically (it has no `batch_id`, meaning "shared" in the database).

**This is the only place shared curriculum can be created or deleted.** If you want a resource visible to only one batch, do that from inside that batch's own Resources tab instead — see §IV below. The reverse isn't true: you cannot delete a shared resource from inside a batch page; the system will point you back here.

---

## III. THE CLASS TAB — LIVE TOGGLE & SCHEDULE

**Where:** open a batch → Class tab.

**What you set, per week:**
- Instructor name
- Meet link
- Next class time
- The **Go Live / End Class** toggle

**The live toggle is deliberately the biggest, most decisive thing on the page.** This is not automatic and never has been — you are the clock. Click **Go Live** when you are actually in the meeting and class is starting; click **End Class** when it ends. If a student clicks "Join" into an empty room, that's a worse experience than seeing "not live yet" a few minutes early.

**If you leave a batch live for a long time**, the page will warn you — something has probably just been forgotten, not intentionally left running for hours. Check and end it.

**Each batch's live status is completely independent.** Batch 1 being live has no effect on Batch 2 — this used to be a single cohort-wide toggle; it isn't anymore.

---

## IV. THE RESOURCES TAB — SHARED VS. BATCH-ONLY

**Where:** open a batch → Resources tab.

You'll see everything visible to this batch — shared curriculum from the cohort-level screen, plus anything created specifically for this batch — each tagged clearly:

```
Week 2 · Day 3   Intro to Flexbox          Shared
Week 2 · Day 3   Extra grid worksheet      [Batch label] only
```

**Editing a shared row from here works**, but you'll be asked to confirm — the change applies to every batch, not just this one.

**Deleting a shared row from here is blocked.** The system tells you to go to the cohort-level Resources section (§II.D) instead. This is deliberate: it keeps exactly one place where "delete this for everyone" gets decided.

**Adding a new resource from here** defaults to "this batch only" — the assumption is that if you're inside a specific batch's page adding something, you're adding a supplement for that batch, not core curriculum for everyone. If you want to add something shared, do it from the cohort-level screen instead.

---

## V. THE HOMEWORK TAB — GRADING

**Where:** open a batch → Homework tab. Two views, switched with a toggle at the top.

### A. Needs Grading (the default view)

Every submission waiting on you for this batch, oldest first — a queue to work through, not a list to browse. Each card shows the student, the assignment, when it was turned in, the submission itself (a link to open, or an inline image preview / file link), and a feedback box.

**Workflow:**
1. Open the file or link, read it.
2. Type feedback (optional — you don't have to write something for every piece of good work).
3. Click **Return**. The card disappears from the queue immediately.
4. If you're not ready to grade one yet, click **Skip** — it moves to the bottom of your current list without saving anything. It comes back if you reload the page.

**When the queue is empty:** "Nothing waiting" — everyone's graded work is caught up. This does **not** mean everyone has submitted; it means nothing turned-in is left ungraded. To see who hasn't submitted at all, switch to By Assignment.

### B. By Assignment

Pick an assignment (grouped by week) to see the full roster for it — every student, whatever their status. Filter chips at the top let you narrow to **All / Turned in / Returned / Missing**. "Missing" is students who haven't submitted at all — this list costs nothing extra to produce; it's the same data, just filtered.

Click a student's row to expand it, see their submission, type feedback, and Return — same inline behavior as the queue, never a separate page.

### C. What You Cannot Do (Yet)

- **Edit feedback after returning.** If you need to change what you told a student, ask them to resubmit — note that this **wipes** your previous feedback deliberately, since it's new work and the old review no longer applies.
- **Nudge a missing student's parent** with one click. Not built yet — flagged as genuinely valuable, deliberately not built for launch week.
- **See a progress matrix** (everyone × every assignment, at a glance). Also not built yet, deliberately — there's no data worth looking at until week 2 anyway.

---

## VI. STUDENT ENROLMENT & KIT IDs

### A. How Students Get KIT IDs

**Summer students:** ID generated on enrolment (e.g., `SM26734`). No batch tied to the ID format itself, but every summer student does belong to a batch (`summer_students.batch_id`), which is what scopes their class schedule, live status, and batch-specific resources.

**12-week students:** `WD2601-0042` = course code + year + cohort number + sequence. Not built yet — see doc 01.

### B. Enroling a Summer Student

**Via paid application:** apply → pay → you approve at `/admin/applications` → click "Enrol to summer" → Summer ID generated, assigned to a batch, email sent automatically to the parent address on file.

**Via roster import:** `/admin/summer` → pick a batch → add a student manually (name, age, parent contact). No application row exists for this path, so there's no parent email to send to automatically — copy the ID and pass it on by hand.

**If the enrol result says the email failed to send:** the ID was still generated; you need to pass it along manually. Check the Resend dashboard for why it failed.

---

## VII. APPLICATIONS & APPROVALS

Unchanged from before Phase 3.6. `/admin/applications` — filter by pending/approved/rejected, click a row, approve (requires `payment_status = 'paid'`, select a batch) or reject (reason required, surfaces refund exposure). Refunds themselves are manual via the Paystack dashboard — there's no auto-refund.

---

## VIII. COMMON OPERATIONS CHECKLIST

### Pre-Launch (Before 10 Aug)

- [ ] Cohort settings complete (dates, prize, active = true)
- [ ] All 3 weeks have titles + descriptions
- [ ] Each batch's Class tab has an instructor, meet link, and next-class time set
- [ ] Week 1 shared resources uploaded and published
- [ ] Test the ID gate at `/summer` and the portal at `/smportal`
- [ ] Open each batch's shell once and confirm all four tabs load

### Weekly

- [ ] Work through each batch's grading queue (Homework tab → Needs Grading)
- [ ] Check the By Assignment → Missing filter for anyone falling behind
- [ ] Upload next week's shared resources from the cohort-level screen
- [ ] Confirm `current_week` is correct before students need the new content

### Each Class Day, Per Batch

- [ ] A few minutes before: open that batch's Class tab, click **Go Live**
- [ ] After class: click **End Class**
- [ ] Don't forget — if you leave one live for hours, the page will start warning you, but check anyway

### Each Month

- [ ] Check payments received (Paystack dashboard)
- [ ] Approve new applications
- [ ] Report: revenue, enrolled students, completion rate

---

## IX. TROUBLESHOOTING

### "Students see 'coming soon' for the current week"

**Cause:** `current_week` on the cohort is behind, or the week isn't published.
**Fix:** Cohort settings → bump `current_week` and/or publish that week.

### "The live indicator on a batch card doesn't match what I clicked"

**Cause:** you may be looking at a different batch than you think — each batch's live status is fully independent now.
**Fix:** open the specific batch's Class tab and check/toggle it there directly.

### "A student's homework file won't open when I click it"

**Cause:** could be a genuine storage issue. If you see "Object not found," this can mean either a wrong file path **or** a permissions problem — they look identical from the error alone.
**Fix:** if this happens broadly (not just one student), it's likely a code-level bug, not a one-off — flag it rather than assuming the student uploaded something broken.

### "I can't delete a shared resource from inside a batch page"

**This is by design, not a bug.** Go to the cohort-level Resources section on `/admin/summer` (collapsed by default — click to expand) and delete it from there.

### "I approved an application but no KIT ID was generated"

**Cause:** payment status wasn't 'paid' yet.
**Fix:** check the Paystack dashboard; if the webhook didn't fire, escalate — see doc 01's open item on webhook verification.

---

## X. DATA YOU CANNOT CHANGE (And Why)

- **KIT IDs** — permanent once generated.
- **Payment history, application submissions** — immutable audit trail.
- **A returned homework submission's original feedback** — overwritten (not preserved) if the student resubmits and you return again. This is deliberate, not a data-loss bug.

---

## XI. OPERATIONAL PHILOSOPHY

**You are the single source of truth.** The system doesn't guess or auto-advance on your behalf:
- The live toggle is your decision, per batch, not time-based.
- `current_week` is your decision, cohort-wide, not auto-advancing.
- Approvals require payment confirmation, but the batch assignment is your call.
- Refund policy is your decision — the system surfaces exposure, never decides for you.

This means you have to actually be present, per batch, during the camp. If you forget to go live for a batch, that batch's students can't join. If you forget the grading queue, it just grows.

---

**Questions?** Email Alfred (alfredenyinna03@gmail.com), or check doc 02 for anything technical.

**Last verified:** 29 July 2026 (session 7, batch shell live)
