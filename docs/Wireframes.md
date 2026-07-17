# Wireframes

Low-fidelity, structure-only. Boxes and labels, no color/type/spacing — those are design decisions made later, in code. The purpose of this doc is to settle **what's on each screen, what it does, and every state it has to handle** before components get written.

Fidelity is deliberately rough. If a box moves 40px when you build it, that's fine — this doc is for layout and flow, not pixels.

Covered here: the two Phase 0 screens the roadmap calls for — **Summer** (login + portal) and **Admin** (all sub-screens). Student and Teacher dashboards are Phase 4 and intentionally not wireframed yet (see note at the end).

---

## A note on how to read the "States" sections

Every screen that touches the database has more than one state. The populated "happy path" is the one everyone sketches; the ones that actually cause bugs are the empty, loading, error, and not-yet-published states. Each screen below lists them so no component ships assuming data is always there.

---

# 1 · Summer Login

**Route:** `/summer`
**Who:** summer students (ages 10–15, parent may be beside them)
**Job:** prove the student belongs, with the least friction physically possible.

```
+------------------------------------------------+
|                                                |
|                     KIT                        |
|                Summer Portal                   |
|                                                |
|      Welcome to the 2026 Summer Tech Program   |
|                                                |
|            Enter your Summer ID                |
|                                                |
|      +----------------------------------+      |
|      |  SM26-___                        |      |
|      +----------------------------------+      |
|                                                |
|             [   Enter Portal   ]               |
|                                                |
|                 Need help?                     |
|                  Contact us                    |
|                                                |
+------------------------------------------------+
```

No navbar. No footer. No password. No "forgot ID." One input, one button.

**States:**
- **Default** — empty input, button enabled.
- **Submitting** — button shows a spinner / "Checking…", input disabled, so a nervous kid can't double-submit.
- **Invalid ID** — inline message under the input ("We couldn't find that ID. Check it and try again."). Do *not* say whether the prefix or number was wrong — no hints for guessing.
- **Rate-limited** — after N failed tries from one source, a "Too many attempts, wait a minute" message (this is the brute-force guard from ADR 002; the UI just has to show it gracefully).
- **Valid ID** — set the access cookie, redirect to `/summer/portal`.

**Notes:** The `SM26-` prefix can be pre-filled/greyed in the input so the kid only types the suffix. Autofocus the field on load.

---

# 2 · Summer Portal

**Route:** `/summer/portal` (behind the ID cookie)
**Who:** every summer student — **identical render for all of them**
**Job:** be the one page that answers "what am I doing today and where do I click."

```
+---------------------------------------------------------+
|  LOGO                                        Week 2      |
+---------------------------------------------------------+
|                                                         |
|   Welcome to KIT Summer Camp                            |
|   Today: Tuesday, 10:00 AM                              |
|                                                         |
|   +-------------------------------------------------+   |
|   |  TODAY'S CLASS                                  |   |
|   |  Introduction to JavaScript Functions           |   |
|   |                                                 |   |
|   |            [  Join Google Meet  ]               |   |
|   +-------------------------------------------------+   |
|                                                         |
|   ANNOUNCEMENTS                                         |
|   • Homework deadline moved to Friday                   |
|   • Competition starts next week                        |
|   • Bring your sketchbook tomorrow                      |
|                                                         |
|   HOMEWORK                                              |
|   Design your first webpage                             |
|   [ Download Instructions ]                             |
|                                                         |
|   RESOURCES                                             |
|   [Slides]  [Recording]  [Starter Files]  [Canva]      |
|                                                         |
|   SCHEDULE                                              |
|   Week 1   |   Week 2   |   Week 3                      |
|                                                         |
|   NEED HELP?                                            |
|   WhatsApp   •   Email                                  |
|                                                         |
+---------------------------------------------------------+
```

No sidebar, no profile, no settings, no notifications, no personalization. It reads one `summer_content` row and renders it.

