# KIT Project Documentation — Complete Reference

**Last updated:** 29 July 2026 (Day before launch)  
**Project:** KIT Port Harcourt — Kids' tech education platform  
**Status:** Summer 2026 (launch), 12-week program (planning)

---

## Documentation Files (Read in This Order)

### 📍 **START HERE**

#### 1. **01-MASTER-ROADMAP.md** (READ FIRST)
**Purpose:** Project overview, timeline, and strategic roadmap  
**Covers:**
- What KIT is (summer vs 12-week)
- Completed work (Phases 0–3) ✅
- Active builds (Phase 3.5–5) 🟠
- Known gaps (not blocking launch)
- Tech stack and conventions
- Immediate next steps (priority order)
- Full roadmap to 2027

**Who should read:** Everyone. This is the authoritative project status.

**Time:** 15 minutes

---

#### 2. **02-TECHNICAL-REFERENCE.md** (FOR DEVELOPERS)
**Purpose:** Deep technical manual for builders and debuggers  
**Covers:**
- Architecture at a glance (Next.js + Supabase)
- Two access models (summer cookie vs 12-week Auth)
- Database schema essentials (money handling, profiles, summer tables)
- Security rules (RLS, SECURITY DEFINER)
- Function signatures (verify in pg_proc)
- Storage & file buckets (signed URLs)
- Environment variables
- Common patterns & gotchas
- Deployment pipeline
- Monitoring & debugging
- Performance notes

**Who should read:** Developers, DevOps, database admins

**Time:** 20 minutes (skim first, refer back as needed)

**Critical sections to memorize:**
- All money is kobo (never naira in DB)
- profiles.user_id is the PK (not id)
- Cookies must be inside async functions (not module scope)
- SECURITY DEFINER functions pin search_path

---

#### 3. **03-ADMIN-OPERATIONS-MANUAL.md** (FOR ALFRED/OPERATORS)
**Purpose:** Day-to-day workflows and how to manage cohorts  
**Covers:**
- Summer cohort settings (dates, current week, live toggle)
- Weekly content publishing (resources, Meet link, publish workflow)
- Batch management (create, edit, delete)
- Student enrolment & KIT ID generation
- Applications & approvals (seat counting, payment checks)
- Homework grading (Google Classroom style)
- Courses & pricing
- Pre-launch checklist
- Weekly operations checklist
- Troubleshooting (students see "coming soon", Meet button gray, etc.)

**Who should read:** Alfred (founder), any ops person managing the platform

**Time:** 20 minutes

**Most important:** Remember to bump `current_week` every Monday morning!

---

#### 4. **04-DEPLOYMENT-AND-DOMAIN.md** (FOR DEPLOYMENT)
**Purpose:** Production deployment, domain migration, rollback procedures  
**Covers:**
- Pre-launch deployment checklist
- Launch day timeline
- Domain migration (when kit.ng is bought)
- SSL/TLS setup (auto-handled)
- Performance monitoring post-launch
- Rollback procedure (if something breaks)
- Emergency contacts & escalation
- Cost optimization tips

**Who should read:** DevOps, Alfred (deployment day), anyone managing domains

**Time:** 15 minutes

---

#### 5. **05-DEVELOPER-QUICK-START.md** (FOR NEW DEVS)
**Purpose:** Get a new developer up and running in 15 minutes  
**Covers:**
- Local setup (clone, install, env vars)
- Folder structure (where every file goes)
- Common tasks (add page, add component, fetch data, Server Action)
- Database workflow (migrations, queries)
- Styling guide (globals.css, brand tokens)
- Debugging tips
- Git workflow (PowerShell compatible)
- Testing locally (smoke test, manual flows)
- Common errors & fixes

**Who should read:** New developers (human or AI), onboarding checklist

**Time:** 15 minutes (reference as needed)

---

## Quick Navigation by Role

### 👨‍💼 **Founder / Manager (Alfred)**

**Read:**
1. 01-MASTER-ROADMAP (full project status)
2. 03-ADMIN-OPERATIONS-MANUAL (day-to-day workflows)
3. 04-DEPLOYMENT-AND-DOMAIN (launch checklist)

**Bookmark:** 03-ADMIN-OPERATIONS-MANUAL for recurring workflows (bumping current week, publishing content, grading homework)

---

### 👨‍💻 **Backend Developer (Building Features)**

**Read:**
1. 01-MASTER-ROADMAP (quick overview)
2. 02-TECHNICAL-REFERENCE (critical details)
3. 05-DEVELOPER-QUICK-START (local setup, common tasks)

**Bookmark:** 02-TECHNICAL-REFERENCE for security rules, function signatures, debugging

---

### 🤖 **AI Assistant (Claude / GPT)**

**Read:**
1. 01-MASTER-ROADMAP (understand project scope)
2. 02-TECHNICAL-REFERENCE (security rules, patterns, gotchas)
3. 05-DEVELOPER-QUICK-START (local workflow if building code)
4. 03-ADMIN-OPERATIONS-MANUAL (understand workflows you might implement)

**Critical to follow:**
- All money is **kobo** in database, never naira
- `profiles.user_id` is the PK
- Cookies only inside async functions
- RLS policies are NOT optional

---

### 🚀 **DevOps / Deployment Engineer**

