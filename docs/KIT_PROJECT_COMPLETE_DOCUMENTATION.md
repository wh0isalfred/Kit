# KIT Port Harcourt — Complete Project Documentation

**Last Updated:** July 2026  
**Project Status:** Phase 1 (Marketing Website) — In Progress  
**Built By:** Ade (Ademola Emmanuel Adegbola), Solo Builder with AI Agents  
**Contact:** hello@kit.ng | Port Harcourt, Nigeria

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Architecture & Design Decisions](#architecture--design-decisions)
5. [Code Style & Conventions](#code-style--conventions)
6. [Component Breakdown](#component-breakdown)
7. [Styling System](#styling-system)
8. [Routing & Pages](#routing--pages)
9. [Future Phases & Roadmap](#future-phases--roadmap)
10. [Development Workflow](#development-workflow)
11. [Deployment & Environment](#deployment--environment)
12. [Key Files Reference](#key-files-reference)
13. [AI Agent Work Instructions](#ai-agent-work-instructions)

---

## Project Overview

### Vision
KIT is a tech education platform for ages 10–16 in Port Harcourt, Nigeria. It empowers kids with real digital skills, the right mindset, and confidence to build solutions and shape Africa's future.

### Mission
"In 12 weeks, students move from passive consumers of technology to confident creators who understand how the digital world works and how to use it responsibly."

### Core Values
- **Future-Ready Skills:** Web Dev, Python, 3D Game Dev, AI Literacy
- **Hands-On Learning:** Real projects, live classes, mentorship
- **Confidence Building:** Small batches (max 15), real feedback, celebrations of wins
- **African Focus:** Grounded in Port Harcourt, building leaders for Africa

### Products

#### 1. **12-Week Future Skills Lab**
- **Target:** Ages 10–16 (two tracks: 10–12, 13–15)
- **Format:** Cohort-based, max 15 students per batch
- **Content:** Web Dev, Python, 3D Game Dev, AI Literacy (specialized tracks)
- **Assessment:** Live classes Saturdays, tasks Wednesdays, KIT Points leaderboard, certificates
- **Access:** Full Supabase Auth accounts, role-based dashboards (Student, Teacher, Admin)
- **Engagement:** KIT Points (earned for attendance, participation, grades), batch-scoped leaderboards, certificates

#### 2. **3-Week Summer Build Camp**
- **Target:** Ages 10–16, single cohort per year
- **Format:** Lightweight, no account creation needed
- **Content:** Web Dev + AI Literacy + Graphic Design, one shared curriculum
- **Access:** ID-only portal (Summer ID like `SM25734`), one shared page everyone reads
- **Prize:** ₦30,000 competition prize pool for winning projects
- **Enrollment:** Live countdown timer, rate-limited ID-check endpoint

---

## Technology Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** TailwindCSS v4 + custom globals.css with CSS variables
- **Fonts:** Plus Jakarta Sans (weight: 400, 500, 600, 700, 800) via next/font/google
- **Compiler:** React Compiler enabled (reactCompiler: true in next.config.ts)
- **Images:** next/image for LCP optimization, priority on hero images
- **Icons:** Inline SVG with stroke-based design (no external icon library)

### Backend & Data
- **Database:** Supabase (Postgres)
- **Auth:** Supabase Auth (12-week program) + ID-only cookies (Summer Portal)
- **Storage:** Supabase Storage (resources, certificates, recordings)
- **Row Level Security:** Enabled on all sensitive tables
- **API:** Server Actions + Route Handlers (no separate backend service)

### Payments
- **Provider:** Paystack
- **Use Cases:** Application fees, Summer enrollment (future Phase 2)

### Deployment
- **Host:** Vercel
- **Environment:** Auto-deploys on main branch push
- **Domain:** kit.ng (future), currently staging

### Development Tools
- **Package Manager:** npm (explicit in docs, not pnpm)
- **Node Version:** 18+ recommended
- **Linting:** ESLint (included in create-next-app)
- **Version Control:** Git (GitHub assumed)

---

## Project Structure

```
kit/
├── src/
│   ├── app/
│   │   ├── layout.tsx              ← Root layout (html, body, metadata, font loading)
│   │   ├── globals.css             ← All styling: design tokens, components, responsive
│   │   ├── page.tsx                ← Homepage: stacks all sections
│   │   ├── favicon.ico
│   │   │
│   │   └── about/
│   │       └── page.tsx            ← About page route
│   │
│   └── components/
│       ├── site/                   ← Shared across all pages
│       │   ├── Nav.tsx             ← Sticky navbar (client component)
│       │   ├── Footer.tsx          ← Footer with nav + socials
│       │   ├── Ambient.jsx         ← Fixed floating glyphs & orbs (presentational)
│       │   └── Reveal.tsx          ← Scroll-reveal wrapper (IntersectionObserver)
│       │
│       ├── home/                   ← Homepage sections only
│       │   ├── Hero.tsx            ← Hero: eyebrow, h1, CTA, features, image
│       │   ├── Programs.tsx        ← Data-driven 4-course grid
│       │   ├── SummerSection.tsx   ← Dark banner, live countdown, glow pulse
│       │   ├── WhyKit.tsx          ← Light panel, 4 gradient feature tiles
│       │   ├── StudentWork.tsx     ← 3D coverflow carousel (6 projects)
│       │   ├── Invite.tsx          ← "Begin at KIT" CTA section
│       │   └── EnrollBar.tsx       ← Fixed slide-up bar (scroll-triggered)
│       │
│       └── about/                  ← About page sections
│           └── AboutHero.tsx       ← About hero (image bg, text overlay, glyphs, quote)
│
├── public/
│   ├── logo.jpg                    ← 26×30, nav + footer brand mark
│   ├── heroImage.webp              ← 1402×1122, homepage hero right side
│   ├── summersectionImage.webp     ← 1907×825, summer banner background
│   ├── aboutHeroImage.webp         ← 520×540, about hero full background
│   └── work/                       ← (Future) student project screenshots
│
├── next.config.ts                  ← React Compiler enabled, no turbopack
├── tailwind.config.ts              ← TailwindCSS config (extends default)
├── tsconfig.json                   ← Strict TypeScript, path alias @/*
├── package.json                    ← Dependencies: next, react, react-dom, tailwindcss
├── .gitignore                      ← Standard Next.js
├── .env.example                    ← (Future) Supabase keys, Paystack keys
└── README.md                       ← Quick start guide

docs/
├── Architecture.md                 ← System design, routes, ADRs overview
├── Database.md                     ← Postgres schema (all tables, RLS)
├── Roadmap.md                      ← Phased build plan (Phase 1–6)
│
└── adr/                            ← Architecture Decision Records
    ├── 001-single-nextjs-supabase-app.md
    ├── 002-id-only-summer-auth.md
    ├── 003-role-based-access-rls.md
    ├── 004-kit-id-format.md
    └── 005-summer-id-format.md
```

---

## Architecture & Design Decisions

### ADR 001: Single Next.js App (No Monorepo, No Separate Backend)

**Rationale:** Solo builder using AI agents. Proven stack (AjoBook, SEE.COM, Bonsai). One codebase, one deploy, one bill.

**Decision:** Next.js App Router + Supabase + Paystack + Vercel.  
**Not:** NestJS/Railway/Neon/Prisma/Clerk/Turborepo (rejected as over-engineered for v1).

**Trade-off:** If KIT needs heavy concurrency, background jobs, or a native mobile app, peel out a service then — don't speculate now.

### ADR 002: ID-Only Access for Summer Portal

**Rationale:** Summer program content is shared (everyone reads the same page). No need for full account friction.

**Decision:** 
- Students enter Summer ID (e.g., `SM25734`) into a single field.
- Server action checks roster table.
- On match: short-lived signed cookie (12–24h) grants read access to `/summer/portal`.
- No Supabase Auth session created.

**Security:** 
- Summer IDs use random suffixes (not sequential) to prevent enumeration.
- ID-check endpoint is rate-limited per IP (prevents brute force on Meet link).

### ADR 003: Role-Based Access via Supabase RLS

**Rationale:** The 12-week platform has three roles (Admin, Teacher, Student) with different visibility. Enforce at database, not app layer.

**Decision:**
- `profiles` table (user_id, role, batch_id) keyed to auth.uid().
- Every sensitive table has RLS policies joining back to `profiles`.
- App-level filtering still happens (defense in depth), but database is the source of truth.

**Benefit:** A missed `WHERE` clause in one route can't leak another batch's data.

### ADR 004: KIT ID Format (12-Week Program)

**Format:** `[COURSE][YY][COHORT]-[NUMBER]`  
**Example:** `WD2601-0042`

- `WD` = Web Design (course code)
- `26` = enrollment year (2026)
- `01` = cohort number within that year
- `0042` = sequential student number within batch

**Generated:** Automatically on admission approval when student is placed in a batch.  
**Purpose:** Human-readable, context at a glance for admin/teachers.

### ADR 005: Summer ID Format

**Format:** `SM[YY][RANDOM3]`  
**Example:** `SM25734`

- `SM` = prefix
- `25` = year (2025)
- `734` = **randomly assigned** 3-digit suffix (not sequential)

**Rationale:** Unlike KIT ID (used behind auth), Summer ID is the only access credential. Can't be trivially guessable.

---

## Code Style & Conventions

### TypeScript
- **Strict Mode:** Yes (`compilerOptions.strict: true`)
- **Imports:** Use path alias `@/*` for `src/`
- **No `any`:** Always type explicitly. Use `unknown` if truly needed, then narrow.
- **Component Props:** Export `type ComponentNameProps` above component.

**Example:**
```tsx
import Link from "next/link";
import type { ReactNode } from "react";

type HeroProps = {
  title: string;
  subtitle: ReactNode;
  cta?: string;
};

export default function Hero({ title, subtitle, cta = "Learn More" }: HeroProps) {
  return <header>{/* ... */}</header>;
}
```

### React / Next.js Components

**Default:** Server components (no `"use client"`).  
**Client Only When:** State, effects, event listeners, IntersectionObserver, animations.

**Naming:**
- Components: PascalCase (e.g., `Hero.tsx`, `StudentWork.tsx`)
- Folders: kebab-case (e.g., `components/home/`, `components/site/`)
- Files: Always `.tsx` (never `.jsx` unless Ambient, and migrate that too)

**Pattern:** Data-driven components (Programs, WhyKit, StudentWork) have an array at the top:

```tsx
type Program = {
  slug: string;
  title: string;
  // ... fields
};

const programs: Program[] = [
  { slug: "web-dev", title: "Web Development", /* ... */ },
  // ...
];

export default function Programs() {
  return (
    <section>
      {programs.map((p) => (
        <Card key={p.slug} {...p} />
      ))}
    </section>
  );
}
```

**Benefit:** Adding a program = add object to array. No logic changes.

### Styling

**All CSS in one file:** `src/app/globals.css` (no CSS modules, no Tailwind @apply abuse).

**Structure:**
```css
/* Design tokens (color, spacing, shadows) */
:root {
  --navy: #1F2C4F;
  --blue: #1999E4;
  /* ... */
}

/* Reset and global setup */
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { /* ... */ }

/* Component sections (clearly marked) */
/* ================= HERO ================= */
.hero { /* ... */ }
.hero h1 { /* ... */ }

/* Responsive media queries at the end of each section */
@media (max-width: 900px) { .hero { /* ... */ } }
```

**Naming:** BEM-inspired, but flat (no nesting in CSS).
- `.hero` — component
- `.hero-in` — inner wrapper
- `.hero-copy` — specific child
- `.hero-cta` — nested element

**No Tailwind Classes in HTML** (except for one-off utilities). Use global CSS classes.

**Responsive Breakpoints:**
- `1100px` — Large desktop → tablets
- `900px` — Tablet → mobile
- `760px` — Mobile landscape → portrait
- `560px` — Very small mobile

---

## Component Breakdown

### Shared Components (`components/site/`)

#### **Nav.tsx** (Client Component)
- Sticky navbar with centered links + logo (left) + Apply/Login (right)
- Hamburger menu on mobile (<900px)
- Links: Programs, About, How It Works, FAQ
- Menu auto-closes on link tap or logo click

**Key Props:** None (hard-coded links for now).

#### **Footer.tsx** (Server Component)
- Logo + copyright (left)
- Nav links (center): Programs, About, How It Works, FAQ, Contact
- Social icons (right): Instagram, Twitter, YouTube, Gmail
- Dark blue gradient background
- Responsive: stacks on mobile

**Note:** Social links currently point to `#anchor`. Update `href` values to real URLs (Instagram profile, Twitter handle, etc.) once ready.

#### **Reveal.tsx** (Client Component)
- IntersectionObserver wrapper for scroll-triggered fade-in
- Threshold: 14% (fires when 14% of element enters viewport)
- Unobserves after first trigger (no repeated animations)
- Usage: Wrap any section to fade in on scroll

```tsx
<Reveal className="my-custom-class">
  <h2>This fades in</h2>
</Reveal>
```

#### **Ambient.jsx** (Presentational)
- Fixed floating glyphs (14 SVG icons) + 3 orbs
- Purely visual, no interactivity (`aria-hidden="true"`)
- Drifts with keyframe animations
- Respects `prefers-reduced-motion`
- **TODO:** Migrate to TypeScript (currently `.jsx`)

### Homepage Components (`components/home/`)

#### **Hero.tsx** (Server Component)
- Two-column layout: copy (left) + image (right)
- Eyebrow + h1 with gradient emphasis + body text
- CTA buttons: "Explore Programs" (primary) + "Apply Now" (outline)
- Feature row: 3 icons + labels (Live Classes, Real Projects, Bright Futures)
- Hero image: `/heroImage.webp` (1402×1122)
- Responsive: stacks to single column on mobile

#### **Programs.tsx** (Server Component)
- **Data-driven:** Array of 4 programs (Web Dev, Python, 3D Game Dev, Summer)
- 4-column grid, each wrapped in `<Reveal>`
- Per-card accent color drives icon tint + duration text + link color
- "Popular" badge on Summer Camp card
- Edit by modifying `programs` array at top

#### **SummerSection.tsx** (Client Component)
- Full-width dark banner with background image (`/summersectionImage.webp`, 1907×825)
- Dark overlay gradient (left opaque, fades transparent right)
- Badge: "Happening this August!"
- H2: "KIT Summer Tech Camp 2026" (uppercase)
- **Live countdown:** 4 counters (Days/Hours/Minutes/Seconds)
- Green button: "Reserve Your Spot" with glow shadow
- Pulse animation (every 3.8s) — disabled for `prefers-reduced-motion`
- **To update:** Edit `const CLOSE = new Date(...)` for next cohort

#### **WhyKit.tsx** (Server Component)
- **Data-driven:** Array of 4 features (green, blue, purple, teal)
- Left: dark navy intro (eyebrow, h2, body, "Learn More" link)
- Right: 4-column grid with gradient icon tiles
- Each card: accent color, icon, title, description
- Edit by modifying `features` array at top

#### **StudentWork.tsx** (Client Component)
- **3D Coverflow carousel:** 6 items with perspective transforms
- Auto-rotates every 2.8s (pauses on hover)
- Center card: full width (380px), flat, fully opaque
- Side cards: rotate ±34deg, shrink, dim
- Controls: Prev/Next arrows + dot indicators (6 dots)
- **Currently:** Gradient placeholders (no real student work yet)
- **Future:** Add `image` field to items; render screenshots when available
- Responsive: card width 380px → 280px on mobile

#### **Invite.tsx** (Server Component)
- Navy rounded card with gradient overlay
- Eyebrow: "Admissions open"
- H2: "Begin at KIT."
- Copy: family-focused, low-pressure tone
- Button: "Apply to KIT" with arrow
- Wrapped in `<Reveal>` for scroll-trigger fade-in

#### **EnrollBar.tsx** (Client Component)
- Fixed to bottom right, slides up from below viewport
- Triggers after 500px scroll
- Dismissible: × button (closes for session; future: cookie persistence)
- Dark navy background + green-accented button ("Reserve a spot")
- Rocket emoji + enrollment copy + "Limited seats" note
- Responsive: wraps to full-width button on mobile
- Respects `prefers-reduced-motion`

### About Page Components (`components/about/`)

#### **AboutHero.tsx** (Server Component)
- **Image as full hero background:** `/aboutHeroImage.webp` (no edits, no blur, no overlay)
- Text overlaid on left side, left-aligned
- Eyebrow: "ABOUT KIT" (cyan)
- H1: "Building confidence. Creating possibilities." (last line gradient cyan→purple)
- Body: Mission statement
- Quote box (right side, absolutely positioned): "We don't just teach tech. We help kids believe in what they can build."
- **8 floating glyphs** scattered across (stars, arrows, icons) with drift animations
- Responsive: quote moves below content on mobile

---

## Styling System

### Design Tokens (CSS Variables in globals.css)

```css
:root {
  --navy:    #1F2C4F;   /* Primary dark, nav/footer */
  --navy-2:  #16203b;   /* Gradient dark */
  --blue:    #1999E4;   /* Primary accent, CTAs */
  --green:   #25B290;   /* Success, secondary accent */
  --ink:     #1F2C4F;   /* Text dark */
  --muted:   #5d6781;   /* Text secondary */
  --faint:   #97a0b5;   /* Text tertiary */
  --paper:   #fcfdff;   /* Background light */
  --line:    #e8ebf2;   /* Borders, dividers */
  
  --maxw:    1160px;    /* Max layout width */
  --wrap:    32px;      /* Horizontal padding */
}
```

### Typography

**Family:** Plus Jakarta Sans (weights: 400, 500, 600, 700, 800)

**Scale:**
- Hero h1: 62px, weight 800, line-height 1.03
- Section h2: 34–40px, weight 800, line-height 1.12–1.16
- Feature titles: 16–18px, weight 600
- Body: 15.5–16px, weight 400, line-height 1.55–1.68

**Letter-spacing:** Headlines −0.03 to −0.04em (tight), body 0 (natural).

### Colors in Use

**Primary Actions:** Blue (`#1999E4`)  
**Secondary Actions:** Green (`#25B290`)  
**Hover State:** Opacity 0.8 (fade) or color shift  
**Accents:** Gradients (cyan→purple, green→teal, etc.)  
**Text:** Navy (dark), Muted (secondary), Faint (tertiary)

### Spacing

- **Section vertical:** 84px top/bottom
- **Card gap:** 22–28px
- **Button gap:** 16px
- **Feature gap:** 32–48px
- **Border radius:** Panels 26–30px, cards 20px, icons 13–15px

### Shadows

```css
box-shadow: 0 30px 60px -30px rgba(31, 44, 79, 0.4);
filter: drop-shadow(0 40px 80px -20px rgba(6, 182, 212, 0.25));
```

### Animations

**Reveal fade-in:** opacity 0 → 1 over 600ms on scroll  
**Glyph drift:** translateY(-18px) + rotate(6deg) at 50% keyframe, 19–26s duration  
**Pulse glow:** opacity 1 → 0.6 → 1 every 3.8s (Summer section)  
**Carousel auto-rotate:** 2.8s per item  
**Menu slide:** max-height transition on hamburger toggle

---

## Routing & Pages

### Current Routes

| Route | Component | Status | Notes |
|-------|-----------|--------|-------|
| `/` | `app/page.tsx` → Homepage sections | ✅ Complete | Stacks Hero, Programs, Summer, WhyKit, StudentWork, Invite, EnrollBar |
| `/about` | `app/about/page.tsx` → AboutHero | ✅ Complete | About hero section (image bg, text overlay, quote) |
| `/apply` | Not yet built | 📋 Phase 2 | Application form (no payment yet) |
| `/login` | Not yet built | 📋 Phase 4 | Student/Teacher/Admin auth |
| `/summer` | Not yet built | 📋 Phase 3 | ID-only Summer Portal |
| `/summer/portal` | Not yet built | 📋 Phase 3 | Shared Summer content page (once logged in via ID) |

### Navigation Links (in Nav + Footer)

**Header Nav:**
- Programs → `#programs` (scroll to Programs section)
- About → `/about`
- How It Works → `#why` (scroll to WhyKit section)
- FAQ → `#faq` (doesn't exist yet, parked)
- Apply → `/apply` (TBD)

**Footer Nav:**
- Same as header, plus Contact → `/contact` (TBD)

**CTA Buttons:**
- "Explore Programs" → `/apply`
- "Apply Now" → `/apply`
- "Apply to KIT" → `/apply`
- "Reserve Your Spot" → `/apply`

---

## Future Phases & Roadmap

### Phase 1 ✅ (Current)
**Marketing Website**
- [x] Home (hero, programs, why, summer, showcase, invite, enroll bar)
- [x] About (hero section)
- [ ] Full About page (mission, team, testimonials, FAQs)
- [ ] FAQ page (standalone)
- [ ] Apply page (form only, no payment)

### Phase 2 (Next)
**Admissions & Payments**
- [ ] Application form → Supabase
- [ ] Paystack integration
- [ ] Admin approval screen
- [ ] Student account + KIT ID creation on approval
- [ ] Email confirmations (Resend or Supabase Auth email)

### Phase 3
**Summer Portal** (prioritized over Phase 4 — no auth dependency)
- [ ] ID-check server action + rate limiting
- [ ] Shared portal page (reads `summer_content` table)
- [ ] Admin edit screen for `summer_content`
- [ ] Summer student roster upload
- [ ] Live countdown + enrollment close logic

### Phase 4
**12-Week Student Platform**
- [ ] Student dashboard (resources, assignments, submissions)
- [ ] Teacher dashboard (grade, unlock resources, announcements)
- [ ] Batch-scoped RLS policies verified
- [ ] Live class integration (Google Meet links)

### Phase 5
**KIT Points & Leaderboard**
- [ ] Points ledger table + triggers
- [ ] Batch-scoped top-5 view (student-facing)
- [ ] Full leaderboard (admin-facing)
- [ ] Prize logic (end-of-program)

### Phase 6
**Live Sandbox** (deferred, highest complexity, not launch-blocking)
- [ ] Browser-based code editor
- [ ] Execution environment (e.g., Piston, Replit API, or custom)
- [ ] Real-time collaboration (WebSocket or similar)

**Rationale:** Phases 1–5 ship before Sandbox. Run a real cohort on Phases 1–5. Only build Sandbox once you know the use case from actual students.

---

## Development Workflow

### Running Locally

```bash
# Install dependencies
npm install

# Create .env.local (copy .env.example, add real keys when Phase 2+ start)
cp .env.example .env.local

# Start dev server
npm run dev

# Open http://localhost:3000
```

### Building & Testing

```bash
# Build (TypeScript check + Next.js compile)
npm run build

# Linting (ESLint)
npm run lint

# Type checking
npx tsc --noEmit
```

### Git Workflow

**Branch naming:** `feature/name`, `fix/issue`, `docs/update`

**Commit messages:** Follow Conventional Commits

```
feat: add student work carousel with 3D coverflow
fix: remove gray background from footer nav
docs: update README with deployment steps
refactor: extract button styles to globals.css
style: fix mobile responsiveness on hero section
```

**Before pushing:**
```bash
npm run lint
npm run build
# Verify no TypeScript errors
```

**Deploy:** Push to `main` → Vercel auto-deploys

---

## Deployment & Environment

### Vercel

**Project:** kit.ng (or staging URL)  
**Auto-deploy:** On `main` branch push  
**Environment Variables:** Set in Vercel dashboard (not in .env.local)

**Variables needed (Phase 2+):**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx (server-only)
NEXT_PUBLIC_PAYSTACK_KEY=pk_live_xxx (Phase 2)
```

### Supabase (Future)

**To set up** (when Phase 2 starts):
1. Create Supabase project
2. Create tables per `docs/Database.md`
3. Enable RLS on sensitive tables
4. Generate API keys (anon + service role)
5. Add to `.env.local` and Vercel

### Images & Assets

**Public folder:**
- `logo.jpg` (26×30) — used in Nav, Footer
- `heroImage.webp` (1402×1122) — Homepage hero
- `summersectionImage.webp` (1907×825) — Summer banner
- `aboutHeroImage.webp` (520×540) — About hero background
- `work/*.webp` (future) — Student project screenshots

**Optimization:** Use `next/image` with `priority` on LCP images (Hero, SummerSection, AboutHero).

---

## Key Files Reference

### Core Files

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root HTML setup, font loading, metadata |
| `src/app/globals.css` | **All styling** — design tokens, components, responsive |
| `src/app/page.tsx` | Homepage route — composes sections |
| `src/app/about/page.tsx` | About page route |
| `next.config.ts` | React Compiler + build config |
| `tsconfig.json` | TypeScript strict mode, path aliases |

### Component Files

| File | Type | Purpose |
|------|------|---------|
| `components/site/Nav.tsx` | Client | Sticky header navbar |
| `components/site/Footer.tsx` | Server | Footer with nav + socials |
| `components/site/Reveal.tsx` | Client | Scroll-reveal wrapper |
| `components/site/Ambient.jsx` | Static | Floating glyphs + orbs |
| `components/home/Hero.tsx` | Server | Homepage hero |
| `components/home/Programs.tsx` | Server | 4-program grid |
| `components/home/SummerSection.tsx` | Client | Summer banner + countdown |
| `components/home/WhyKit.tsx` | Server | Feature tiles |
| `components/home/StudentWork.tsx` | Client | Coverflow carousel |
| `components/home/Invite.tsx` | Server | CTA section |
| `components/home/EnrollBar.tsx` | Client | Fixed enrollment bar |
| `components/about/AboutHero.tsx` | Server | About hero |

### Documentation Files

| File | Content |
|------|---------|
| `docs/Architecture.md` | System design, routes, ADRs overview |
| `docs/Database.md` | Postgres schema for all phases |
| `docs/Roadmap.md` | Phased build plan with sequencing |
| `docs/adr/*.md` | Architecture Decision Records (001–005) |

---

## AI Agent Work Instructions

### How to Work on This Project

If you're a new AI agent (Claude, ChatGPT, Cursor, etc.), follow this:

#### **1. Read This Document First**
- Understand the vision, stack, structure, and conventions.
- Review the component breakdown.
- Familiarize yourself with the styling system.

#### **2. Ask Clarifying Questions**
- **Never assume.** If the request is ambiguous, ask.
- Clarify: scope, acceptance criteria, design direction, mobile behavior.
- Example: "Should the footer be full-width or contained? Dark or light?"

#### **3. Check Current State**
- View relevant components and `globals.css` before making changes.
- Understand what exists; don't duplicate or break.

#### **4. Follow Code Style**
- **TypeScript:** Strict mode, explicit types, no `any`.
- **React:** Server components by default; client only when needed (`"use client"`).
- **Styling:** CSS in `globals.css`; use CSS classes, not Tailwind in JSX.
- **Naming:** PascalCase components, kebab-case folders, BEM-style CSS classes.

#### **5. Responsive Design**
- Always include mobile breakpoints (900px, 760px, 560px).
- Test mentally at desktop, tablet, and mobile.
- Use `max-width`, `flex-wrap`, media queries.

#### **6. Make Minimal Changes**
- Edit only what's needed.
- Don't refactor unrelated code.
- Don't change colors, spacing, or font sizes unless explicitly asked.

#### **7. Data-Driven When Possible**
- If a component shows a list, put data in an array at the top.
- Makes it easy to add/remove items without touching logic.

#### **8. Commit & Communication**

**After finishing, provide:**

**A. The Code Files**
- List files created/modified with full paths.
- Paste complete code for new files.
- Use `str_replace` format for edits:
  ```
  OLD_CODE (exact match)
  →
  NEW_CODE
  ```

**B. A Commit Message** (Conventional Commits format)
```
feat: add responsive footer redesign with social icons

- Horizontal layout on desktop (logo, nav, socials)
- Stacks vertically on mobile for touch-friendly spacing
- White text on dark blue gradient background
- Responsive breakpoints at 1024px, 900px, 768px, 480px
```

**C. Testing Notes**
- "Tested on desktop (1280px), tablet (768px), mobile (390px)"
- "Checked nav links, button hovers, responsive stacking"
- "No TypeScript errors, builds successfully"

**D. Any Blockers or Questions**
- "Need Paystack API key to test payment flow (Phase 2)"
- "Summer countdown date hardcoded to Aug 1, 2026 — update per cohort"

#### **9. If Stuck**
- **No guessing.** Ask the human (Ade) for clarification.
- Reference this document and specific sections.
- Example: "Per globals.css, the breakpoint is 900px — should the footer stack here?"

---

## Quick Reference: Component Update Patterns

### Adding a New Program (Programs.tsx)

Edit the `programs` array at the top:
```tsx
const programs: Program[] = [
  {
    slug: "robotics",
    title: "Robotics & IoT",
    duration: "12-Week Academy",
    description: "Build smart devices...",
    accent: "amber",  // Choose: blue, green, purple, amber
    icon: "robot",    // Add icon case in ProgramIcon
    href: "/programs/robotics",
    cta: "Learn More",
    badge: undefined  // or "Coming Soon"
  },
  // ...
];
```

### Adding a New Feature (WhyKit.tsx)

Edit the `features` array:
```tsx
const features: Feature[] = [
  {
    key: "community",
    accent: "green",  // Choose: green, blue, purple, teal
    icon: "users",    // Add icon case in FeatureIcon
    title: "Supportive Community",
    desc: "Learn alongside peers..."
  },
  // ...
];
```

### Adding a Student Project (StudentWork.tsx)

Edit the `works` array (currently gradients, add `image` field when ready):
```tsx
type Work = { 
  key: string; 
  label: string; 
  from: string; 
  to: string;
  image?: string;  // Future: path to screenshot
};

const works: Work[] = [
  {
    key: "ecommerce",
    label: "E-commerce Store",
    from: "#1e3a8a",
    to: "#2f7ff0",
    image: undefined  // When you have real projects: "/work/ecommerce.webp"
  },
  // ...
];
```

---

## Common Tasks & How to Approach Them

### Task: Fix a Layout Issue on Mobile

1. **Identify the breakpoint:** Which media query applies? (900px, 760px, 560px?)
2. **Find the CSS:** Locate the component's responsive section in globals.css.
3. **Check spacing:** Adjust padding, margin, gap, font-size.
4. **Test:** Verify at the target viewport width.
5. **Commit:** `fix: improve [component] mobile layout at [breakpoint]px`

### Task: Update a Section's Color Scheme

1. **Don't change CSS variables** (--navy, --blue, etc.) — they're global.
2. **Add inline hex colors** to the specific component's CSS section if needed.
3. **Or use a new gradient** if adding a unique section.
4. **Commit:** `style: update [section] colors to match [design]`

### Task: Make a Component Responsive

1. **Plan breakpoints:** Mobile-first? Or desktop-first with media queries?
2. **Add media queries** at the end of the component's CSS section.
3. **Test at each breakpoint:** 1100px, 900px, 760px, 560px.
4. **Verify touch targets** on mobile (min 44px height/width for buttons).
5. **Commit:** `refactor: improve [component] responsive design`

### Task: Wire a Component to Real Data (Future — Phase 2+)

1. **Check Database.md** for table schema.
2. **Create a Server Action** (`"use server"` file in `src/app/actions/`)
3. **Fetch from Supabase** in the action.
4. **Pass data as props** to the component.
5. **Component renders** the data (no logic, just presentation).
6. **Commit:** `feat: wire [component] to [table] data`

---

## Troubleshooting

### "Build fails with TypeScript errors"
- Check `tsconfig.json` (strict: true).
- Ensure all component props are typed.
- Use `npm run build` to see full errors.

### "Mobile layout looks broken"
- Check responsive CSS in globals.css.
- Verify `max-width: 100%` on `html`/`body` (prevents horizontal scroll).
- Test at exact breakpoint widths (900px, 760px, 560px).

### "Nav/Footer not showing"
- Ensure `src/app/page.tsx` imports and composes them.
- Check that components are exported as default.

### "Styles not applying"
- Ensure CSS class matches component className.
- Check for typos in class names (CSS is case-sensitive).
- Verify CSS is in `globals.css`, not a separate file.

### "Image not loading"
- Check file exists in `public/` folder.
- Verify file extension matches (e.g., `.webp`, not `.png`).
- For `next/image`, ensure `width` and `height` are set.

---

## Summary: What Makes KIT Different

1. **Solo builder + AI agents:** Everything is architected for rapid iteration, not team handoff.
2. **Single app, one deployment:** No monorepo, no separate backend. Vercel auto-deploys.
3. **Data-driven components:** Adding a program/feature = edit an array, not code.
4. **TypeScript strict mode:** No surprises at runtime.
5. **All styling in one file:** Design tokens + components + responsive in `globals.css`.
6. **Two access models:** Real auth (12-week) vs. ID-only (Summer) — each optimized for its use case.
7. **Responsive by design:** Mobile-first thinking, tested at 5 breakpoints.
8. **No over-engineering:** Supabase, not NestJS. Vercel, not a custom server. Paystack, not Stripe.

---

## Final Checklist Before Asking for Help

- [ ] Read this entire document.
- [ ] Understand the architecture (ADRs 001–005).
- [ ] Review the component you're working on.
- [ ] Check `globals.css` for relevant styles.
- [ ] Verify the task is in scope for the current phase.
- [ ] Test changes locally (`npm run dev`).
- [ ] Run TypeScript check and ESLint.
- [ ] Write a clear commit message.
- [ ] Provide code files and testing notes.

---

## Contact & Support

**Project Owner:** Ade (Ademola Emmanuel Adegbola)  
**Email:** hello@kit.ng  
**Location:** Port Harcourt, Nigeria  
**GitHub:** [Adegbola Industries]  

**For questions or blockers:** Reference this document + the relevant ADR/component, then ask.

---

**Document Version:** 1.0  
**Last Updated:** July 2026  
**Next Review:** When Phase 2 (Admissions) starts