**States:**
- **Loading** — skeleton cards while the single content row fetches.
- **Loaded, class live now** — "Today's Class" card is prominent, Join button active.
- **Loaded, no class today** — the Join card collapses to "No class today — see you [next class day]." The Meet button should not sit there live and clickable when there's nothing to join.
- **Loaded, content not published yet** — before admin fills in a week, show a friendly holding state ("This week's materials are coming soon") rather than empty sections. This is the one people forget: the portal exists before admin has typed anything into it.
- **Homework not yet posted** — hide the homework block entirely rather than showing an empty "Homework" header.
- **Expired/invalid cookie** — bounce back to `/summer` login.

**Notes:** The `Join Google Meet` link is the single most important element on the page — it should be the first thing the eye lands on when a class is live. Everything else is reference material.

---

# 3 · Summer Portal — Mobile

Same content, single column, ordered by urgency. Nothing removed.

```
Week 2
─────────────
Welcome / Today
─────────────
[ Join Google Meet ]   ← stays near top; it's the point
─────────────
Announcements
─────────────
Homework
─────────────
Resources
─────────────
Schedule
─────────────
Need Help?
```

**Note:** Order matters more on mobile than desktop — "Join Meet" must be reachable without scrolling during class time. Consider pinning it when a class is live.

---

# 4 · Admin — Dashboard Home

**Route:** `/admin`
**Who:** admin (you)
**Job:** at-a-glance status + jump-off to the things that need action.

```
+------------+------------------------------------------------+
| LOGO       |  [ Search ]              🔔    Admin ▾          |
|            +------------------------------------------------+
| Dashboard  |                                                |
| Applications|  Welcome, Alfred                              |
| Students   |                                                |
| Teachers   |  +-------------+  +-------------+  +---------+  |
| Summer     |  | APPLICATIONS|  | STUDENTS    |  |TEACHERS |  |
| Courses    |  | 17 pending  |  | 126 active  |  |   8     |  |
| Payments   |  | [ Review ]  |  |             |  |         |  |
| Analytics  |  +-------------+  +-------------+  +---------+  |
| Settings   |                                                |
|            |  +-------------+  +----------------------------+|
|            |  | SUMMER CAMP |  | PAYMENTS                   ||
|            |  | 48 students |  | ₦1,240,000                 ||
|            |  | Week 2      |  |                            ||
|            |  | [ Manage ]  |  |                            ||
|            |  +-------------+  +----------------------------+|
|            |                                                |
|            |  RECENT ACTIVITY                               |
|            |  • Parent registered David                     |
|            |  • Teacher uploaded homework                   |
|            |  • Summer announcement posted                  |
|            |                                                |
+------------+------------------------------------------------+
```

**States:**
- **Loading** — stat cards show skeletons; don't render "0" then flash to real numbers.
- **Fresh install / empty** — every counter legitimately 0. Cards should read "No applications yet" etc., not look broken. This is day one of KIT — design for it.
- **Populated** — as drawn.
- **Stat card as action** — the "17 pending" card links straight to Applications filtered to pending; cards are shortcuts, not just numbers.

**Quick Actions (deferred):** the "+ Add Student / + Upload Homework / + New Announcement…" panel is a nice-to-have. Every button in it just links to a page you're already building — so build it **last**, as links, once those pages exist. Not a v1 blocker.

---

# 5 · Admin — Summer Management

**Route:** `/admin/summer`
**Who:** admin
**Job:** the single control surface behind the Summer Portal. Everything students see comes from here. This is the page you'll touch most during summer.

