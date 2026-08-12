# KIT Admin Operations Manual

**For:** Alfred (founder/admin) and future admins
**Live at:** https://kitacademy.net/admin
**Last updated:** 12 August 2026 (session 8)

---

## I. COHORT-WIDE SETTINGS — unchanged from prior revision

See prior revision for cohort settings, weekly content, and shared curriculum.

---

## II. THE BATCH SHELL — unchanged from prior revision

See prior revision for Overview/Class/Resources/Homework tabs. **One behavior change within the Homework tab, below.**

### Homework tab — the "Redo" option is gone, on purpose

Students used to be able to click "Redo this (removes feedback)" on a returned assignment. That button is now removed entirely. **The database still only allows a submission to be pulled back while it's `turned_in`, never after it's been `returned` and graded** — this was already true before, and remains true now. If a student needs to redo genuinely graded work, there's currently no self-service path; that has to happen manually (case by case) until/unless a real "redo after feedback" feature is deliberately built and given its own instructor-facing controls. See doc 07, Bug 1 for the full story of why this was removed rather than "fixed."

---

## III. BATCH MANAGEMENT — unchanged from prior revision

---

## IV. STUDENT ENROLMENT & KIT IDs

### The automatic welcome email — what it actually does now

When a summer application is approved, one email sends automatically: a "Welcome to KIT!" email, personalized as:

> Dear **Mr./Mrs./Mr.-or-Mrs. {parent name}**,

The title is derived from the application's `parent_relationship` field: Father → Mr., Mother → Mrs., Guardian or Other → Mr./Mrs. (since gender isn't knowable for those). If a parent's name is blank on the application for any reason, it falls back to a plain "Dear Parent," rather than a broken "Dear Mr./Mrs. ,".

**The Summer ID itself is no longer sent automatically.** That email was deliberately removed — **you now send the Summer ID to the parent manually**, however you choose (WhatsApp, a separate email, whatever's fastest). The welcome email tells the parent a second message with their child's ID is coming, so don't skip sending it.

**This only applies to the summer program.** The 12-week program's approval flow sends its own separate "your KIT account is ready" email, untouched by any of this.

### Everything else in this section — unchanged from prior revision.

---

## V. APPLICATIONS & APPROVALS — unchanged from prior revision

---

## VI. HOMEWORK GRADING — see §II above for the Redo removal; otherwise unchanged

---

## VII. COURSE MATERIALS

### KIT Assignment 1 — Day 2 homework

A genuinely fillable PDF worksheet exists for Day 2's homework — students can type directly into it (24 text fields, 12 YES/NO questions) in Adobe Reader, Preview, or most browsers, no printing required, though it also prints cleanly if that's how a family actually uses it. Distribute it the normal way: attach it to a **Homework**-kind resource on the relevant batch's Resources tab, submission type **File**.

**Known inconsistency, not yet reconciled:** the Day 2 lesson slide deck's own Wrap-Up slide previews a *different* homework format ("create one bad prompt and improve it, for 3 of the Day 1 problems") than what's actually in the PDF that went out. If a tutor or student notices the mismatch, that slide needs updating to match — it hasn't been done yet.

### KIT Day-1 lesson slide template

A reusable `.pptx` template exists for daily lessons — cover, agenda, driving question, concept slide, task-steps slide, example slot, wrap-up. Duplicate whichever layout fits the day's content rather than building slides from scratch. Uses the real KIT logo throughout (with a specific light variant for the dark-background slides, since the logo's navy element doesn't read against a navy background otherwise).

---

## VIII. ADMIN ACCOUNTS

### Adding a new admin

1. **Verify the user ID actually belongs to the intended email before granting anything:**
   ```sql
   select id, email from auth.users where id = '<user-id>';
   ```
2. **Grant admin, using an upsert so it works whether or not the person already has a profile row:**
   ```sql
   insert into profiles (user_id, role)
   values ('<user-id>', 'admin')
   on conflict (user_id) do update set role = 'admin';
   ```
3. Confirm the account can actually reach `/admin` before considering it done.

`kidsintechph@gmail.com` was added as an admin this session using exactly this process.

---

## IX. COMMON OPERATIONS CHECKLIST — unchanged, plus:

### If a student reports the portal won't load, or "keeps bouncing"
This exact symptom (URL flashing between `/summer` and `/smportal`, blank screen) was a real, total-outage bug on launch day — see doc 07, Bug 2. It's fixed. If it recurs, don't assume it's the same cause without checking; but do check the obvious things first: incognito test (rules out a stale browser cookie), and whether this is one student or several (one student points at their specific account/data; several points at something systemic again).

### If a student reports they can't open a slide or resource file
Also a real, total-outage bug on launch day (doc 07, Bug 3) — a missing storage read policy. The fix was written and handed off but **its deployment was never explicitly confirmed.** If this happens, check first whether migration 0029 was actually applied (`select policyname from pg_policies where tablename = 'objects' and qual::text like '%summer%';` should show two policies, not one) before assuming it's a new, different bug.

---

## X. TROUBLESHOOTING

### "Students can't reach the portal" / "Students can't open resource files"
See §IX above — both are documented, both have known root causes and fixes in doc 07.

### "I graded a submission but the tab badge count didn't change" — unchanged from prior revision

### "A student says Redo isn't there anymore"
Correct, expected — see §II. It was removed deliberately, not a bug.

### Everything else — unchanged from prior revision.

---

## XI. DATA YOU CANNOT CHANGE — unchanged

## XII. OPERATIONAL PHILOSOPHY — unchanged

---

**Questions?** Email Alfred or check the Technical Reference manual / doc 07 for anything that's already gone wrong once.

**Last verified:** 12 August 2026 (session 8)