**Read:**
1. 01-MASTER-ROADMAP (what's deployed)
2. 02-TECHNICAL-REFERENCE (sections: env vars, deployment pipeline, monitoring)
3. 04-DEPLOYMENT-AND-DOMAIN (full deployment guide)

**Bookmark:** 04-DEPLOYMENT-AND-DOMAIN (domain migration, rollback procedures)

---

## Key Facts (Memorize These)

### The Project
- **Two products:** Summer (3 weeks, no Auth) + 12-week (Saturdays, real Auth)
- **Launch:** 10 August 2026
- **Status:** Summer fully built ✅; 12-week schema ready, UI pending
- **Owner:** Alfred (solo founder)

### Money Handling
- **Stored in kobo (integer), never naira**
- Kobo = naira × 100
- Display does `/100`, storage never does
- Paystack confirms in kobo

### Database
- **19 migrations, all live**
- `profiles.user_id` is the PK (not `id`)
- RLS on every sensitive table
- SECURITY DEFINER functions pin `search_path`

### Deployment
- **Next.js 16 on Vercel**
- **Supabase (Postgres) on Supabase**
- Env baked at build time (redeploy after env changes)
- Paystack webhook required for payments to work

### Summer vs 12-Week
| Aspect | Summer | 12-Week |
|--------|--------|---------|
| Auth | Signed cookie (no account) | Supabase Auth |
| RLS | Via SECURITY DEFINER functions | Via RLS policies |
| Batches | One roster per cohort | Max 15 per batch (many batches per course) |
| KIT ID | SM26734 (summer-year-seq) | WD2601-0042 (course-year-cohort-seq) |

---

## Critical Gotchas (Don't Forget)

1. **Cookies outside request scope:** Module-level cookie reads fail. Move inside async.
2. **profiles.user_id is the PK:** Not `id`. Queries using `id` silently return nothing.
3. **All money is kobo:** Display logic does `/100`. Storage never does.
4. **Bump current_week Mondays:** Students see nothing new until you increment it.
5. **Redeploy after env changes:** Env vars are baked at build time.
6. **SECURITY DEFINER + search_path:** Functions must pin it or privilege escalation risk.
7. **Webhook URL in Paystack:** If not set, payments never mark as paid.

---

## File Sizes & Scope

| File | Size | Read Time | Purpose |
|------|------|-----------|---------|
| 01-MASTER-ROADMAP | 8 KB | 15 min | Project overview + roadmap |
| 02-TECHNICAL-REFERENCE | 14 KB | 20 min | Deep technical guide |
| 03-ADMIN-OPERATIONS | 10 KB | 20 min | Operational workflows |
| 04-DEPLOYMENT-AND-DOMAIN | 11 KB | 15 min | Launch + domain migration |
| 05-DEVELOPER-QUICK-START | 10 KB | 15 min | Onboarding + common tasks |

**Total:** ~53 KB (fully searchable, plain markdown)

---

## Version History

| Version | Date | What Changed |
|---------|------|--------------|
| 1.0 | 29 July 2026 | Initial consolidated documentation (consolidated from 14 older files) |

---

## How to Use This Documentation

### When Starting a Feature
1. Read 01-MASTER-ROADMAP (find the phase)
2. Read relevant sections of 02-TECHNICAL-REFERENCE
3. Check 05-DEVELOPER-QUICK-START for common patterns
4. Ask: "Does this match existing patterns?"

### When Debugging
1. Check 02-TECHNICAL-REFERENCE (Common errors & fixes section)
2. Run smoke test if database is involved
3. Check Vercel/Supabase logs
4. Refer to gotchas list above

### When Launching
1. Print 01-MASTER-ROADMAP
2. Follow 04-DEPLOYMENT-AND-DOMAIN checklist
3. Have emergency contacts ready
4. Monitor for 24 hours

### When Handing Off to Someone Else
1. Have them read this README
2. Have them read 01-MASTER-ROADMAP
3. Have them read the doc relevant to their role (see navigation above)
4. Have them run local setup from 05-DEVELOPER-QUICK-START
5. Pair program on first task

---

## Feedback & Updates

**This documentation is the source of truth.** If you find:
- **A gap:** Add it
- **An error:** Fix it immediately (this is production code documentation)
- **An outdated section:** Update the date and version number

**After each major release (summer launch, phase 4 start, etc.):**
- Update 01-MASTER-ROADMAP
- Update version history
- Date each file

---

## Related Resources

**Not in this doc but useful:**
- Supabase docs: https://supabase.com/docs
- Next.js docs: https://nextjs.org/docs
- Paystack docs: https://paystack.com/developers
- Vercel docs: https://vercel.com/docs

**Real files (not in this doc):**
- Database migrations: `migrations/` folder
- Smoke test: `db-tests/smoke_test.sql`
- Components: `components/` folder
- Server actions: `app/*/actions.ts` files

---

## Contact & Support

**Technical questions:** Refer to documentation first, then ask Alfred (alfredenyinna03@gmail.com)  
**Deployment issues:** Check 04-DEPLOYMENT-AND-DOMAIN, then contact DevOps  
**Operational questions:** See 03-ADMIN-OPERATIONS-MANUAL, then contact Alfred

---

**Last verified:** 29 July 2026 (day before launch)  
**Next review:** 15 August 2026 (post-launch retrospective)

---

## Summary: What You've Just Inherited

**You now have:**
- 📍 The complete project roadmap (past + future)
- 🔒 Security rules you MUST follow
- 🛠️ Technical patterns (money handling, auth, RLS)
- 📋 Operational procedures (admin workflows)
- 🚀 Deployment guides (local → production → domain)
- 👶 Developer onboarding (get up in 15 min)

**You're ready to:**
- Build features (know the patterns)
- Debug issues (know where to look)
- Deploy to production (follow the checklist)
- Hand off to someone else (this doc covers it)

**You MUST remember:**
1. All money is kobo
2. Bump current_week Mondays
3. profiles.user_id is the PK
4. Redeploy after env changes
5. Run smoke test after migrations

**Good luck!** 🚀

—Alfred & Claude