```
+------------------------------------------------------------+
|  SUMMER MANAGEMENT                                         |
+------------------------------------------------------------+
|                                                            |
|  Current Week:   [ Week 2  ▾ ]                             |
|                                                            |
|  Google Meet Link                                          |
|  +------------------------------------------+  [ Save ]    |
|  | https://meet.google.com/...              |              |
|  +------------------------------------------+              |
|                                                            |
|  ANNOUNCEMENTS                          [ + New ]          |
|  • Homework deadline moved to Friday          [edit][x]    |
|  • Competition starts next week               [edit][x]    |
|                                                            |
|  HOMEWORK                                                  |
|  Title: [ Design your first webpage        ]              |
|  [ Upload PDF ]                              [ Save ]      |
|                                                            |
|  RESOURCES                                                 |
|  [ + Upload File ] [ + Recording ] [ + Slides ]           |
|  • Slides.pdf                                  [x]         |
|  • week2-recording (link)                      [x]         |
|                                                            |
|  SCHEDULE                                                  |
|  Week 1 | Week 2 | Week 3     [ edit ]                     |
|                                                            |
|  ROSTER                                                    |
|  [ Import CSV ]   [ Download CSV ]                         |
|  48 students in 2026 cohort                                |
|                                                            |
+------------------------------------------------------------+
```

**States:**
- **View** — current values shown.
- **Editing a field** — field becomes editable; unsaved changes flagged.
- **Saving** — per-section save shows "Saving…"; button disabled.
- **Save success** — brief confirmation ("Saved ✓"); the change is now live to all students immediately.
- **Save error** — the edit is preserved (never silently discard what admin typed) with a "Couldn't save, retry" message.
- **CSV import — validating** — after upload, show a preview of parsed rows + how many are new / duplicate / malformed *before* committing.
- **CSV import — error** — bad file / wrong columns → clear message naming the problem row, don't half-import.

**Notes:** Because one save here changes what 48 kids see instantly, a tiny "this is live" cue near save buttons is worth it — prevents "did that go out already?" doubt.

---

# 6 · Admin — Applications

**Route:** `/admin/applications`
**Who:** admin
**Job:** review paid applications, approve → auto-create student.

```
+------------------------------------------------------------+
|  APPLICATIONS            [ All | Pending | Approved | Rej ] |
+------------------------------------------------------------+
|  Student   | Parent    | Course | Paid | Status  | Action  |
|------------|-----------|--------|------|---------|---------|
|  Joshua    | Mrs Okafor| WebDev | ✓    | Pending | [Review]|
|  Amara     | Mr Bello  | AI     | ✓    | Pending | [Review]|
+------------------------------------------------------------+

  Review drawer (opens on click):
  +--------------------------------------------------+
  |  Joshua Okafor                                   |
  |  Parent: Mrs Okafor · okafor@email · 080...      |
  |  Course: Web Design   Age: 13                    |
  |  Payment: ₦xx,xxx · ref PSK_...  ✓ verified      |
  |                                                  |
  |     [ Approve ]            [ Reject ]            |
  +--------------------------------------------------+
```

**Approve flow:** `Approve → create student → assign batch → generate KIT ID → send login email → mark approved`. This is one action to the admin but a chain behind the scenes.

