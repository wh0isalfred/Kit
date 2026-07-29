# Developer Quick Start Guide

**For:** New developers or AI assistants picking up KIT
**Time to first build:** 15–20 minutes
**Prerequisites:** Node 18+, Supabase CLI or a Postgres client, git
**Last updated:** 29 July 2026 (session 7 — real folder structure, corrected auth-gate note)

---

## I. LOCAL SETUP (5 MINUTES)

### 1. Clone & Install

```bash
git clone https://github.com/wh0isalfred/Kit.git
cd Kit
npm install
```

### 2. Environment Variables

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

PAYSTACK_SECRET_KEY=sk_test_1234...
NEXT_PUBLIC_SITE_URL=http://localhost:3000

RESEND_API_KEY=re_test_1234...
```

### 3. Run Dev Server

```bash
npm run dev
# http://localhost:3000
```

### 4. Verify Setup

- [ ] Home page loads
- [ ] Apply form loads
- [ ] Admin dashboard loads at `/admin` (see note on the auth gate below — locally, if you're not signed in as an admin user, you'll be redirected to `/admin/login`, same as production)
- [ ] No console errors

---

## II. FOLDER STRUCTURE — THE REAL ONE

**Important correction from earlier revisions of this document:** the root app folder is `src/app/`, not `app/`. And the comment that used to sit above `admin/(protected)/` — `# Future: auth gate here` — was wrong. The gate exists, in `admin/(protected)/layout.tsx`, and it works: it checks `auth.getUser()` then `profiles.role === 'admin'`, redirecting to `/admin/login` otherwise. Every route nested under `(protected)/`, including the entire batch shell below, inherits that check — there's no second, redundant auth check inside the batch shell's own layout, by design (see doc 02 §II).

```
src/
├── proxy.ts
├── app/
│   ├── layout.tsx                       Root layout (nav, footer)
│   ├── globals.css                      Single CSS file — all styles, everywhere
│   ├── global.css                       (legacy — check before assuming which one is loaded)
│   │
│   ├── (marketing)/                     Route group: public site
│   │   ├── layout.tsx
│   │   ├── page.tsx                     Home
│   │   ├── about/page.tsx
│   │   ├── apply/
│   │   │   ├── page.tsx
│   │   │   ├── actions.ts
│   │   │   └── callback/page.tsx
│   │   └── refund-policy/page.tsx
│   │
│   ├── admin/
│   │   ├── layout.tsx                   Deliberately NO auth check here — see below
│   │   ├── login/
│   │   │   ├── page.tsx
│   │   │   └── AdminLoginForm.tsx
│   │   └── (protected)/                 Auth gate lives HERE, in this layout
│   │       ├── layout.tsx               ← the real gate: getUser() + role check
│   │       ├── AdminRail.tsx
│   │       ├── page.tsx                 Admin dashboard landing
│   │       ├── applications/
│   │       │   ├── actions.ts
│   │       │   ├── ApplicationRow.tsx
│   │       │   ├── ApplicationsView.tsx
│   │       │   └── page.tsx
│   │       └── summer/
│   │           ├── page.tsx             THE HUB — batches (primary) + cohort settings + collapsed shared resources
│   │           ├── actions.ts           Cohort/week-level Server Actions
│   │           ├── batch-actions.ts     Batch shell's main Server Actions file — see doc 02 §VII
│   │           ├── resource-actions.ts  Resource CRUD, batch-scoped variants — see doc 02 §VII
│   │           ├── BatchManagement.tsx  Batch cards + create/edit/delete forms
│   │           ├── SummerAdmin.tsx      Cohort settings + weekly content
│   │           ├── SummerResources.tsx  Cohort-level (shared-only) resource editor
│   │           ├── CollapsibleResources.tsx   Client wrapper that collapses SummerResources by default
│   │           ├── HomeworkReview.tsx   Assignment roster with inline grading — used by the By-Assignment view
│   │           ├── BatchSessionManager.tsx    LEGACY — no longer rendered anywhere; superseded by the Class tab
│   │           ├── GoLiveControl.tsx    LEGACY — built for the old cohort-wide live toggle; its visual design was
│   │           │                        reused for the Class tab's live toggle, but this file itself is unused
│   │           └── batch/
│   │               └── [batchId]/
│   │                   ├── layout.tsx           Header, tabs, seat/live computation for this batch
│   │                   ├── page.tsx             Redirects → /overview
│   │                   ├── BatchTabs.tsx        Tab nav, active-tab highlight, Homework grading-count badge
│   │                   ├── overview/page.tsx    Read-only summary
│   │                   ├── class/
│   │                   │   ├── page.tsx
│   │                   │   └── ClassSessionForm.tsx    Instructor, meet link, next class, live toggle
│   │                   ├── resources/
│   │                   │   ├── page.tsx
│   │                   │   └── BatchResourceList.tsx   Scoped resource list, Shared/Batch-only tagging
│   │                   └── homework/
│   │                       ├── page.tsx
│   │                       ├── HomeworkQueue.tsx        Segmented control: queue vs. by-assignment
│   │                       └── ByAssignmentView.tsx     Assignment picker, wraps HomeworkReview
│   │
│   ├── summer/                          /summer — the Summer ID gate (no auth session)
│   │   ├── page.tsx
│   │   ├── summer-session.ts            getSummerSession(), getSummerFileUrl(), turnInHomework(), etc.
│   │   └── SummerSignIn.tsx
│   │
│   ├── smportal/                        The shared student portal (post-gate)
│   │   ├── page.tsx
│   │   ├── PortalContent.tsx
│   │   ├── homework/
│   │   │   └── page.tsx                 The homework LIST — get_summer_resources + get_my_submissions
│   │   │       (Note: this file was rebuilt from scratch in session 7. It used to have
│   │   │       detail-page logic wrongly sitting at this path, which 404'd on every visit
│   │   │       because a [id]-shaped route param can't exist at a parent path.)
│   │   └── resources/
│   │       ├── page.tsx
│   │       └── ResourcesContent.tsx
│   │
│   └── api/
│       └── paystack/webhook/route.ts
│
├── components/
│   ├── apply/                           Application form pieces
│   ├── home/                            Marketing homepage sections
│   └── site/                            Nav, Footer, shared UI
│
└── lib/
    ├── courses.ts
    ├── database.types.ts
    ├── paystack.ts
    ├── summer.ts
    ├── email/resend.ts
    └── supabase/
        ├── admin.ts
        ├── middleware.ts
        └── server.ts                    createClient() — always await it

supabase/
├── config.toml
├── seed.sql
└── migrations/
    ├── 20260721000001–000012_*.sql      Foundational schema (12 files)
    ├── 0013–0026_*.sql                  Feature migrations, sequential
    └── -- 0019 · Live class indicator.sql   (note the unusual filename — a stray leading
                                              "-- " comment marker got saved as part of the
                                              filename itself; harmless but worth cleaning up)
```

