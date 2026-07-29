# KIT Admin Panel — Specification

**Purpose:** define what the admin panel contains before building it, so the build isn't led by a mockup showing data that doesn't exist.

---

## 1 · The mockup, honestly assessed

The reference design is a strong visual direction and the layout should be kept. But it was drawn before the database existed, and a large portion of it is not backed by anything.

### Real — backed by tables that exist

| Mockup element | Source |
|---|---|
| Total Applications | `admin_stats.applications_pending` etc. |
| Enrolled Students | `admin_stats.students_active` |
| Active Courses | `courses where status = 'live'` |
| Instructors | `admin_stats.teachers_active` |
| Recent Applications table | `admin_application_queue` |
| Upcoming Classes | `class_sessions` |
| Sidebar: Applications, Students, Courses, Summer, Instructors, Classes, Assignments | All have tables |

### Fiction — nothing behind it

| Mockup element | Reality |
|---|---|
| **"↑18% vs last 7 days"** trend arrows | No trend computation exists anywhere. Would need period-over-period queries. |
| **"Applications Over Time"** line chart | No time-series aggregation. Needs a date-bucketed query + a charting library (none installed). |
| **Status donut: New / Under Review / Shortlisted / Interview Scheduled** | **These statuses were explicitly rejected.** Only `pending`, `approved`, `rejected`, `withdrawn` exist. The donut as drawn is unbuildable. |
| **Student avatars** | No avatar column, no upload path, no storage bucket for them. |
| **Global search bar (⌘K)** | Not implemented. |
| **Notification bell "7"** | No notifications table or concept. |
| **Messages "5"** | No messaging system. Not in any roadmap phase. |
| **Emails** | Resend isn't wired yet. |
| **Integrations** | Nothing to integrate. |
| **Users & Roles** | `profiles.role` exists; no management UI, and admin is currently a single person. |
| **Numbers 128 / 345 / 18 / 12** | Real values today are **0, 0, 0, 4**. |

### The number that matters most

`admin_stats` carries this comment in the migration:

> *On a fresh install every number here is legitimately zero. The dashboard must render that as "No applications yet", not as broken software.*

A dashboard designed around 128 applications and 345 students will look broken on day one, when the real answer is zero across the board. **Empty states are the primary design case here, not an edge case.**

### Recommendation

Keep: the sidebar layout, card style, colour language, table treatment, section rhythm.
Drop from v1: trend percentages, the time chart, the status donut, search, notifications, messages, emails, integrations, avatars.
Add instead: honest empty states, and the screens that actually unblock operations.

---

## 2 · What admin needs to do

Derived from what the database supports, ordered by what unblocks KIT today.

### 🔴 Urgent — blocking right now
1. **Set summer camp dates.** Cohort start/end, registration window. The homepage countdown is dark until this exists.
2. **Publish weekly summer content.** Three weeks, each with title, note, Meet link, next class time.
3. **Enrol summer students.** From a paid application, or a manual roster add. Generates the Summer ID that *is* their credential.

### 🟠 Needed before the first 12-week cohort
4. **Create batches.** Zero exist. No 12-week application can be approved without one.
5. **Add teachers** and assign them to batches.
6. **Review applications** — approve (with batch assignment) or reject (with reason).
7. **Manage courses** — flip live/coming_soon, edit prices, set age bands.

### 🟡 Ongoing operations
8. **Students** — list, detail, points, status, certificates.
9. **Payments** — who owes what; record a bank transfer.
10. **Classes** — schedule sessions, mark attendance.
11. **Points** — manual adjustment, reconciliation.
12. **Audit log** — read-only history of every approval, rejection, payment.

---

## 3 · Navigation

```
KIT Admin
│
├── Dashboard              /admin
│
├── ADMISSIONS
│   ├── Applications       /admin/applications
│   └── Students           /admin/students
│
├── PROGRAMMES
│   ├── Summer             /admin/summer          ← build first
│   ├── Courses            /admin/courses
│   ├── Batches            /admin/batches
│   └── Teachers           /admin/teachers
│
├── OPERATIONS
│   ├── Payments           /admin/payments
│   └── Classes            /admin/classes
│
└── SYSTEM
    └── Audit log          /admin/audit
```

