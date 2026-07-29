# KIT Admin Operations Manual

**For:** Alfred (founder/admin) and future admins  
**What:** Day-to-day workflows at `/admin` and how the system works  
**Last updated:** 29 July 2026

---

## I. SUMMER PROGRAM MANAGEMENT (`/admin/summer`)

### A. Cohort Settings

**Where:** `/admin/summer` → "Cohort Settings" card

**What you control:**
- **Label:** Display name (e.g., "Summer 2026")
- **Current week:** Which week are we in? (1–3 for summer)
- **Camp start/end dates:** When does the camp run? (Used for countdown timer)
- **Registration opens/closes:** When can parents apply? (Registration closes are enforced at the gate)
- **Prize amount:** How much is the prize pool? (₦30,000 default)
- **Active toggle:** Only ONE cohort can be active (you control which one)

**Important:**
- If dates are incomplete, the homepage countdown shows nothing (intentional — better than a broken timer)
- Changing dates retroactively doesn't affect students already enrolled
- Active toggle must be ON for ID gate to work (unset it, all ID checks fail with "invalid cohort")

### B. Weekly Content Publishing

**Where:** `/admin/summer` → "Weekly Content" tabs (Week 1, 2, 3)

**Per week, you set:**
- **Title:** Week name (e.g., "HTML & CSS Basics")
- **Note:** Short description (e.g., "Building your first website")
- **Meet link:** Zoom/Google Meet URL for live class
- **Next class time:** When is the next session? (Shows in portal countdown: "Next class in X hours")
- **Publish toggle:** OFF = students see "Coming soon"; ON = full content visible

**Workflow:**
1. Sunday (prep): Fill in all fields for the upcoming week
2. Monday (go-live): Click publish
3. Thursday (prep next): Set week 2 details
4. Next Monday: Publish week 2

**What students see:**
- If week is unpublished: "Next lesson coming 10 Aug — get ready!"
- If week is published but not live: "Class starts in X hours" (countdown)
- If week is published AND live: Green "Join" button + Meet link appears

### C. Current Week Management

**The single most important operational rule:** Bump `current_week` each Monday at 9 AM (or whenever first class starts).

**Why?** Summer resources are gated: `published_week >= current_week`. If you're in week 1 but `current_week = 1`, students see week 1 only. The moment you increment to week 2, students unlock week 1 archives + see week 2 content (if published).

**How:**
1. At the edit screen for weekly content, the current week is a dropdown
2. Change it to 2 (or 3)
3. Save
4. Watch portal refresh: previous week archives now visible, new week shows "coming soon" (if not published yet)

**Gotcha:** If you publish week 2 on Saturday but don't change `current_week` until Monday, students never see it (future weeks are hidden). Always:
1. Set `current_week` FIRST
2. Then publish the week

### D. Resource Management (Files, Homework, etc.)

**Where:** `/admin/summer` → "Resources" or inline in weekly content

**File upload limits:**
- Summer resources (slides, PDFs, videos): ≤25 MB
- Student submissions: ≤10 MB
- Certificate files: ≤5 MB

**Workflow:**
1. Click "Add resource" for a week
2. Upload file (auto-resizes if image, stores in `summer/2026/week1/filename`)
3. Set resource type (slide deck, homework, video, resource, etc.)
4. Resource is immediately visible (no separate publish toggle per file)

**Best practice:** Upload all week 1 resources on Sunday. Publish week 1 on Monday morning.

### E. The Live Toggle

**Where:** `/admin/summer` → "Go Live" / "End Class" button

**What it does:**
- ON = Students see green "Join" button + Meet link on `/smportal`
- OFF = Students see "Class starts in X hours" countdown