**One honest gap in this section:** the tree above for `batch/[batchId]/*` is reconstructed from the actual build history of this session (every file listed was built, committed, and confirmed via a successful Vercel build), not from a fresh automated directory scan — the most recent `tree`/`Get-ChildItem` export available while writing this document didn't include that subtree at all, for reasons that weren't diagnosed. **If you're touching these files, confirm the exact paths yourself** rather than trusting this listing blindly, the same way everything else in this codebase should be verified rather than assumed.

---

## III. COMMON TASKS

### Add a New Page

```bash
mkdir src/app/team
touch src/app/team/page.tsx
```

```typescript
import Footer from "@/components/site/Footer";

export default function TeamPage() {
  return (
    <div className="page">
      <section>
        <div className="wrap">
          <h1>The Team</h1>
        </div>
      </section>
      <Footer />
    </div>
  );
}
```

### Fetch Data (Server Component)

```typescript
import { createClient } from "@/lib/supabase/server";

export default async function SomePage() {
  const supabase = await createClient(); // always await — it's a Promise
  const { data } = await supabase.from("courses").select("*").eq("status", "live");
  return <section>{data?.map((c) => <div key={c.id}>{c.title}</div>)}</section>;
}
```

### Write a Server Action — the pattern this codebase actually uses

Every mutation-side Server Action in the batch shell follows this shape: a typed `Result` union, an `assertAdmin()` gate at the top for mutations, `createClient()` alone for reads that already have an RPC-level gate.

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id) // NOT .eq("id", ...) — see doc 02
    .single();

  if (profile?.role !== "admin") throw new Error("Not authorised");
  return supabase;
}

type Result = { ok: true; id?: string } | { ok: false; error: string };

