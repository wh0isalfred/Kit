# KIT — Build Handbook

**Document 3 of 3** · Supersedes `Wireframes.md`, `Roadmap.md`, and the code/convention/component sections of `KIT_PROJECT_COMPLETE_DOCUMENTATION.md`.

**Status:** Phase 1 — marketing site, in progress
**Last revised:** July 2026

**Companion documents:**
- [Document 1 — Product & Decisions](KIT-01-Product-and-Decisions.md) — what KIT is, pricing, permissions, decision record
- [Document 2 — Architecture & Data](KIT-02-Architecture-and-Data.md) — stack, ADRs, schema, security, scalability

---

## Table of contents

1. [Project structure](#1-project-structure)
2. [Code conventions](#2-code-conventions)
3. [The design system](#3-the-design-system)
4. [Component inventory](#4-component-inventory)
5. [Screen specifications — Summer](#5-screen-specifications--summer)
6. [Screen specifications — Admin](#6-screen-specifications--admin)
7. [Roadmap](#7-roadmap)
8. [Development workflow](#8-development-workflow)
9. [Known issues and tech debt](#9-known-issues-and-tech-debt)
10. [Working on this project as an AI agent](#10-working-on-this-project-as-an-ai-agent)

---

## 1. Project structure

```
kit/
├── src/
│   ├── app/
│   │   ├── layout.tsx           root layout — html, body, metadata, fonts
│   │   ├── globals.css          ALL styling: tokens, components, responsive
│   │   ├── page.tsx             homepage — composes home sections
│   │   ├── about/page.tsx
│   │   ├── contact/page.tsx
│   │   └── apply/page.tsx
│   │
│   └── components/
│       ├── site/                shared across every page
│       │   ├── Nav.tsx              sticky navbar (client)
│       │   ├── Footer.tsx           footer (client — uses useSectionLink)
│       │   ├── useSectionLink.ts    cross-page section navigation hook
│       │   ├── Ambient.jsx          floating glyphs + orbs (presentational)
│       │   └── Reveal.tsx           IntersectionObserver scroll-reveal
│       │
│       ├── home/
│       │   ├── Hero.tsx
│       │   ├── Programs.tsx         data-driven course grid
│       │   ├── SummerSection.tsx    dark banner + live countdown (client)
│       │   ├── WhyKit.tsx           data-driven feature tiles
│       │   ├── StudentWork.tsx      3D coverflow carousel (client)
│       │   ├── Invite.tsx           closing CTA
│       │   └── EnrollBar.tsx        scroll-triggered slide-up bar (client)
│       │
│       ├── about/
│       │   └── AboutHero.tsx
│       │
│       └── apply/
│           ├── ApplyHero.tsx        hero + arched image + stat card
│           ├── ApplicationForm.tsx  the form (client)
│           ├── ApplySidebar.tsx     "What Happens Next" + contact
│           ├── TrustBar.tsx         safety/privacy band
│           └── ApplyCTA.tsx         closing navy banner
│
├── public/
│   ├── logo.webp
│   ├── heroImage.webp             1402×1122
│   ├── summersectionImage.webp    1907×825
│   ├── aboutHeroImage.webp        520×540
│   ├── applyHeroImage.webp        1200×900
│   └── work/                      (future) student project screenshots
│
├── next.config.ts                 React Compiler enabled
├── tsconfig.json                  strict, path alias @/*
└── package.json

docs/
├── KIT-01-Product-and-Decisions.md
├── KIT-02-Architecture-and-Data.md
└── KIT-03-Build-Handbook.md        ← this file
```

**The `components/{page}/` convention is load-bearing.** Anything shared lives in `site/`; anything belonging to one route lives in a folder named for that route. A component used by exactly one page does not go in `site/`, no matter how generic it looks.

---

## 2. Code conventions

### TypeScript

- **Strict mode**, always. No `any` — use `unknown` and narrow if genuinely needed.
- Path alias `@/*` maps to `src/`.
- Component props typed above the component: `type ComponentNameProps = { … }`.

### React and Next.js

**Server components by default.** Add `"use client"` only for state, effects, event listeners, observers, or animation. Most components in this codebase are correctly server components; the client ones are `Nav`, `Footer`, `SummerSection`, `StudentWork`, `EnrollBar`, and `ApplicationForm`.

**Naming.** Components PascalCase. Folders kebab-case. Files always `.tsx`.

### The data-array pattern

Every component rendering a list declares its data as a typed array at the top of the file:

```tsx
type Tile = {
  key: string;
  accent: "teal" | "purple" | "amber";
  icon: "hands" | "projects" | "mentors";
  label: string;
};

const tiles: Tile[] = [
  { key: "hands", accent: "teal", icon: "hands", label: "Hands-on learning" },
  // …
];

export default function ApplyHero() {
  return <>{tiles.map((t) => <Tile key={t.key} {...t} />)}</>;
}
```

Adding an item is an array edit, never a logic change. Every list component in the codebase follows this — `Programs`, `WhyKit`, `StudentWork`, `ApplyHero`, `ApplySidebar`, `TrustBar`.

**When this becomes a database read (Phase 2+), the array shape should map cleanly onto the table row.** That is why `programOptions` in the application form is shaped the way it is.

### Icons

Inline SVG, stroke-based, no icon library. Multi-icon components use a switch:

```tsx
function TileIcon({ name }: { name: Tile["icon"] }) {
  const c = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
              strokeWidth: 1.9, strokeLinecap: "round" as const,
              strokeLinejoin: "round" as const };
  switch (name) {
    case "hands": return <svg {...c}>…</svg>;
    // …
  }
}
```

`stroke="currentColor"` throughout, so colour is controlled by CSS rather than by prop.

### Styling

**All CSS in `globals.css`.** No CSS modules. No Tailwind classes in JSX. Class names are BEM-inspired but flat, never nested:

```
.apply-hero          component root
.apply-hero-in       inner wrapper
.apply-hero-copy     specific child
.apply-tile          repeated element
.apply-tile.tile-teal   accent modifier
```

Each component gets a clearly marked section with its responsive queries at the end of that section, not pooled at the bottom of the file:

```css
/* ================= APPLY HERO ================= */
.apply-hero { … }
.apply-hero-in { … }

/* Responsive */
@media (max-width: 900px) { … }
```

### Placeholders and fabrication

**Never invent data that will be read as fact.** No fake student counts, no fake testimonials, no fake project screenshots. `StudentWork` uses gradient placeholders rather than invented projects; the apply hero says `50+` because 50 is the real Google Forms number.

Where a placeholder is unavoidable — a contact detail not yet decided — mark it:

```tsx
/* TODO(Ade): confirm — carried over from the reference design,
   not confirmed as the real public contact. */
const contact = { email: "…", phone: "…" };
```

The rationale is in [Document 1 §9.2](KIT-01-Product-and-Decisions.md#92-pushback-do-not-advertise-1200-students).

---

## 3. The design system

### Tokens

```css
:root {
  --navy:   #1F2C4F;   /* primary dark — nav, CTA banners */
  --navy-2: #16203b;   /* gradient dark */
  --blue:   #1999E4;   /* primary accent — CTAs, links, emphasis */
  --green:  #25B290;   /* secondary accent — success, emphasis */

  --ink:    #1F2C4F;   /* body text, dark */
  --muted:  #5d6781;   /* secondary text */
  --faint:  #97a0b5;   /* tertiary text, placeholders */

  --paper:  #fcfdff;   /* light section background */
  --line:   #e8ebf2;   /* borders, dividers */

  --maxw:   1160px;    /* layout max width */
}
```

**`--wrap` does not exist.** It was referenced by one rule in the footer, which silently resolved to zero padding. Removed. Horizontal gutters come from `.wrap`, which is the only correct way to get them:

```css
.wrap { max-width: var(--maxw); margin: 0 auto; padding: 0 32px; }
```

### The accent trio

Three tinted icon-tile treatments recur across `ApplyHero`, `ApplySidebar`, and `TrustBar`. Reuse these rather than inventing new tints:

| Accent | Background | Foreground |
|---|---|---|
| teal | `#e1f5ee` | `#1d9e75` |
| purple | `#eeedfe` | `#7f77dd` |
| amber | `#faeeda` | `#ba7517` |
| blue | `#e9f3fd` | `#1999e4` |

### Typography

**Plus Jakarta Sans**, weights 400/500/600/700/800.

| Element | Size | Weight | Line height |
|---|---|---|---|
| Hero h1 (home) | 62px | 800 | 1.03 |
| Hero h1 (apply) | 52px | 800 | 1.10 |
| Section h2 | 34–42px | 800 | 1.12–1.16 |
| Card/feature title | 16–19px | 700 | — |
| Body | 14.5–16px | 400 | 1.55–1.68 |
| Label / eyebrow | 12–13px | 600–700 | — |

Headlines carry tight negative tracking (−0.02 to −0.04em); body text sits at 0.

### Spacing and shape

- Section vertical padding: 56–88px
- Panel radius 24–30px, card radius 16–20px, icon tile radius 13–15px, pill radius 40px
- Card gaps 22–28px

### Shadows

```css
/* floating card over an image */
box-shadow: 0 24px 50px -24px rgba(31,44,79,.38);
/* large panel lift */
box-shadow: 0 40px 90px -50px rgba(31,44,79,.35);
/* button hover */
box-shadow: 0 16px 30px -14px rgba(31,44,79,.55);
```

Always large-radius, heavily negative-spread, low-opacity navy — never black, never tight.

### Motion

| Effect | Detail |
|---|---|
| Scroll reveal | opacity 0→1 + 20px rise, 800ms, fires at 14% visibility, unobserves after |
| Glyph drift | translateY(−18px) + rotate(6deg), 19–26s loops |
| Summer pulse | glow every 3.8s |
| Carousel | auto-advance 2.8s, pauses on hover |
| Hover lift | translateY(−2px), 160–240ms |

**Every animation respects `prefers-reduced-motion`.** This is not optional — the audience includes children who may be motion-sensitive.

### Breakpoints

`1100px` · `900px` · `760px` · `640px` · `560px` · `480px`

900px is the primary desktop→mobile break (nav collapses to hamburger here). At 560px, form inputs go to `font-size: 16px` to stop iOS zooming on focus — a real fix, not a stylistic choice.

---

## 4. Component inventory

### `site/` — shared

| Component | Type | Notes |
|---|---|---|
| `Nav.tsx` | Client | Sticky. Logo / centred links / Apply + Login. Hamburger below 900px, auto-closes on tap. Uses `useSectionLink` |
| `Footer.tsx` | Client | **Light theme.** Logo / links / socials, then divider, then contact + copyright. Uses `useSectionLink` |
| `useSectionLink.ts` | Hook | Cross-page section navigation — see below |
| `Reveal.tsx` | Client | IntersectionObserver fade-in wrapper, 14% threshold, unobserves after first fire |
| `Ambient.jsx` | Static | 14 drifting glyphs + 3 orbs, `aria-hidden`. **Still JS — migrate to TS** |

#### `useSectionLink` — why it exists

`Programs` and `Why Kit?` exist only as sections on the homepage. As bare `#hash` anchors in the nav and footer, they were **dead links from every other page** — no matching element, no navigation.

The hook returns `href` + `onClick` props for a section link. On the homepage it scrolls directly. Elsewhere it pushes `/#id`, then polls each animation frame for the element and scrolls the moment it mounts, capped at 2s.

Deliberately **not** a fixed timer — it resolves as fast as the page hydrates (usually well under a second) rather than always waiting the worst case. The 2s ceiling is a safety net so a wrong id cannot hang. Modifier-clicks (cmd/ctrl/shift/middle) fall through to normal browser behaviour so "open in new tab" still works.

### `home/`

| Component | Type | Notes |
|---|---|---|
| `Hero.tsx` | Server | Two-column. Eyebrow, h1 with gradient emphasis, dual CTA, 3-feature row |
| `Programs.tsx` | Server | Data-driven grid. Per-card accent drives icon tint, duration text, link colour. "Popular" badge on Summer |
| `SummerSection.tsx` | Client | Dark banner over `summersectionImage.webp`, live 4-unit countdown, glow pulse. **`const CLOSE = new Date(...)` is hardcoded — update per cohort** |
| `WhyKit.tsx` | Server | Dark navy intro left, 4 gradient feature tiles right |
| `StudentWork.tsx` | Client | 3D coverflow, 6 items, ±34° side rotation, auto-rotate 2.8s. **Gradient placeholders — no real student work exists yet.** Add an `image` field when it does |
| `Invite.tsx` | Server | Navy rounded CTA card, wrapped in `Reveal` |
| `EnrollBar.tsx` | Client | Fixed bottom bar, slides up after 500px scroll, dismissible for session |

### `about/`

| Component | Type | Notes |
|---|---|---|
| `AboutHero.tsx` | Server | Full-bleed image background, left-aligned overlay text, absolutely-positioned quote, 8 floating glyphs |

### `apply/` — most recently built

| Component | Type | Notes |
|---|---|---|
| `ApplyHero.tsx` | Server | Two-column. h1 with blue `their` / green `future.`, 3 accent tiles, arched image mask, floating **`50+` stat card** |
| `ApplicationForm.tsx` | Client | Four sections, client-side validation, plan selector, live "due today" total. **Submit is stubbed** |
| `ApplySidebar.tsx` | Server | "What Happens Next" 3-step dashed timeline, contact card, welcome note. **Contact details are `TODO` placeholders** |
| `TrustBar.tsx` | Server | Lavender band, shield illustration, 3 trust badges |
| `ApplyCTA.tsx` | Server | Navy banner, paper-plane icon, pill button scrolling to `#apply-form` |

Page composition:

```
Nav → ApplyHero → .apply-form-card [ ApplicationForm | ApplySidebar ] → TrustBar → ApplyCTA → Footer
```

The card is a `page.tsx` wrapper — a 1.65fr/1fr grid with a hairline divider that flips from left-border to top-border below 900px.

#### `ApplicationForm` — current state

**Collects:** student name, DOB, gender, school (optional); parent name, relationship, email, phone; programme, payment plan, referral source; free-text notes; consent.

**Validates client-side:** required fields, email shape, 10 digits after +234, **age 10–16 derived from DOB**, plan required for term programmes, consent required. First error scrolls into view.

**Pricing constants** live at the top of the file and move to the `courses` table in Phase 2:

```ts
monthly: { dueNow: 27000, total: 81000 }
upfront: { dueNow: 75000, total: 75000 }
SUMMER_PRICE = 15000
```

**Submit is a `console.log`.** The next step is a Server Action that (1) inserts into `applications` with `status = 'pending_payment'`, (2) initialises a Paystack transaction for `dueNow`, (3) returns the checkout URL. The webhook marks it paid — never the redirect. See [Document 2 §6](KIT-02-Architecture-and-Data.md#6-payments).

**Two live problems:**
1. The programme list offers Web Development, Python, 3D Game Development, and Summer — **AI is missing**, though the site and the founding blueprint both treat it as a launch course. See [Document 1 §10.2](KIT-01-Product-and-Decisions.md#102-the-course-catalogue-does-not-agree-with-itself).
2. All validation is client-side. **Every rule must be re-checked in the Server Action** — especially amount, which must never be taken from the client.

---

## 5. Screen specifications — Summer

Structure and states, not pixels. The populated happy path is the one everyone sketches; the empty, loading, error, and not-yet-published states are the ones that cause bugs. Every screen below lists all of them.

### 5.1 Summer Login — `/summer`

**Who:** summer students aged 10–15, parent possibly beside them.
**Job:** prove the student belongs, with the least friction physically possible.

```
+------------------------------------------------+
|                     KIT                        |
|                Summer Portal                   |
|                                                |
|      Welcome to the 2026 Summer Tech Program   |
|                                                |
|            Enter your Summer ID                |
|      +----------------------------------+      |
|      |  SM26___                         |      |
|      +----------------------------------+      |
|                                                |
|             [   Enter Portal   ]               |
|                                                |
|                 Need help?  Contact us         |
+------------------------------------------------+
```

No navbar, no footer, no password, no "forgot ID." One input, one button.

**States**

| State | Behaviour |
|---|---|
| Default | Empty input, button enabled, field autofocused |
| Submitting | Spinner / "Checking…", input disabled so a nervous kid cannot double-submit |
| Invalid ID | Inline message: "We couldn't find that ID. Check it and try again." **Do not indicate whether the prefix or the number was wrong** — no hints for guessing |
| Rate-limited | "Too many attempts, wait a minute." This is the [ADR 002](KIT-02-Architecture-and-Data.md#adr-002--id-only-access-for-the-summer-portal) brute-force guard surfacing; the UI just has to show it gracefully |
| Valid | Set the cookie, redirect to `/summer/portal` |

**Open:** the prefix can be pre-filled and greyed so the child types only the suffix — but the format must be settled first (`SM26734` vs `SM26-734`, see [Document 2 §7.2](KIT-02-Architecture-and-Data.md#72-summer-id)).

### 5.2 Summer Portal — `/summer/portal`

**Who:** every summer student — **identical render for all of them.**
**Job:** answer "what am I doing today and where do I click."

```
+---------------------------------------------------------+
|  LOGO                                        Week 2      |
+---------------------------------------------------------+
|   Welcome to KIT Summer Camp                            |
|   Today: Tuesday, 10:00 AM                              |
|                                                         |
|   +-------------------------------------------------+   |
|   |  TODAY'S CLASS                                  |   |
|   |  Introduction to JavaScript Functions           |   |
|   |            [  Join Google Meet  ]               |   |
|   +-------------------------------------------------+   |
|                                                         |
|   ANNOUNCEMENTS                                         |
|   • Homework deadline moved to Friday                   |
|                                                         |
|   HOMEWORK                                              |
|   Design your first webpage    [ Download ]             |
|                                                         |
|   RESOURCES                                             |
|   [Slides] [Recording] [Starter Files] [Canva]         |
|                                                         |
|   SCHEDULE      Week 1 | Week 2 | Week 3                |
|                                                         |
|   NEED HELP?    WhatsApp • Email                        |
+---------------------------------------------------------+
```

No sidebar, no profile, no settings, no notifications, no personalisation. It reads one `summer_content` row and renders it.

**States**

| State | Behaviour |
|---|---|
| Loading | Skeleton cards. Do not render zeros then flash to real content |
| Class live now | "Today's Class" prominent, Join button active |
| No class today | Join card collapses to "No class today — see you [next class day]." **The Meet button must not sit there live and clickable when there is nothing to join** |
| Not yet published | Friendly holding state: "This week's materials are coming soon." **This is the one everyone forgets — the portal exists before admin has typed anything into it.** Backed by `summer_content.published` |
| Homework not posted | Hide the block entirely rather than showing an empty header |
| Expired/invalid cookie | Bounce to `/summer` |

**The Join Google Meet link is the single most important element on the page.** It should be the first thing the eye lands on when a class is live. Everything else is reference material.

### 5.3 Summer Portal — mobile

Same content, single column, ordered by urgency. Nothing removed.

```
Week 2
─────────────
Welcome / Today
─────────────
[ Join Google Meet ]   ← stays near top; it is the point
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

Order matters more on mobile than desktop — Join Meet must be reachable without scrolling during class time. Consider pinning it while a class is live.

---

## 6. Screen specifications — Admin

### 6.1 Dashboard home — `/admin`

```
+------------+------------------------------------------------+
| LOGO       |  [ Search ]              🔔    Admin ▾          |
|            +------------------------------------------------+
| Dashboard  |  Welcome, Ade                                  |
| Applications|                                               |
| Students   |  +-------------+ +-------------+ +---------+   |
| Teachers   |  | APPLICATIONS| | STUDENTS    | |TEACHERS |   |
| Summer     |  | 17 pending  | | 126 active  | |   8     |   |
| Courses    |  | [ Review ]  | |             | |         |   |
| Payments   |  +-------------+ +-------------+ +---------+   |
| Analytics  |                                                |
| Settings   |  +-------------+ +----------------------------+|
|            |  | SUMMER CAMP | | PAYMENTS                   ||
|            |  | 48 students | | ₦1,240,000                 ||
|            |  | Week 2      | |                            ||
|            |  +-------------+ +----------------------------+|
|            |                                                |
|            |  RECENT ACTIVITY                               |
|            |  • Parent registered David                     |
|            |  • Teacher uploaded homework                   |
+------------+------------------------------------------------+
```

**States:** loading (skeletons, never "0" flashing to real numbers) · **fresh install** (every counter legitimately zero — cards must read "No applications yet", not look broken; **this is day one of KIT, design for it**) · populated · stat-card-as-action (the "17 pending" card links straight to Applications filtered to pending).

**Quick Actions panel is deferred.** Every button in it links to a page still being built. Build it last, as links, once those pages exist.

### 6.2 Summer management — `/admin/summer`

The single control surface behind the Summer Portal. Everything students see comes from here. **This is the page that gets touched most during summer.**

```
+------------------------------------------------------------+
|  SUMMER MANAGEMENT                                         |
+------------------------------------------------------------+
|  Current Week:   [ Week 2 ▾ ]                              |
|                                                            |
|  Google Meet Link                                          |
|  [ https://meet.google.com/...            ]  [ Save ]      |
|                                                            |
|  ANNOUNCEMENTS                          [ + New ]          |
|  • Homework deadline moved to Friday      [edit][x]        |
|                                                            |
|  HOMEWORK                                                  |
|  Title: [ Design your first webpage ]                      |
|  [ Upload PDF ]                             [ Save ]       |
|                                                            |
|  RESOURCES                                                 |
|  [ + Upload File ] [ + Recording ] [ + Slides ]            |
|  • Slides.pdf                                 [x]          |
|                                                            |
|  SCHEDULE      Week 1 | Week 2 | Week 3   [ edit ]         |
|                                                            |
|  ROSTER                                                    |
|  [ Import CSV ]  [ Download CSV ]                          |
|  48 students in 2026 cohort                                |
+------------------------------------------------------------+
```

**States:** view · editing (unsaved changes flagged) · saving (per-section, button disabled) · **save success** ("Saved ✓" — the change is now live to every student immediately) · **save error** (the edit is preserved — **never silently discard what admin typed**) · CSV validating (preview parsed rows and counts of new/duplicate/malformed **before** committing) · CSV error (name the problem row, do not half-import).

**Because one save here changes what 48 children see instantly, a small "this is live" cue near save buttons is worth building.** It removes the "did that already go out?" doubt.

### 6.3 Applications — `/admin/applications`

```
+------------------------------------------------------------+
|  APPLICATIONS         [ All | Pending | Approved | Rejected]|
+------------------------------------------------------------+
|  Student  | Parent     | Course | Paid | Status  | Action   |
|-----------|------------|--------|------|---------|----------|
|  Joshua   | Mrs Okafor | WebDev | ✓    | Pending | [Review] |
+------------------------------------------------------------+

  Review drawer:
  +--------------------------------------------------+
  |  Joshua Okafor                                   |
  |  Parent: Mrs Okafor · okafor@email · 080…        |
  |  Course: Web Design    Age: 13                   |
  |  Payment: ₦27,000 · monthly · ref PSK_… ✓        |
  |     [ Approve ]              [ Reject ]          |
  +--------------------------------------------------+
```

**Approve flow — one click, five operations:**

```
Approve → create student
        → assign batch
        → generate KIT ID
        → send login email
        → mark approved
```

**States:** empty · list (default filter: Pending, the actionable set) · **payment unverified** (flag it; an application must not be approvable until Paystack has confirmed) · approving (async — show progress and **disable the button so it cannot fire twice and create two students**) · success (row moves to Approved, show the generated KIT ID) · **error** (say which step failed; **do not leave a half-created student** — the chain must be atomic or clearly recoverable) · reject (confirm first — it is a real family on the other end — with an optional reason).

### 6.4 Students — `/admin/students`

```
+------------------------------------------------------------+
|  STUDENTS                          [ Search name / ID ]     |
+------------------------------------------------------------+
|  Name    | KIT ID      | Course | Batch | Points | Enrolled |
|----------|-------------|--------|-------|--------|----------|
|  David A.| WD2601-0042 | WebDev | B-01  |  120   | Jun 12   |
+------------------------------------------------------------+

  Detail: [Profile] [Attendance] [Assignments] [Points]
          [Submissions] [Certificates]
```

**States:** empty ("No students yet" — true until the first approval) · list + search (matches name or KIT ID) · no results · per-tab empty states.

Admin is the only role with unrestricted student visibility, per [ADR 003](KIT-02-Architecture-and-Data.md#adr-003--role-based-access-via-supabase-rls).

**Note:** the Attendance and Certificates tabs have **no backing tables** — see [Document 2 §4.4](KIT-02-Architecture-and-Data.md#44-what-the-schema-still-lacks).

### 6.5 Teachers — `/admin/teachers`

```
|  Name     | Email     | Batch | Students | Resources |
|  Mr Chidi | chidi@…   | B-01  |   15     |    6      |
```

**States:** empty · list · add (name + email + batch) · edit/reassign batch.

### 6.6 Courses — `/admin/courses`

The source the marketing site's programme cards render from. Toggling a course live/coming-soon here changes the public site.

```
|  Web Development   Live         [ Edit ]  [ ● Live ]  |
|  Python            Coming Soon  [ Edit ]  [ ○ Soon ]  |
```

**States:** list · edit (title/description/track/**code**/price) · toggle status (immediately live on the public site) · new course.

This is why the marketing site can advertise courses before they exist — the "coming soon" pills are rows here with a status flag.

### 6.7 Analytics — `/admin/analytics`

```
|  Students: 126   Teachers: 8   Applications: 17   |
|  Revenue: ₦1,240,000    Completion Rate: 84%      |
```

**Five numbers is enough for v1.** Charts, cohort comparisons, and trends are a later phase — resist adding them now. States: loading · populated · **empty** (all zero on a fresh install — must not look broken).

### 6.8 Not yet specified — Phase 4

**Student Dashboard** and **Teacher Dashboard** are deliberately unspecified. They depend on the accounts/batch system Phases 2–3 build, and specifying them now means designing against a guessed data model rather than the built one.

At a glance, when the time comes:
- **Student:** their batch's unlocked resources, assignments to do and submit, their KIT points, batch top-5 leaderboard, class join
- **Teacher:** their one batch — run class, grade submissions, unlock resources, post announcements, **limited student info only**

---

## 7. Roadmap

### Phase 0 — Planning ✅

- [x] Architecture
- [x] Database schema (revised — see [Document 2 §4](KIT-02-Architecture-and-Data.md#4-the-schema))
- [x] ADRs 001–005
- [x] Wireframes for `/summer` and `/admin`

### Phase 1 — Marketing site 🔄

- [x] Home — hero, programmes, summer banner, why, student work, invite, enrol bar
- [x] About hero
- [ ] Full About page — mission, team, testimonials
- [x] Apply page — hero, form, sidebar, trust bar, CTA
- [x] Nav + Footer, cross-page section links, light footer with contact
- [ ] Contact page
- [ ] Wire programme cards to the `courses` table *(currently hardcoded arrays)*
- [ ] **Replace placeholder contact details** — [Document 1 §10.3](KIT-01-Product-and-Decisions.md#103-two-different-contact-identities)
- [ ] **Resolve the course catalogue** — [Document 1 §10.2](KIT-01-Product-and-Decisions.md#102-the-course-catalogue-does-not-agree-with-itself)

*Note: the old roadmap scoped the apply page as "form only, no payment yet." Payment has since been designed into the same flow, so Paystack moves into Phase 2 as originally planned but the form now expects it.*

### Phase 2 — Admissions

- [ ] Provision the Supabase project, apply the schema, enable RLS
- [ ] Server Action: validate → insert `applications` → init Paystack → return checkout URL
- [ ] `/api/paystack/webhook` with **signature verification and idempotency**
- [ ] Resend notification on new paid application
- [ ] Admin applications list + review drawer
- [ ] Approve chain: create student → assign batch → generate KIT ID → email login → mark approved *(atomic or recoverable)*
- [ ] **Migrate or re-collect the 50 Google Forms sign-ups** — [Document 1 §11.5](KIT-01-Product-and-Decisions.md#115-what-happens-to-the-50-google-forms-sign-ups)

### Phase 3 — Summer Portal

Sequenced ahead of the student platform because it is fully self-contained and has a hard seasonal deadline.

- [ ] ID-check Server Action
- [ ] **Rate limiting** — a hard requirement of [ADR 002](KIT-02-Architecture-and-Data.md#adr-002--id-only-access-for-the-summer-portal), currently unbuilt. The gate must not ship without it
- [ ] Signed cookie + `/summer/portal` guard
- [ ] Portal page reading `summer_content`, with every state in [§5.2](#52-summer-portal--summerportal)
- [ ] Admin summer management screen
- [ ] Roster CSV import with validation preview
- [ ] Summer ID generator (random suffix, DB-enforced uniqueness)

### Phase 4 — 12-week student platform

- [ ] Supabase Auth + `profiles`
- [ ] **Batch-scoped RLS policies on every table**, including column-restricted teacher views and locked-resource filtering *inside* the policy
- [ ] Student dashboard
- [ ] Teacher dashboard
- [ ] `attendance` table *(missing — needed for punctuality points)*
- [ ] Google Meet link distribution

### Phase 5 — KIT Points and leaderboard

- [ ] Ledger writes + cached-total maintenance **+ a reconciliation path**
- [ ] Batch top-5 student view
- [ ] Full admin leaderboard
- [ ] Certificate generation *(table missing)*

### Phase 6 — Live sandbox

Deferred until a real cohort has run on Phases 1–5. Highest complexity in the product, not launch-blocking, and building it before observing a real class means building against a guess. See [Document 1 §9.7](KIT-01-Product-and-Decisions.md#97-pushback-defer-the-live-sandbox-entirely).

---

## 8. Development workflow

### Local

```bash
npm install
cp .env.example .env.local     # add real keys from Phase 2 onward
npm run dev                    # http://localhost:3000
```

### Before pushing

```bash
npm run lint
npm run build                  # TypeScript check + compile
npx tsc --noEmit               # types only, faster
```

### Git

Branches: `feature/name`, `fix/issue`, `docs/update`.

Commits follow Conventional Commits, scoped where useful, with a body when the reasoning is not obvious from the subject:

```
fix(nav): make section links work from any page

Programs and Why Kit? only exist as sections on the homepage.
From any other page these were dead — plain #hash anchors with
no matching element and no navigation. Add useSectionLink hook.
```

One logical change per commit. A styling fix and a behaviour fix are two commits even when made in the same sitting.

### Deploy

Push to `main` → Vercel auto-deploys. Environment variables live in the Vercel dashboard, never in the repo. See [Document 2 §6.3](KIT-02-Architecture-and-Data.md#63-environment-variables) for the full list and which two must never leak.

---

## 9. Known issues and tech debt

Ordered by how much they matter.

### Blocking or user-facing

| Issue | Detail |
|---|---|
| **AI missing from the apply form** | The site and blueprint advertise AI as a launch course; a parent cannot select it. Live bug in a revenue path — [Doc 1 §10.2](KIT-01-Product-and-Decisions.md#102-the-course-catalogue-does-not-agree-with-itself) |
| **Placeholder contact details live in production** | `hello@kidsintech.africa` / `+234 802 123 4567` on the apply sidebar and footer. Marked `TODO(Ade)` — [Doc 1 §10.3](KIT-01-Product-and-Decisions.md#103-two-different-contact-identities) |
| **Social links go to `#anchor`** | Every footer social icon is a dead link |
| **Rate limiting unbuilt** | Required by ADR 002. The summer gate cannot ship without it |
| **Countdown hardcoded** | `const CLOSE = new Date(...)` in `SummerSection.tsx` needs updating per cohort — no real dates decided yet |

### Structural

| Issue | Detail |
|---|---|
| **Tailwind installed but unused** | All real styling is hand-written in `globals.css`. Either remove the dependency or decide it is intentional and document why — right now it is an unexplained 30kb of config |
| **`Ambient.jsx` is JavaScript** | The only non-TS file in a strict-TypeScript codebase |
| **Hardcoded data arrays** | Programmes, courses, and prices live in component constants. Phase 2 moves them to the `courses` table; the array shapes were designed for that swap |
| **No server-side validation** | Everything in `ApplicationForm` validates client-side only. Non-negotiable to fix before the form goes live |
| **No error boundaries** | No `error.tsx` or `not-found.tsx` anywhere |
| **No tests** | Acceptable at this stage. The Paystack webhook and the approve chain are the two places where the first tests should go — both handle money or create accounts |

### Fixed, recorded for context

| Was | Fix |
|---|---|
| `footer .wrap { padding: 0 var(--wrap) }` — `--wrap` was never defined, so footer padding silently collapsed to zero while every other section had a 32px gutter | Removed the override; `.wrap` already does this correctly |
| `.foot-nav` carried a duplicate dark gradient stacked on the footer's own | Removed |
| `.af` had no container rule at all — no padding, no background, no width constraint, rendering edge-to-edge | Wrapped in `.apply-form-card` |
| Nav/footer `#programs` and `#why` were dead links from every non-home page | `useSectionLink` |
| Hero stat card claimed 1,200+ students | Changed to the true `50+` |

---

## 10. Working on this project as an AI agent

Most work on KIT is done by AI agents against these documents. What follows is what actually produces good output here.

### Read first, in this order

1. **Document 1** if the task touches product, copy, pricing, or anything a parent will read
2. **Document 2** if it touches data, auth, payments, or security
3. **This document** for conventions, then **the actual file you are about to edit**

The last one is not optional. These documents drift; the code does not.

### The rules that matter most

**Do not fabricate.** No invented student numbers, testimonials, project screenshots, or metrics. If a real number is unavailable, use a true structural fact or leave a marked `TODO`. This has already caused one correction ([Doc 1 §9.2](KIT-01-Product-and-Decisions.md#92-pushback-do-not-advertise-1200-students)) and it is the fastest way to damage a business selling to parents.

**Push back when something is wrong.** Ade's explicit standing instruction is to challenge ideas and evaluate feasibility honestly rather than agree. Several of the best decisions in this project came from pushback — the stat card, the email-only submit, Paystack subscriptions, the enterprise stack. If a request has a flaw, say so **before** building it, then build what was asked if the answer is "do it anyway."

**Check current state before changing it.** View the component and the relevant `globals.css` section. Several bugs found here — the `--wrap` collapse, the duplicate footer gradient, the missing `.af` container — existed because someone edited without reading first.

**Make minimal changes.** Do not refactor unrelated code. Do not change colours, spacing, or type sizes unless asked.

**Fix the same bug everywhere it exists.** The section-link bug lived in both `Nav` and `Footer`. Fixing one and not the other would have been worse than fixing neither, because it would look done.

### The style of work Ade expects

- **Rapid MVPs** — 1–2 days, working software over complete software
- **Modular and extensible** — the data-array pattern exists so a component becomes a database read without restructuring
- **Cost-effective tooling** — free tiers where viable; that is why Supabase, Resend, and Vercel are the stack
- **Real users and iteration** over speculative completeness — this is the reasoning behind deferring the sandbox, deferring subscriptions, and sequencing summer ahead of the student platform

### What to deliver

1. **The files** — full paths, complete contents for new files, `str_replace`-style diffs for edits
2. **A commit message** in Conventional Commits, with a body when the reasoning is non-obvious. Split into per-change commits rather than one squashed blob unless asked otherwise
3. **What was assumed** — every decision made without asking, stated plainly
4. **What is still open** — blockers, placeholder data introduced, questions needing Ade

### When stuck

Ask. Do not guess at product decisions — pricing, ages, course names, contact details, and dates are all Ade's calls, and several are currently open ([Doc 1 §11](KIT-01-Product-and-Decisions.md#11-open-questions-requiring-a-decision)). Reference the specific section rather than asking open-endedly: *"§10.2 says AI is a launch course but the form doesn't offer it — should I add it, and what's its course code for the KIT ID?"* is answerable in ten seconds. *"What courses should we have?"* is not.

---

*End of documentation set. [Document 1 — Product & Decisions](KIT-01-Product-and-Decisions.md) · [Document 2 — Architecture & Data](KIT-02-Architecture-and-Data.md)*
