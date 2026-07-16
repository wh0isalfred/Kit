# Roadmap

## Phase 0 — Planning
- [x] Architecture
- [x] Database schema
- [ ] Wireframes for /summer and /admin (only these two — the marketing site already has a working mockup)

## Phase 1 — Marketing Website
- [ ] Home (existing mockup, wired to `courses` table)
- [ ] Programs section (expand with Summer + coming-soon pills)
- [ ] About
- [ ] FAQ
- [ ] Apply page (form only, no payment yet)

## Phase 2 — Admissions
- [ ] Application form → Supabase
- [ ] Paystack integration
- [ ] Admin approval screen
- [ ] Student account + KIT ID creation on approval

## Phase 3 — Summer Portal
- [ ] ID-check server action + rate limiting
- [ ] Shared portal page (reads `summer_content`)
- [ ] Admin edit screen for `summer_content`
- [ ] Roster upload (`summer_students`)

## Phase 4 — 12-week Student Platform
- [ ] Student dashboard (resources, assignments, submissions)
- [ ] Teacher dashboard (grade, unlock resources, post announcements)
- [ ] Batch-scoped RLS policies

## Phase 5 — KIT Points + Leaderboard
- [ ] Points ledger + triggers
- [ ] Batch-scoped top-5 view (student-facing)
- [ ] Full leaderboard (admin-facing)

## Phase 6 — Live Sandbox
- [ ] Deferred until a real cohort is running on Phases 1–5. Highest complexity, not launch-blocking.

**Sequencing rationale:** Phase 3 (Summer Portal) is the most self-contained piece and the fastest path to something real students can use — it doesn't depend on the account/auth system that Phases 2 and 4 need.