export async function doSomething(input: string): Promise<Result> {
  const supabase = await assertAdmin();
  const { error } = await supabase.from("some_table").insert({ value: input });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
```

For a read that wraps a SECURITY DEFINER RPC (which already checks `is_admin()` inside Postgres), skip `assertAdmin()` and just use `createClient()` — see `getHomeworkRoster` or `getGradingQueue` in `batch-actions.ts` for real examples.

### Editing a File With Edit History — read this before you patch anything

If a file has already been changed once this session (by you, a previous session, or another contributor), **ask for or view the complete current file before making further edits**, rather than describing a targeted diff to be applied by hand. This project hit the identical bug three separate times in one build — a type definition, a prop destructure, and a code block, each silently dropped while a person hand-merged a described change into a file whose exact current state wasn't fully visible. Each one cost a full build-and-deploy cycle to catch. It's slower to paste a whole file back and forth than a five-line diff, but it's categorically safer once a file has more than one round of history.

---

## IV. DATABASE WORKFLOW

```bash
# Pull latest schema
supabase db pull

# Local Postgres (Docker required)
supabase start
supabase migration up
supabase migration list

# New migration
supabase migration new add_new_column
# Edit the generated file, then:
supabase migration up
```

**Verifying a migration actually ran on the live database** — don't trust any document's claim, including this one:

```sql
-- Column exists?
SELECT column_name FROM information_schema.columns WHERE table_name = 'summer_resources';

-- Function exists, and with what signature?
SELECT proname, pg_get_functiondef(p.oid) FROM pg_proc p WHERE proname = 'get_grading_queue';
```

---

## V. STYLING GUIDE

**Golden rule:** everything lives in `globals.css`. No CSS modules, no Tailwind.

```css
.team-card {
  background: var(--paper);
  border: 1px solid var(--line);
  color: var(--ink);
}

@media (max-width: 768px) {
  .team-card { padding: 16px; }
}
```

### Brand Tokens

```css
:root {
  --navy: #1F2C4F;
  --ink: #1F2C4F;
  --muted: #5d6781;
  --faint: #97a0b5;
  --line: #e8ebf2;
  --paper: #fcfdff;
  --blue: #1999E4;
  --green: #25B290;
  --maxw: 1160px;
}
```

**Before writing new CSS, search the file first.** More than once during the batch shell build, classes that looked like they'd need to be invented already existed — built during an earlier, abandoned or unfinished attempt at a similar feature (the live-toggle styling for the Class tab, and the entire homework-list-page styling scheme, were both discovered this way, already fully built and just sitting unused). Grep before you write.

---

## VI. DEBUGGING TIPS

### "Page shows 'Page not found' but a file exists at that route"

Check whether the file is actually at *that exact path*, versus a same-named file for a nested dynamic route. `src/app/smportal/homework/[id]/page.tsx` does not serve `/smportal/homework` — that needs its own `page.tsx` directly in `homework/`. This exact mistake shipped once (see the note in section II above) and caused every visit to the parent path to 404 unconditionally.

### "cookies() outside request scope"

Move the cookie read inside an async function/component; it can't happen at module scope.

### "Object not found" from Supabase Storage

Could be a wrong bucket name, or an RLS denial — Storage returns the same message for both. Check the bucket name in the actual upload code first (cheap to rule out) before chasing RLS policies. See doc 02 §VI for the real bucket table (there is no bucket literally named `submissions`).

### Environment variable not found

`NEXT_PUBLIC_*` = bundled into the client. Anything else is server-only. Using a server-only var in a Client Component silently returns `undefined`.

---

## VII. GIT WORKFLOW (PowerShell)

```powershell
git status
git add .
git commit -m "feat: add team page"
git push origin main
git log --oneline -5
```

**Commit message rules:** start with a verb (feat/fix/chore/docs/refactor), no backticks, `$`, or double quotes — PowerShell's quoting breaks on them.

---

## VIII. TESTING LOCALLY

**Apply flow:** `/apply` → fill form → test card `4111 1111 1111 1111` → `/apply/callback` should succeed.

**Summer ID gate:** `/summer` → use a real Summer ID (`SELECT summer_id FROM summer_students LIMIT 1;`) → should set a signed cookie → `/smportal` should load.

**Admin / batch shell:** `/admin` (auth required — sign in first) → `/admin/summer` → open any batch → confirm all four tabs render → try the live toggle on Class → try Returning a test submission on Homework.

---

## IX. DEPLOYMENT

```bash
npm run build       # must succeed locally before pushing
git push origin main # Vercel auto-deploys
```

**If the build fails on a specific file and line**, read the error carefully — check you're not confusing two files with the same name in different directories (`page.tsx` appears dozens of times in this tree). If the error is a missing name (`Cannot find name 'X'`) in a file edited earlier this session, suspect a dropped piece from a hand-merged diff before suspecting new broken logic.

---

## X. COMMON ERRORS & FIXES

| Error | Cause | Fix |
|-------|-------|-----|
| `"Module not found: @/components/..."` | Import path wrong | Check the file's actual path — note `src/app`, not `app` |
| `"cookies() outside request scope"` | Cookie at module scope | Move inside an async function |
| `"function X does not exist"` | Wrong RPC arity/name, or migration not run | Verify against `pg_proc` directly — don't trust a doc |
| `"column X does not exist"` | Migration assumed but not run, or vice versa | Verify against `information_schema.columns` directly |
| `"Object not found"` (Storage) | Wrong bucket name OR RLS denial — indistinguishable from the message alone | Check the actual upload code's bucket name first |
| Route 404s even though a `page.tsx` exists somewhere nearby | The file is for a *different* route (often a `[id]` child route sitting at the parent path) | Check the file's exact folder location, not just its filename |
| `Cannot find name 'X'` at build time, in a file edited more than once this session | A piece dropped during manual diff merging | Ask for the complete current file; reconstruct rather than patch around it |
| Paystack webhook not firing | URL not registered, or registered but never actually tested | Update in Paystack dashboard, redeploy, **then run a real test transaction** |

---

**Still stuck?** Doc 02 (Technical Reference), Supabase docs, Next.js docs, or Alfred (alfredenyinna03@gmail.com).

**Last verified:** 29 July 2026 (session 7)