**States:**
- **Empty** — "No applications yet."
- **List** — filterable by status; default to Pending (the actionable set).
- **Payment unverified** — flag applications where Paystack didn't confirm; don't let one be approved until payment is verified.
- **Approving (async)** — the chain above takes a moment; show progress, disable the button so it can't fire twice and create two students.
- **Approve success** — row moves to Approved; show the generated KIT ID.
- **Approve error** — if any step fails (e.g. email didn't send), say which, and don't leave a half-created student. Approval should be atomic or clearly recoverable.
- **Reject** — confirm before rejecting (it's a real family on the other end); optional reason.

---

# 7 · Admin — Students

**Route:** `/admin/students`
**Job:** find any student, see everything about them.

```
+------------------------------------------------------------+
|  STUDENTS                            [ Search name / ID ]   |
+------------------------------------------------------------+
|  Name     | KIT ID      | Course | Batch | Points | Enrolled|
|-----------|-------------|--------|-------|--------|---------|
|  David A. | WD2601-0042 | WebDev | B-01  |  120   | Jun 12  |
|  Sarah M. | AI2601-0007 | AI     | B-02  |  95    | Jun 12  |
+------------------------------------------------------------+

  Student detail (on click):
  +--------------------------------------------------+
  |  David A. · WD2601-0042                          |
  |  [Profile] [Attendance] [Assignments] [Points]   |
  |            [Submissions] [Certificates]          |
  +--------------------------------------------------+
```

**States:**
- **Empty** — "No students yet" (true until the first approval).
- **List + search** — search matches name or KIT ID.
- **No search results** — "No student matches that."
- **Detail tabs** — each tab has its own empty state (e.g. "No submissions yet").

**Note:** Admin sees full detail here (name, phone, email, batch, points, enrollment, parent info) — this is the one role with unrestricted student visibility, per ADR 003.

---

# 8 · Admin — Teachers

**Route:** `/admin/teachers`
**Job:** manage teachers and what batch they run.

```
+------------------------------------------------------------+
|  TEACHERS                                   [ + Add ]      |
+------------------------------------------------------------+
|  Name        | Email        | Batch | Students | Resources |
|--------------|--------------|-------|----------|-----------|
|  Mr Chidi    | chidi@...    | B-01  |   15     |    6      |
|  Ms Ada      | ada@...      | B-02  |   14     |    4      |
+------------------------------------------------------------+
```

**States:** empty ("No teachers yet"), list, add-teacher form (name + email + assign batch), edit/reassign batch.

---

# 9 · Admin — Courses

**Route:** `/admin/courses`
**Job:** the source the marketing site's program cards render from. Toggling a course live/coming-soon here changes the public site.

```
+------------------------------------------------------------+
|  COURSES                                    [ + New ]      |
+------------------------------------------------------------+
|  Web Development     Live          [ Edit ]  [ ● Live ]    |
|  AI                  Live          [ Edit ]  [ ● Live ]    |
|  Python              Coming Soon   [ Edit ]  [ ○ Soon ]    |
|  Game Development    Coming Soon   [ Edit ]  [ ○ Soon ]    |
+------------------------------------------------------------+
```

**States:** list, edit course (title/description/track), toggle status (immediately reflected on public site), new course.

**Note:** This is why the marketing site can advertise courses before they exist — the "coming soon" pills are just rows here with a status flag.

---

# 10 · Admin — Analytics

**Route:** `/admin/analytics`
**Job:** the numbers, deliberately minimal for v1. Don't overbuild.

```
+------------------------------------------------------------+
|  ANALYTICS                                                |
+------------------------------------------------------------+
|   Students: 126    Teachers: 8    Applications: 17         |
|                                                            |
|   Revenue: ₦1,240,000                                      |
|   Completion Rate: 84%                                     |
+------------------------------------------------------------+
```

**States:** loading, populated, empty (all zero on a fresh install — must not look broken).

**Note:** Five numbers is enough for v1. Charts, cohort comparisons, and trends are a later phase — resist adding them now.

---

# Not yet wireframed (Phase 4)

**Student Dashboard** and **Teacher Dashboard** are the next two screens to design, but they belong to Phase 4 and depend on the accounts/batch system that Phases 2–3 build first. Deliberately not sketched here — they'll get wireframed when that phase starts, so the design reflects the data model as actually built rather than as guessed now.

At a glance, when the time comes:
- **Student:** their batch's resources, assignments (do/submit), their KIT points, batch top-5 leaderboard, class join.
- **Teacher:** their one batch — run class, grade submissions, unlock resources, post announcements, limited student info only (name, email, batch, points).

---

## Phase 0 status

With these, the roadmap's `Wireframes for /summer and /admin` item is complete. Summer login + portal are simple enough to build near-directly as low-fi React; the admin set is worth a quick grayscale pass (Excalidraw) to settle the sidebar + card-grid + table rhythm before committing component boundaries.