Ten items, not fifteen. Every one maps to a real table.

---

## 4 · Screen specifications

### 4.1 Dashboard — `/admin`

**Reads:** `admin_stats` (one query, nine values), plus 5 most recent from `admin_application_queue`.

**Stat cards (5):**
| Card | Field | Empty state |
|---|---|---|
| Pending applications | `applications_pending` | "No applications yet" |
| Ready to approve | `applications_approvable` | "None awaiting approval" |
| Active students | `students_active` | "No students enrolled yet" |
| Summer students | `summer_students` | "Roster is empty" |
| Revenue received | `revenue_naira` | "₦0" |

Plus a secondary row: outstanding payments, active batches, active teachers, current summer week.

**No trend arrows.** There is no comparison period to compute against, and inventing one is worse than omitting it.

**Panels:** recent applications (5 rows, link to full queue) · a "needs attention" list computed from real conditions:
- Summer cohort missing dates
- Applications paid but unapproved
- Students with `login_email_sent_at` null
- Payments overdue (`due_on < today`)
- Courses live with no batch

That last panel is more useful than any chart, because it tells the operator what to do next.

---

### 4.2 Summer — `/admin/summer` ⭐ BUILD FIRST

Three tabs or sections.

**Cohort settings** — `summer_cohorts`
- Label, current week (1–3), camp start/end dates, registration open/close, prize amount
- Active toggle (unique index enforces one active cohort)
- Warning banner while dates are incomplete: countdown is hidden

**Weekly content** — `summer_content`
- One editor per week: title, note, Meet link, next class time, publish toggle
- Cannot publish without a title (students see it)
- Unpublished → portal shows "coming soon", not empty sections

**Roster** — `summer_students`
- List: Summer ID, name, age, parent contact, last seen
- Add student manually → calls `enrol_summer_student()`
- Enrol from a paid summer application
- **Summer ID space warning at >40% of 1,000** — `generate_summer_id()` refuses past 50%, so warn before it starts failing

---

### 4.3 Applications — `/admin/applications`

