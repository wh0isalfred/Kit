# KIT — Product & Decisions

**Document 1 of 3** · Supersedes `KIT_Blueprint_Arnold.txt`, `KIT_Web_Alfred.txt`, `KIT-Architecture-Plan.md` (§1–2, §7–8), and the Project Overview sections of `KIT_PROJECT_COMPLETE_DOCUMENTATION.md`.

**Owner:** Ade (Ademola Emmanuel Adegbola) · Adegbola Industries
**Location:** Port Harcourt, Nigeria
**Status:** Phase 1 — marketing site, in progress
**Last revised:** July 2026

**Companion documents:**
- [Document 2 — Architecture & Data](KIT-02-Architecture-and-Data.md) — stack, ADRs, schema, security, scalability
- [Document 3 — Build Handbook](KIT-03-Build-Handbook.md) — code conventions, components, screens, roadmap, workflow

---

## Table of contents

1. [What KIT is](#1-what-kit-is)
2. [Positioning and brand](#2-positioning-and-brand)
3. [The two products](#3-the-two-products)
4. [Curriculum](#4-curriculum)
5. [Pricing](#5-pricing)
6. [Who the users are](#6-who-the-users-are)
7. [The student journey, end to end](#7-the-student-journey-end-to-end)
8. [KIT Points and the batch model](#8-kit-points-and-the-batch-model)
9. [Decision record — what was pushed back on and why](#9-decision-record--what-was-pushed-back-on-and-why)
10. [Unresolved contradictions across source documents](#10-unresolved-contradictions-across-source-documents)
11. [Open questions requiring a decision](#11-open-questions-requiring-a-decision)
12. [Growth and scale — the business side](#12-growth-and-scale--the-business-side)

---

## 1. What KIT is

KIT (KidsinTech) Port Harcourt is a cohort-based tech education programme for children, run out of Port Harcourt, Nigeria. It teaches kids to build with technology rather than only consume it — web development, AI literacy, digital creation, and the research and reasoning habits that sit underneath all three.

It exists as two distinct products sharing one brand, one platform, and one team:

- a **12-week Future Skills Lab** — the flagship, cohort-based, small-batch, account-driven
- a **3-week Summer Build Camp** — a lightweight annual intensive with a competition hook

The platform being built is a single Next.js + Supabase application that serves the marketing site, the admissions funnel, the summer portal, and the eventual student/teacher/admin dashboards.

**Present reality, stated plainly:** KIT has not yet run a cohort through this platform. Roughly **50 students have signed up via Google Forms** — that is the only real enrolment number that exists, and it is the number the site is permitted to advertise. Everything else in this document describes a system being built, not one in operation. This distinction matters for marketing copy (see §9.2).

---

## 2. Positioning and brand

### Positioning statement

> Kidsintech Port Harcourt is a 12-week Future Skills Lab, equipping kids with AI literacy, digital building skills, and career-relevant tech knowledge beyond the traditional classroom.

### Brand attributes

| Attribute | What it means in practice |
|---|---|
| **Structured** | Fixed 12-week arc, defined weekly rhythm, published curriculum — not open-ended tutoring |
| **AI-focused** | AI literacy is a pillar, not a bolt-on module |
| **Project-based** | Every track terminates in a built artefact the student can show a parent |
| **Limited slots** | Max 15 per batch. Scarcity is real, not manufactured |
| **High-quality branding** | The site is a trust signal to parents; it carries most of the sales weight |

### Brand statements

1. *Every career needs tech literacy.*
2. *In 12 weeks, students move from passive consumers of technology to confident creators who understand how the digital world works and how to use it responsibly.*

**The promise:** *In 12 weeks, your child won't just consume technology — they'll build with it.*

### Mission — the five things KIT teaches

1. How technology works
2. How to build with technology
3. How to think with technology
4. How to use technology responsibly
5. How tech connects to real careers

### The four pillars

1. **AI & Smart Thinking**
2. **Coding & Web Building**
3. **Data & Research Mastery**
4. **Career-Tech Exposure**

### A note on tone

The parent is the buyer; the child is the user. Every surface has to work on both. The observed pattern across the site so far — warm, low-pressure, family-facing copy paired with a visually confident design system — is correct and should be held. Where these two audiences conflict, favour the parent: they are the ones spending ₦75,000.

**Scriptural anchor** (from the founding blueprint, retained as internal context rather than public copy): *Isaiah 60:11 — "The gates shall continually be opened…"*

---

## 3. The two products

### 3.1 The 12-Week Future Skills Lab

| | |
|---|---|
| **Duration** | 12 weeks (~3 calendar months) |
| **Ages** | 10–16 — see the [track gap flagged in §10.1](#101-the-age-band-does-not-cover-its-own-range) |
| **Batch size** | Maximum 15 students |
| **Live classes** | Saturdays, via Google Meet |
| **Midweek work** | Tasks issued Wednesdays |
| **Access model** | Full Supabase Auth accounts, role-based dashboards |
| **Identity** | KIT ID, e.g. `WD2601-0042` (see ADR 004 in Document 2) |
| **Completion** | Certificate for every finisher; special certificate + cash prize for the top KIT Points scorer in each batch |

The 12-week product is where the platform complexity lives: accounts, roles, batches, resource locking, assignments, submissions, grading, points, leaderboards.

**Delivery model:** live classes rather than pre-recorded. This is a deliberate differentiator — the comparison drawn in the original planning was "Khan Academy, but the classes are live on Google Meet, and resources unlock stage by stage as the batch moves forward." Progression is gated by the teacher, not by the student's clicking speed.

### 3.2 The 3-Week Summer Build Camp

| | |
|---|---|
| **Duration** | 3 weeks |
| **Ages** | 10–16 |
| **Cohort** | One per year |
| **Curriculum** | Single shared syllabus — no tracks, no specialisation |
| **Access model** | ID only. No account, no password, no email required |
| **Identity** | Summer ID, e.g. `SM25734` (see ADR 005 in Document 2) |
| **Prize** | ₦30,000 to the winning group project |

The summer product is deliberately the *simpler* system, and that simplicity is architectural, not accidental. Every summer student sees the identical page. There is no personalisation, no per-student query, no dashboard. It is an information hub — "what am I doing today and where do I click" — not an LMS.

**Why it matters disproportionately:** the summer camp is the fastest path to real students using real software, because it doesn't depend on the accounts/auth/batch system. It is deliberately sequenced ahead of the 12-week platform for exactly this reason (see the roadmap in Document 3).

### 3.3 How the two relate

They share:
- the brand and marketing site
- the `courses` table (the summer offering is a row with `type = 'summer'`, not a separate concept)
- the admissions form and Paystack flow
- the admin surface

They do **not** share:
- authentication (real accounts vs. ID cookie)
- content model (per-batch resources vs. one shared row)
- identity format (KIT ID vs. Summer ID)
- pricing structure

Treating the summer camp as "the 12-week programme but shorter" would be an architectural mistake. It is a different product with a different access model, and the codebase reflects that.

---

## 4. Curriculum

### 4.1 The 12-week programme, by age track

The original blueprint defines two tracks. The same subject areas appear in both; the difference is depth and abstraction.

#### Track: ages 10–12

- Internet & cyber safety
- Creative problem solving
- Intro to coding logic
- Data basics — charts, trends
- Idea generation with AI
- Simple website creation
- Digital presentation skills
- Research skills
- Information evaluation
- **Mini project:** launch a pretend business
- Career exposure: what do engineers, doctors, and lawyers use tech for?
- Web development — basic level: structure, HTML concepts, a fun build

#### Track: ages 13–15

- Internet & cyber safety — advanced angle: digital footprint, data privacy
- Prompt engineering
- AI productivity systems
- AI-assisted study systems
- Intro to coding logic — accelerated
- Intro to Python
- Data basics — deeper: interpretation, insight
- Research skills — academic level
- Information evaluation — bias, misinformation
- Career-tech mapping
- **Build and launch a real mini project**
- Web development — more structured build
- UI/UX

The tracks map to a `track` field on the `courses` table (`'10-12' | '13-15'`), not to separate course entities — same course, different depth, which is how the blueprint already frames it.

### 4.2 The summer camp curriculum

One shared 3-week syllabus for everyone:

- **Web development**
- **AI literacy** — basic prompt engineering and cyber safety
- **Modern graphic design**

**Capstone project:** build a basic website for a company, design its graphics, and use AI to research market data for that business in order to produce a business plan and advertising.

**Special event:** the winning group project takes ₦30,000.

The capstone is well constructed — it forces all three subjects into one artefact rather than teaching them as three disconnected units. Keep it.

### 4.3 The course catalogue

Courses are data, not code. The `courses` table is the source of truth the marketing site renders from; a course's `status` field (`'live' | 'coming_soon'`) controls whether it appears as a live card or a "coming soon" pill. Adding a new offering is a database insert, not a redeploy.

**Currently represented across the various documents and the built site:**

| Course | Code | Status | Appears in |
|---|---|---|---|
| Web Development / Web Design | `WD` | Live | Blueprint, Alfred's plan, site, apply form |
| AI / AI Literacy | `AI` | Live | Blueprint, Alfred's plan, site — **missing from the apply form** |
| Python | `PY`? | Live? | Complete doc, apply form |
| 3D Game Development | `GD`? | Live? | Complete doc, apply form |
| Graphic Design | — | Coming soon | Blueprint (summer only) |
| Robotics | — | Coming soon | Architecture plan |
| App Building | — | Coming soon | Site mockup |

This table contains a real inconsistency — see [§10.2](#102-the-course-catalogue-does-not-agree-with-itself).

---

## 5. Pricing

### 5.1 Current prices

| Product | Plan | Charged at application | Total |
|---|---|---|---|
| 12-week programme | Monthly × 3 | ₦27,000 | ₦81,000 |
| 12-week programme | Upfront | ₦75,000 | ₦75,000 |
| 3-week summer camp | One-time | ₦15,000 | ₦15,000 |

### 5.2 How payment works

**Model: pay at apply.** The parent completes the application form and is taken to Paystack in the same flow. The application row is created with `status = 'pending_payment'`; a verified Paystack webhook is what flips it to paid. Admin review happens *after* money is captured.

**Monthly plan handling:** ₦27,000 (month one) is charged at application. Months two and three are tracked manually from the admin panel and chased by hand. Paystack subscriptions are deliberately **not** used — see [§9.4](#94-pushback-do-not-build-paystack-subscriptions-yet).

**Refund exposure:** pay-at-apply means a rejected applicant is owed a refund, and Paystack refunds are manual. This is accepted on the reasoning that with 15 slots per batch, "review" in practice means *confirm fit and assign a batch*, not *reject*. If rejection rate ever climbs above the occasional, revisit — see [§11.3](#113-there-is-no-refund-policy).

### 5.3 The discount problem — flagged, unresolved

₦6,000 off ₦81,000 is a **7.4% discount for paying three times as much upfront.**

People anchor on the smaller number. A 7.4% saving is very unlikely to move a parent from ₦27,000-today to ₦75,000-today. The predictable outcome is that most parents choose monthly, which means:

- more manual chasing for months two and three
- more revenue at risk of never arriving (a parent who ghosts after month one has paid ₦27,000 for a 12-week programme)
- worse cash flow at exactly the point when a cohort's costs are front-loaded

If the intent is genuinely to push upfront payment, the gap needs to be wider. ₦70,000 upfront makes it a 13.6% saving, which is in the range where discounts actually change behaviour. Alternatively, price monthly *up* rather than upfront down — ₦30,000/month (₦90,000 total) against ₦75,000 upfront is a 16.7% saving and reads as "monthly costs extra for the convenience," which is both true and normal.

**This has not been decided.** The numbers in §5.1 are what is currently implemented.

### 5.4 Implementation notes that cause real bugs

- **Paystack amounts are in kobo.** ₦75,000 is `7500000`. Off-by-100 is the single most common Paystack integration bug.
- **Collecting monthly means paying the transaction fee three times.** Verify current Paystack fees before finalising the spread in §5.3 — the fee difference partially offsets the discount.
- **Never trust the redirect.** A parent can close the tab, lose signal, or hit the success URL directly. The signed webhook is the only source of truth for payment status.

---

## 6. Who the users are

### 6.1 The four parties

| Party | Has a login? | What they do |
|---|---|---|
| **Student** | Yes (12-week) / ID only (summer) | Attends class, submits work, earns points, downloads resources |
| **Teacher** | Yes | Runs one batch: teaches, grades, unlocks resources, posts announcements |
| **Admin** | Yes | Everything: approvals, accounts, batches, courses, payments, summer content |
| **Parent** | **No** | Applies, consents, pays. Their email may stand in for the student's |

### 6.2 Permissions, in detail

**Admin — unrestricted.**
- Creates and approves accounts, generates KIT IDs, builds batches and courses
- Can search any student and see full detail: name, phone, email, batch, KIT score, enrolment date, parent info
- Manages payments and resources
- Sees every batch and its top student, for prize allocation
- Edits the summer portal content that all summer students read

**Teacher — their own batch only.**
- Runs the live class, grades classwork and assignments, uploads and unlocks resources
- Sees **limited** student information: name, email, batch, KIT score. Nothing else — no phone, no parent contact, no address

**Student — their own batch only.**
- Joins class, submits work, downloads unlocked resources
- Sees their own KIT points and their batch's top-5 leaderboard
- Cannot see anything outside their batch

This scoping is enforced at the database level via Row Level Security, not in application code — see ADR 003 in Document 2.

### 6.3 The parent problem — flagged

Parents are the paying customer and are deliberately not given a login. This is defensible for launch (fewer surfaces to build, fewer credentials to support), but it leaves real gaps:

- A parent who has paid ₦27,000 and wants a receipt has no self-service way to get one
- A parent who wants to know whether their application was approved has to email and wait
- A parent who wants to see whether their child is actually attending has no visibility at all

None of these block launch. All of them will generate WhatsApp messages that Ade personally has to answer. Worth deciding consciously rather than by omission — see [§11.4](#114-parents-have-no-surface-at-all).

---

## 7. The student journey, end to end

### 7.1 The 12-week journey

```
Parent lands on the site
   ↓
Reads programmes, picks a course
   ↓
/apply — fills in student info, parent info, programme, payment plan
   ↓
Consents ("I confirm the information provided is accurate")
   ↓
Paystack checkout — ₦27,000 / ₦75,000
   ↓
Webhook verifies payment → application row marked paid
   ↓
[ADMIN] Reviews the paid application
   ↓
[ADMIN] Approves → creates student account
                 → assigns batch
                 → generates KIT ID (WD2601-0042)
                 → KIT Points initialised to 0
                 → emails login details
   ↓
Student logs in
   ↓
─── weekly loop, 12 times ─────────────────────────
   Is there a class today?
     YES → join Google Meet
          → joining within the first 5 minutes earns punctuality points
          → teacher puts tasks on screen; student answers in the sandbox
          → teacher grades; student sees the grade almost immediately
          → first-correct answers earn bonus points
     NO  → any outstanding assignments? do them, submit for grading
   Resources unlock as the teacher releases them
───────────────────────────────────────────────────
   ↓
Course completes
   ↓
Everyone who finishes → certificate
Top KIT Points in batch → special certificate + cash prize (handed over in person)
```

**The approve step is one click for admin but a chain of five operations behind it.** If any link fails — email doesn't send, KIT ID collides, batch is full — the system must not leave a half-created student. This needs to be atomic or explicitly recoverable.

### 7.2 The summer journey

```
Parent/student lands on /summer
   ↓
Applies + pays ₦15,000
   ↓
[ADMIN] Adds student to the summer roster → Summer ID assigned (SM26xxx)
   ↓
Summer ID sent to the family
   ↓
Student enters the ID at /summer → one field, no password
   ↓
Signed cookie (12–24h) → /summer/portal
   ↓
─── daily, for 3 weeks ────────────────────────────
   Open portal → see today's class, Meet link, homework,
                 announcements, resources, schedule
   Everyone sees the identical page
───────────────────────────────────────────────────
   ↓
Group project → winning team takes ₦30,000
```

### 7.3 Notification points

All email goes to the student's email on file, which may be a parent's address. The form makes this explicit.

Emails fire when:
- an account is created (login details)
- a class starts and the Meet link goes out (whole batch)
- a new assignment is posted (whole batch)
- a resource is unlocked (whole batch)

**Provider:** Resend — free tier covers 3,000/month, integrates cleanly with Next.js, and is needed regardless for the login-details flow.

---

## 8. KIT Points and the batch model

### 8.1 The batch — "the casing"

A batch holds a **maximum of 15 students** and is the student's entire visible world: their classmates, their leaderboard, their resources, their teacher. They cannot see outside it. The original planning document calls this "the casing," and it is enforced with database policies rather than UI hiding.

Why 15: small enough that a teacher can grade live tasks in real time and know every student by name. This number is a product constraint, not a technical one — it should not drift upward quietly to improve unit economics without acknowledging that the teaching model changes with it.

### 8.2 KIT Points

Every student starts at zero. Points accrue from:

- joining class on time (within the first 5 minutes)
- taking part in in-class tasks
- getting good grades
- being among the first to answer a class task correctly
- completing and submitting assignments

**Visibility:**
- Students see the **top 5 of their own batch only**
- Admin sees the number-one student in every batch

**At course end:**
- every finisher receives a certificate
- the highest scorer in each batch receives a special certificate plus a cash prize, handed over in person

Points are stored as a **ledger** (`kit_points_ledger`), not as a mutable integer. Every award is a row with a reason. The integer on the student record is a cached total. This matters: when a parent asks why their child has 120 points and another has 140, the ledger is the answer, and a mutable counter cannot produce one.

### 8.3 A design observation worth holding

Showing only the top 5 is a considered choice. A full 15-student leaderboard means ten children see themselves in the bottom two-thirds every week, which is precisely the wrong outcome for a programme whose stated value is confidence building. The top-5 cutoff makes the leaderboard aspirational rather than punitive. Do not "improve" this by showing full rankings.

---

## 9. Decision record — what was pushed back on and why

This section exists because the reasoning behind these decisions is more valuable than the decisions themselves. When circumstances change, the reasoning is what tells you whether the decision still holds.

### 9.1 Pushback: reject the enterprise stack

**Proposed:** NestJS as a separate backend service on Railway, Postgres via Neon with Prisma, Clerk for auth, Cloudflare R2 for storage, Resend for email, all tied together in a Turborepo monorepo.

**Rejected.** That is a legitimate architecture — for a team with a dedicated backend engineer who wants clean service boundaries. For a solo builder using AI agents as the development team, it is four extra vendors, two extra deploy targets, and a second codebase to keep in sync with the frontend, for a v1 that needs none of that isolation.

**Adopted instead:** Next.js (App Router) + Supabase + Paystack + Vercel. One repo, one deploy, one bill. Server Actions and Route Handlers replace the API service. This is the same stack already proven across AjoBook, SEE.COM, and Bonsai — extending existing muscle memory rather than learning a new backend framework and ORM for a schools project.

**The nuance that matters:** NestJS is a genuinely good *learning* exercise if backend/cloud depth is the explicit goal. But that is a separate decision from "what does KIT need to ship." Do not conflate a learning objective with a product requirement. Formalised as [ADR 001](KIT-02-Architecture-and-Data.md#adr-001--single-nextjs--supabase-app).

### 9.2 Pushback: do not advertise 1,200 students

**Proposed:** the reference design's hero stat card reading *"1,200+ students already learning with KIT"* and body copy saying *"join hundreds of kids."*

**Rejected, and this one is not negotiable.** KIT had not run a cohort. The number was fabricated.

Parents are the most trust-sensitive audience the business has. A number that cannot be substantiated is exactly the sort of thing that costs the sale the moment anyone asks — and in a Port Harcourt parent network, someone will ask. The project already has an explicit no-fabrication rule; it is why the student-work carousel uses gradient placeholders instead of invented projects.

**Adopted instead:** `50+ — Students already signed up`, which is true (the Google Forms sign-ups), defensible, and still meaningful. Body copy changed from "hundreds of kids" to "the kids."

**The general principle:** every number on the public site must trace to something real. When there is no real number, use a true structural fact instead — "cohorts capped at 15," "ages 10–16," "3 programmes, 12 weeks." Those are all impressive and all verifiable.

### 9.3 Pushback: an email is not a database

**Proposed:** the application form submits by sending an email to admin, who reads it and manually creates the student.

**Rejected.** If the only record of an application is an email, then a spam filter, a bounced send, or a deleted thread means that application is gone with no way to recover it. There is no list for the admin panel to be built on top of later — it would have to be reconstructed from an inbox.

**Adopted instead:** insert into the `applications` table *first*, then send a notification email. The row is the source of truth; the email is a ping saying "go look." That is roughly fifteen extra lines of code, and it means the Phase 2 admin panel has real data waiting for it on day one rather than starting empty.

### 9.4 Pushback: do not build Paystack subscriptions yet

**Proposed:** use Paystack plans/subscriptions to automate the three monthly payments on the 12-week programme.

**Rejected for now.** Paystack subscriptions:
- work with **cards only** — no bank transfer, which a large share of Nigerian parents prefer
- require handling failed charges, expired cards, and cancellation flows
- introduce a recurring-billing state machine that has to be reconciled against enrolment status

At 15–30 students per cohort, tracking who owes what is a spreadsheet problem, not an engineering problem.

**Adopted instead:** charge month one at application, store `plan = 'monthly'` on the row, chase months two and three by hand from the admin panel.

**The general principle** (same as ADR 001): build the service when the manual version becomes the bottleneck, not before. The trigger to revisit is not a date — it is the first month where manually chasing payments takes more than an hour.

### 9.5 Pushback: the discount spread will not change behaviour

Covered in full at [§5.3](#53-the-discount-problem--flagged-unresolved). Raised, not resolved. The current ₦6,000 spread is implemented; the analysis says it is too small to matter.

### 9.6 Pushback: build the summer portal before the student platform

**Proposed order:** marketing → admissions → 12-week platform → summer portal.

**Reordered.** The summer portal is the most self-contained piece in the entire system — it depends on no accounts, no auth, no batches, no roles, no RLS policies. It is the fastest path to real students using real software, and it is the piece with a hard external deadline (summer happens whether or not the software is ready).

The 12-week platform, by contrast, cannot exist until accounts, batches, and RLS all work.

**Adopted:** summer portal is Phase 3, ahead of the 12-week student platform in Phase 4.

### 9.7 Pushback: defer the live sandbox entirely

The live coding sandbox — where students type answers during class and the teacher grades them in real time — is the highest-complexity piece in the entire product. It needs a browser code editor, an execution environment, and a real-time transport.

**Decision:** deferred to Phase 6, after a real cohort has run on Phases 1–5. Not because it is unimportant, but because building it before observing a real class means building it against a guess about how live grading actually plays out. Run a cohort with Google Meet plus manual grading, watch where it hurts, then build the thing that fixes the observed pain.

### 9.8 Pushback: RLS over application-level filtering

**Proposed:** enforce batch scoping in the API layer — every query adds `WHERE batch_id = ...`.

**Rejected as the sole mechanism.** One forgotten `WHERE` clause in one new route is a data leak that exposes one family's child to another. Application-level filtering is fine as defence in depth, but the database must be the enforcement point.

**Adopted:** Postgres Row Level Security policies keyed to `auth.uid()` joined against a `profiles` table. Formalised as [ADR 003](KIT-02-Architecture-and-Data.md#adr-003--role-based-access-via-supabase-rls).

### 9.9 Pushback: summer IDs must not be sequential

The Summer ID is not merely an identifier — it is the **only credential** guarding the portal, and behind that portal sits a live Google Meet link. Sequential IDs (`SM26001`, `SM26002`, …) are trivially enumerable, meaning a stranger could walk the sequence and join a video call full of children.

**Adopted:** random suffix, plus rate limiting on the ID-check endpoint. Formalised as [ADR 002](KIT-02-Architecture-and-Data.md#adr-002--id-only-access-for-the-summer-portal) and [ADR 005](KIT-02-Architecture-and-Data.md#adr-005--summer-id-format).

This is the one place where the "keep it simple" instinct had to yield. The content behind the gate is not sensitive; the *people* behind it are children on a video call. That changes the calculus.

### 9.10 Smaller corrections made along the way

- **Base64 logo:** the original mockup embedded the footer logo as a full base64 PNG inline in the HTML. Replaced with a referenced file asset.
- **Summer camp placement:** the ₦30,000 prize hook is a strong enough draw to deserve real visual weight on the marketing site rather than living as a footer link. Given its own section.
- **Cross-page section links:** `Programs` and `Why Kit?` exist only as sections on the homepage. As bare `#hash` anchors they were dead links from every other page. Replaced with a shared hook that navigates home, waits for the section to mount, then scrolls — one click, resolving as fast as the page hydrates rather than on a fixed timer.
- **Footer `--wrap` bug:** `footer .wrap { padding: 0 var(--wrap) }` referenced a CSS variable that was never defined, so the padding silently collapsed to zero and the footer sat flush against the viewport edge while every other section had a 32px gutter.

---

## 10. Unresolved contradictions across source documents

These are genuine conflicts between the source documents this file replaces. Each needs a decision from Ade; none should be resolved silently by whoever writes the next line of code.

### 10.1 The age band does not cover its own range

- The **blueprint** defines two tracks: **10–12** and **13–15**
- **Alfred's platform plan** says the courses are for **ages 12–16**
- The **marketing site, apply form, and complete documentation** all say **ages 10–16**

Taking the site's claim (10–16) together with the blueprint's tracks (10–12, 13–15) leaves **16-year-olds with no curriculum track**. The application form's validation actively enforces 10–16, so a 16-year-old can apply today and there is nothing to put them in.

**Options:** extend the upper track to 13–16; add a third track; or change the advertised range to 10–15. The third is the cheapest and the least honest-feeling if 16-year-olds have already signed up via Google Forms — **check the existing 50 sign-ups for ages before deciding.**

### 10.2 The course catalogue does not agree with itself

- The **blueprint** and **Alfred's plan** both say launch is **two courses: Web Design and AI**
- The **complete documentation** and the **built site** list **Web Dev, Python, 3D Game Dev, AI Literacy**
- The **application form as built** offers **Web Development, Python Programming, 3D Game Development, Summer Tech Camp** — **AI is missing entirely**

So the site advertises AI, the founding blueprint treats AI as a core pillar and a launch course, and a parent who wants it **cannot select it on the application form.** That is a live bug in a revenue path, not a documentation nit.

**Also unresolved:** KIT ID course codes exist for `WD` and `AI` only. Python and Game Development have no assigned code, so a Python student cannot currently be issued a KIT ID.

### 10.3 Two different contact identities

- The complete documentation lists **hello@kit.ng**
- The apply page sidebar and footer carry **hello@kidsintech.africa** and **+234 802 123 4567**
- The architecture documents assume the domain **kit.ng**

The phone number and the `.africa` email were **carried over from a reference design and are placeholders** — they are marked with `TODO` comments in the code. They are currently live on the apply page and the footer.

**This needs resolving before launch,** because a parent who emails a non-existent address is a lost sale that never even registers as a lost sale.

### 10.4 The applications table cannot store what the form collects

The schema defines:

```
applications (id, parent_name, parent_email, student_name, age,
              course_choice, payment_ref, status, created_at)
```

The application form as built collects: student name, **date of birth**, **gender**, **school**, parent name, **relationship to student**, email, **phone**, programme, **payment plan**, **referral source**, **free-text notes**, and **consent**.

Eight collected fields have nowhere to go. Also missing: **amount paid** (essential — the row must record what was actually charged, since ₦27,000 and ₦75,000 both mean "12-week programme"), and a **timestamp for payment confirmation** distinct from `created_at`.

Storing `age` rather than `dob` is also a latent bug: age is only true on the day it is recorded, and a cohort spanning a birthday will report wrong ages forever. Store the date of birth and compute age.

Corrected schema in [Document 2](KIT-02-Architecture-and-Data.md#4-the-schema).

### 10.5 "12 weeks" and "3 months" are used interchangeably

Classes run on Saturdays, so 12 weeks means 12 sessions. But the pricing is `₦27,000 × 3 months`, and Alfred's plan calls it "a 3-month program."

Twelve weeks is not three months — it is roughly 2.8. Over three monthly payments, a parent paying ₦27,000 on 1 June, 1 July, and 1 August has paid through 31 August for a programme that ends in mid-August.

Harmless in practice, but the marketing copy, the payment schedule, and the certificate wording should agree. Pick "12 weeks" for marketing (it's the stronger phrase) and be explicit that the payment schedule is three monthly instalments, not three months of service.

### 10.6 Summer ID format disagrees with the wireframe

- **ADR 005** defines `SM[YY][RANDOM3]` → `SM25734`, no separator
- The **summer login wireframe** shows a pre-filled prefix of `SM26-___`, with a hyphen

Trivial, but it is the single input on the single gate to the entire summer product — get the format settled before building it, because a kid typing `SM26734` into a field expecting `SM26-734` will be told their valid ID is invalid.

**Also worth noting:** a 3-digit random suffix gives only **1,000 possible IDs per year.** At 48 students that's 4.8% occupancy — combined with rate limiting, brute-forcing is impractical. But it does not scale: at 300 summer students the space is 30% occupied and guessing becomes viable. If the summer camp grows past ~100 students, widen the suffix to 4 digits.

### 10.7 Stale details in the complete documentation

Smaller drift, listed for completeness — corrected in Document 3:

- Documented nav links are *Programs, About, How It Works, FAQ*; the built nav is *Programs, About, Why Kit?, Contact*
- Documentation references `logo.jpg`; the code uses `/logo.webp`
- The roadmap marks About as half-done; the complete documentation marks it complete
- The roadmap says the apply page is "form only, no payment yet" — payment has since been designed into the same flow
- `Ambient.jsx` is still JavaScript in an otherwise strict-TypeScript codebase

---

## 11. Open questions requiring a decision

Ordered by how much they block.

### 11.1 Which courses actually launch, and what are their codes?

Blocks: the application form, the KIT ID generator, the `courses` table seed. See §10.2. **This one blocks Phase 2 outright.**

### 11.2 What is the real contact email and phone number?

Blocks: nothing technically, but it is live placeholder data on a public revenue page. See §10.3.

### 11.3 There is no refund policy

Pay-at-apply creates refund exposure and there is no stated policy — not on the site, not in the consent checkbox, not in the documentation. Questions with no current answer:

- What happens if an application is rejected after payment? (Full refund, presumably — but say so.)
- What happens if a parent withdraws in week 3 of 12?
- What happens if a monthly-plan parent stops paying after month one? Does the student lose access mid-cohort?

The third is the one that will actually happen. Decide it before it happens, not during.

### 11.4 Parents have no surface at all

See §6.3. Options, cheapest first: (a) do nothing, answer WhatsApp messages by hand; (b) an automated payment-receipt email and an approval-status email, which absorbs most of the demand for roughly no extra work; (c) an actual parent view, which is a whole new role and RLS surface.

**(b) is almost certainly right** — it kills 80% of the inbound with two transactional emails and no new authentication surface.

### 11.5 What happens to the 50 Google Forms sign-ups?

Fifty families have already put their names down. Undecided:
- Are they migrated into `applications` as existing rows, or asked to re-apply through the new form?
- Have they paid anything?
- Which programme and which age track is each of them in?

If they have to re-apply, some fraction will not, and the real number will drop below 50 — which would also make the hero stat card wrong.

### 11.6 What is the actual cohort start date?

The countdown timer on the summer section is hardcoded (`const CLOSE = new Date(...)`). Nothing in the documentation states the real dates for either programme. The summer camp has a hard seasonal deadline, and the entire Phase 3 sequencing argument rests on hitting it.

### 11.7 Is the pricing spread being changed?

See §5.3. Currently implemented as specified; the analysis says it will not achieve its goal.

---

## 12. Growth and scale — the business side

Technical scalability is covered in [Document 2 §8](KIT-02-Architecture-and-Data.md#8-scalability). This section is about the business model's own limits.

### 12.1 What the current model can absorb

| Constraint | Ceiling | What breaks first |
|---|---|---|
| Batch size | 15 students | Live grading stops being possible for one teacher |
| Teachers | 1 batch each | Teacher supply, not software |
| Cohorts per year | ~4 × 12 weeks | Calendar |
| Summer cohorts | 1/year | Seasonality |
| Manual payment chasing | ~50 monthly-plan students | Ade's time |
| Manual approvals | ~100 applications/cohort | Ade's time |

**The binding constraint is not software — it is teachers and Ade's hours.** This is worth stating plainly, because it means engineering effort spent on scaling the platform beyond a few hundred students is effort spent on the wrong bottleneck.

### 12.2 Revenue arithmetic

One full batch of 15 on the 12-week programme:

- all upfront: 15 × ₦75,000 = **₦1,125,000**
- all monthly, fully collected: 15 × ₦81,000 = **₦1,215,000**
- all monthly, one-third drop off after month one: 15 × ₦27,000 + 10 × ₦54,000 = **₦945,000**

That last line is why §5.3 and §11.3 matter. The difference between the best and worst realistic outcome for a single batch is ₦270,000 — and the deciding factor is a payment-plan design choice, not anything about teaching quality.

One summer cohort of 48: 48 × ₦15,000 = **₦720,000**, less the ₦30,000 prize.

### 12.3 Where the model grows

In rough order of leverage per unit of effort:

1. **More batches per cohort** — needs teachers, not code. The platform already supports N batches.
2. **More courses** — a `courses` insert plus curriculum work. The architecture was deliberately built so this is not a redeploy.
3. **More summer cohorts** — a second annual intensive (Christmas/Easter) reuses the entire summer stack with a new `cohort_year`. Highest revenue per engineering hour of anything on this list.
4. **School partnerships** — sell a batch to a school rather than 15 individual families. Changes the payment model (one invoice, not 15) and needs an org concept the schema does not currently have.
5. **Geographic expansion** — a second city. Needs a location concept in the schema; currently everything implicitly assumes Port Harcourt.

Items 4 and 5 both require data-model changes that do not exist yet. They should not be built speculatively — but knowing they will require an `organisations` or `locations` table is useful when deciding how hard to fight for schema normalisation now.

### 12.4 The long-term risk worth naming

The 12-week product's differentiator is **live, small-batch teaching with real feedback.** That is also its cost structure. Every mechanism for growing revenue faster than teacher headcount — bigger batches, recorded classes, automated grading — erodes exactly the thing parents are paying for.

This is a genuine tension, not a problem to be solved on a whiteboard. The honest version is: KIT is a high-touch education business with software support, not a software business. Scaling it looks more like opening a second location than shipping a feature. Architect accordingly, and be suspicious of any roadmap item that promises to scale teaching without scaling teachers.

---

*Continue to [Document 2 — Architecture & Data](KIT-02-Architecture-and-Data.md).*