**Critical:** This is NOT time-based. You are the clock. If a student clicks Join into an empty Zoom room, that's a bad experience. So:
- Click "Go Live" when YOU are in the Zoom room and class is actually starting
- Click "End Class" when class ends (or don't click it; expires after 1 hour)

**Multi-batch note:** If you add more batches (later), each batch has its own live toggle. You control each one independently.

---

## II. BATCH MANAGEMENT

### A. What Is a Batch?

A batch is a cohort of students in a 12-week program. Each batch:
- Has a course (Web Dev, Game Dev, Python, etc.)
- Has a year (2026, 2027, etc.)
- Has a cohort number (01, 02, 03, etc. — auto-numbered)
- Has a label (e.g., "Web Dev Cohort 1, Aug 2026")
- Has a max capacity (usually 15 students)
- Generates KIT IDs for every student in it (WD2601-0001, WD2601-0002, etc.)

### B. Creating a Batch

**Where:** `/admin/summer` → "Batches" card → "+ Add Batch"

**Fill in:**
- **Course:** Dropdown (tied to `courses` table, must exist)
- **Year:** 2026, 2027, etc.
- **Cohort number:** Auto-fills as next number (if 0 batches exist, it's 01; if 1 exists, it's 02)
- **Label:** Human-readable name (e.g., "Web Dev Batch 1")
- **Capacity:** Max students (default 15)
- **Start date:** When does the batch begin?
- **End date:** When does it end?

**Result:** Batch created. Students can now be approved into it.

### C. Editing a Batch

**You can change:**
- Label
- Capacity (only if you have fewer students than the new capacity)
- Start/end dates
- Teacher assignment (later)

**You cannot change:**
- Course, year, or cohort number (these are locked; they determine KIT IDs)

### D. Deleting a Batch

**Rule:** You can only delete a batch if it has zero students enrolled.

**If it has students:** You must first unenrol them (rarely done; usually you just leave it as-is or change capacity to 0).

---

## III. STUDENT ENROLMENT & KIT IDs

### A. How Students Get KIT IDs

**Summer students:** ID generated on enrolment (e.g., `SM26734`). No batch assigned.

**12-week students:** ID generated when approved (e.g., `WD2601-0042`):
- `WD` = course code (Web Dev)
- `26` = year (2026)
- `01` = cohort number (batch's cohort number)
- `0042` = sequence (42nd student in that batch)

### B. Enroling a Student (Summer)

**Via paid application:**
1. Student applies + pays via Paystack
2. You approve at `/admin/applications`
3. Click "Enrol to summer" (summer applications)
4. Confirm → Summer ID generated + stored

**Via roster import (admin-only):**
1. At `/admin/summer` → "Roster" → "+ Add student manually"
2. Name, age, parent email, parent phone
3. Save → Summer ID generated

**What happens next:**
- Student gets a Summer ID (e.g., `SM26734`)
- You give them this ID to enter at `/summer`
- They use it to gate into `/smportal`
- No email is sent (Resend not yet wired — you copy the ID by hand)

### C. Enroling a Student (12-Week)

**Via paid application:**
1. Student applies + pays via Paystack
2. You approve at `/admin/applications`
3. Click "Approve" (term applications)
4. Batch picker appears → select a batch with available seats
5. Confirm → Student approved, KIT ID generated (based on course + year + cohort number)

**No other enrolment path for 12-week** (Summer has the manual roster; term doesn't).

---

## IV. APPLICATIONS & APPROVALS

### A. The Applications Screen (`/admin/applications`)

**Columns:**
- Student name + age
- Course choice
- Payment plan (upfront OR monthly × 3)
- Parent contact (email + phone)
- Amount (naira, converted from kobo)
- Payment status (pending_payment, paid, refunded)
- Submitted date

**Filters:**
- Pending (not approved, not rejected)
- Approved (approved and enroled)
- Rejected (rejected, reason stored)
- All

### B. Approving an Application

**Requirement:** `payment_status = 'paid'` (Paystack webhook must have fired)

**Steps:**
1. Click the application row
2. "Approve" button appears (if payment is confirmed)
3. Select a batch (shows only batches with available seats)
4. Confirm → KIT ID generated, student enroled

**What happens:**
- `applications.status` → 'approved'
- Student UUID created + linked to batch
- KIT ID generated (based on course + batch cohort number)
- (Future) Welcome email sent with KIT ID + login link (Resend not yet wired)

### C. Rejecting an Application

**Reason required** (stores in database for audit).

**Steps:**
1. Click the application row
2. "Reject" button
3. Type a reason (e.g., "Age below minimum"; "Course full")
4. Confirm

**What happens:**
- `applications.status` → 'rejected'
- Reason stored + visible in audit log
- App shows refund exposure (how much you might owe)
- **Note:** Refunds are manual in Paystack (no auto-refund). You must process them via Paystack dashboard.

### D. Manual Payment Recording

**When:** A parent pays via bank transfer (months 2–3 of a 3-month plan) or you want to mark a payment as received without Paystack.

**Where:** `/admin` → "Payments" (when that screen is built)

**For now (manual workaround):**
1. Go to Paystack dashboard → Transactions
2. Find the payment
3. Manually update the app status in Supabase (or ask founder)

**Future:** Admin screen will have a "Record payment" button.

---

## V. HOMEWORK GRADING (Google Classroom Style)

### A. Assigning Homework

**Where:** `/admin/summer` → pick batch + week → "Add homework"

**Fill in:**
- Title
- Description
- Due date
- Resource type (homework, challenge, project, etc.)

**Result:** Homework appears in portal → students see it for submission.

### B. Students Submit

**Student journey:**
1. In `/smportal`, clicks homework
2. Sees submission form
3. Uploads file OR types response
4. Clicks "Submit"
5. See "Submitted" status + timestamp

### C. You Grade It (Teacher Workflow)

**Where:** `/admin/summer` → pick batch + week → "Homework" section

**Steps:**
1. Click an assignment → roster modal opens
2. See all students + their status:
   - Not turned in (gray)
   - Turned in (blue pill)
   - Returned with feedback (green pill)
3. Click a student row → expand
4. See their submission (file link or text)
5. Type feedback in textarea
6. Click "Return assignment"

**What happens:**
- Feedback stored in database
- Status changes to "Returned"
- Student sees returned assignment + your feedback in portal
- (Future) Email sent to parent (Resend not yet wired)

### D. Editing Feedback

**Current limitation:** Once you return an assignment, you can't edit feedback from the modal.

**Workaround:** Contact founder to manually update via database, or ask student to resubmit + you return again.

---

## VI. COURSES & PRICING

### A. The Courses Table

**Current courses:**
- Web Dev (WD) — ₦75,000 or ₦27,000×3
- Game Dev (GD) — same price
- Python (PY) — same price
- AI for Kids (AI) — same price
- (More can be added without redeploy)

**Where to manage:** `/admin/courses` (when built)

**What you can edit:**
- Title
- Description
- Price (kobo)
- Monthly price (kobo)
- Age band (e.g., 10–12, 13–15)
- Status (live, coming_soon, archived)
- Sort order (display order on home)

### B. Adding a New Course

**Steps (manual for now):**
1. Contact founder
2. Provide: code (2–3 letters), title, price, age band, description
3. Founder inserts into `courses` table
4. Immediately live (no redeploy needed)

**Example:** Add "Robotics" → `ROBOTICS` code → ₦75,000 → ages 10–12 → appears on home.

---

## VII. COMMON OPERATIONS CHECKLIST

### Pre-Launch (Before 10 Aug)

- [ ] Cohort settings complete (dates, prize, active = true)
- [ ] All 3 weeks have titles + descriptions
- [ ] Meet links added for each week
- [ ] First week resources uploaded
- [ ] Week 1 published
- [ ] Test ID gate at `/summer` (manually verify it works)
- [ ] Test student portal at `/smportal` (manually verify it loads)

### Weekly (Saturdays)

- [ ] Review homework submissions for the week
- [ ] Return graded assignments with feedback
- [ ] Upload resources for next week
- [ ] Check "current week" is correct (bump to next week if starting new week Monday)

### Each Monday (Class Day)

- [ ] 9 AM: Bump `current_week` to unlock archived content
- [ ] 15 min before class: Click "Go Live" (if Meet link is set)
- [ ] After class: Click "End Class" (or leave it; expires after 1 hour)

### Monday Night (Admin Wrap)

- [ ] Update announcements for next week (if applicable)
- [ ] Check roster: any no-shows? (Record absence in audit log later)
- [ ] Prep resources for Thursday lesson
- [ ] Publish week 2 content (if we're in week 1)

### Each Month (Finance)

- [ ] Check payments received (Paystack dashboard)
- [ ] Approve new applications (if payment confirmed)
- [ ] Send refund rejections (if any)
- [ ] Report to founder: revenue, enrolled students, completion rate

---

## VIII. TROUBLESHOOTING

### "Students see 'Coming soon' for current week"

**Cause:** `current_week` is behind the actual week.

**Fix:** Go to weekly content editor, increment `current_week`.

### "Registration countdown isn't showing"

**Cause:** `registration_opens_at` or `registration_closes_at` is NULL.

**Fix:** Set them in Cohort Settings.

### "Meet button is gray (not green)"

**Cause:** `is_live = false` OR no Meet link set.

**Fix:** 
1. Add Meet link in weekly content editor
2. Click "Go Live" button

### "Student submitted homework but I don't see it in the roster"

**Cause:** You haven't bumped `current_week` yet (future weeks hidden).

**Fix:** Increment `current_week` to the week with homework.

### "I approved an application but no KIT ID was generated"

**Cause:** Payment status wasn't 'paid' yet.

**Fix:** Check Paystack dashboard. If webhook didn't fire, contact founder to manually mark paid.

### "'Refund due' shows but I don't want to refund"

**Interpretation:** The system is warning you about refund exposure, not forcing anything. You decide the policy. If you reject an application, the amount shown is what you owe IF your policy requires it.

---

## IX. DATA YOU CANNOT CHANGE (And Why)

- **KIT IDs:** Once generated, they're permanent (embedded in all of a student's records). Changing course/year/cohort numbers breaks the system.
- **Student enrolled date:** Audit trail; changing it hides when they actually joined.
- **Payment history:** Immutable ledger (audit log).
- **Application submissions:** Immutable (audit log).

**If a mistake happens:**
- Wrong batch selected on approval? Contact founder to unenrol + re-approve.
- Wrong payment amount? Contact founder to manually adjust (rare).
- Wrong application data? Reject + ask parent to reapply.

---

## X. OPERATIONAL PHILOSOPHY

**Core principle:** You are the single source of truth. The system doesn't enforce deadlines or make decisions for you.

- **Live toggle** is your decision, not time-based
- **Current week** is your decision, not auto-advancing
- **Go/No-Go** for approvals is your decision (though payment status must be paid)
- **Refund policy** is your decision (system surfaces exposure, doesn't decide)

This means **you must be present** during the camp. If you forget to bump `current_week`, students don't see new content. If you forget to go live, they can't join class.

**Workaround (future):** Automated reminders (Slack, email) 30 min before each class. Not yet built.

---

**Questions?** Email Alfred (alfredenyinna03@gmail.com) or check the Technical Reference manual.

**Last verified:** 29 July 2026 (day before launch)