**Reads:** `admin_application_queue` (already returns `approvable` and `needs_payment_check` computed in SQL — don't re-derive them).

Filter tabs: Pending · Approved · Rejected · All

Each row: student name + age, course, plan, parent contact, amount (naira, pre-converted), payment status, source, submitted date.

**Actions:**
- **Approve** — requires batch selection, filtered to matching course with seats free. Calls `approve_application()`. Blocked unless `payment_status = 'paid'`.
- **Reject** — requires a reason (mandatory in DB). Returns refund exposure, which must be shown prominently since refunds are manual in Paystack.
- **Enrol to summer** — for summer applications, calls `enrol_summer_student()` instead; no batch needed.

**Empty state:** "No applications yet. The apply form is live at /apply."

---

### 4.4 Students — `/admin/students`

List: KIT ID, name, batch, points, status, enrolled date.
Warning badge where `login_email_sent_at` is null — student exists but has never been told.

**Detail view:** profile, parent contact, batch, points ledger (every award with its reason — this is what makes "why does my child have 120 points" answerable), attendance, submissions, payments, certificates.

**Actions:** adjust points (writes to ledger with a note, never a direct counter edit) · resend login email · change status · issue certificate.

---

### 4.5 Courses — `/admin/courses`

Table of all 8 courses: code, title, type, track, status, prices, age band, sort order.

**Actions:** toggle live/coming_soon (single UPDATE, marketing site follows with no redeploy) · edit price, monthly price, instalments, age band, description.

**Guard:** a course cannot go live without a price — `courses_live_needs_price` will reject it. Catch that in the UI with a clear message rather than surfacing a constraint violation.

---

### 4.6 Batches — `/admin/batches`

Zero exist. This screen unblocks all 12-week approvals.

Create form: course, cohort label, year, cohort number, capacity (default 15), teacher, start/end dates, status.

**The KIT ID is derived from course code + year + cohort number**, so those three fields determine every student ID in that batch for life. Worth stating on the form.

List shows seats used vs capacity, teacher, status. `next_student_no` is an ID counter, not a headcount — count `students` for the real occupancy.

---

### 4.7 Teachers — `/admin/teachers`

List, add, deactivate. Link a teacher to an auth user so they can log in.
A teacher may hold multiple batches — the schema was explicitly fixed to allow this.

---

### 4.8 Payments — `/admin/payments`

**Reads:** `admin_outstanding_payments` — the view that replaces the spreadsheet.

Shows: student, parent contact, instalment n of m, amount, due date, days overdue.

**Action:** record a payment → `record_payment(payment_id, method, ref, note)`. Method defaults to `bank_transfer`, which is the common real-world case for months 2 and 3.

---

### 4.9 Classes — `/admin/classes`

Schedule sessions per batch: title, week, Meet link, scheduled time, punctuality window (default 5 min).
Mark a session live → students can self-mark attendance, which awards punctuality points automatically.
Attendance view per session.

---

### 4.10 Audit log — `/admin/audit`

Read-only, even for admin. Every approval, rejection, payment, points adjustment, summer enrolment.
Filter by entity and action. This is the answer to any dispute.

---

## 5 · Design system mapping

Everything below already exists in `globals.css`. The admin panel should reuse it rather than introduce a parallel system.

| Element | Existing token / pattern |
|---|---|
| Sidebar background | `--navy` #1F2C4F — matches the mockup's dark rail exactly |
| Page background | `--paper` #fcfdff |
| Card | `#fff`, `1px solid var(--line)`, radius 20px — same as `.prog-card` |
| Card hover | `translateY(-6px)` + soft shadow, per `.prog-card:hover` |
| Primary text / headings | `--ink`, weight 800, `letter-spacing:-.028em` |
| Secondary text | `--muted` #5d6781 |
| Tertiary / labels | `--faint` #97a0b5 |
| Accent — info | `--blue` #1999E4 |
| Accent — success | `--green` #25B290 |
| Accent — warning | #d98a00 (from `.acc-amber`) |
| Accent — purple | #7c5cff (from `.acc-purple`) |
| Error | #b3261e on #fdeceb (from `.af-submit-error`) |
| All form controls | `.af-field`, `.af-row`, `.af-phone`, `.af-plan` — reuse directly |
| Primary button | `.af-submit` (navy, radius 12px) |
| Pills | `.prog-soon-pill` pattern, radius 40px |
| Section panel | `#f5f6fb` (from `.why-panel`, `.sidebar-questions`) |
| Font | Plus Jakarta Sans, already loaded |

New classes needed, all prefixed `admin-`, following the existing flat BEM-ish naming: `admin-shell`, `admin-rail`, `admin-rail-group`, `admin-rail-link`, `admin-main`, `admin-head`, `admin-stat-grid`, `admin-stat`, `admin-card`, `admin-table`, `admin-pill`, `admin-empty`, `admin-warn`, `admin-drawer`.

---

## 6 · Build order

| # | Screen | Why this position |
|---|---|---|
| 1 | **Shell + sidebar + dashboard** | Everything else hangs off it; dashboard proves `admin_stats` reads correctly |
| 2 | **Summer** | The actual blocker — camp dates, content, roster |
| 3 | **Courses** | Small, high value, no dependencies |
| 4 | **Batches + Teachers** | Prerequisite for any 12-week approval |
| 5 | **Applications** | Needs batches to exist first to be testable |
| 6 | **Students** | Only meaningful once approvals have run |
| 7 | **Payments** | Only meaningful once instalments are scheduled |
| 8 | **Classes** | Needed when a cohort actually starts |
| 9 | **Audit** | Trivial read-only list, do last |

---

## 7 · Principles

- **Zero is the default state.** Every screen must look intentional with no data.
- **Never re-derive what SQL already computed.** `approvable`, `needs_payment_check`, `amount_due_naira` come pre-computed. Use them.
- **Naira for display, kobo for storage.** Views hand back naira. Never do `/100` in a component.
- **Destructive and irreversible actions confirm.** Approval creates a permanent KIT ID. Rejection may owe a refund.
- **Surface database constraints as human messages.** "That batch is full" beats a raw check violation.
- **Admin is one person on a laptop.** Density over dashboards. No feature exists to impress anyone.
