# Developer Quick Start Guide

**For:** New developers or AI assistants picking up KIT  
**Time to first build:** 15 minutes  
**Prerequisites:** Node 18+, PostgreSQL client (or Supabase CLI), git

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
# Supabase (get from Supabase project settings)
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...  # anon key
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # service-role key (KEEP SECRET)

# Payments (Paystack test keys)
PAYSTACK_SECRET_KEY=sk_test_1234...  # https://dashboard.paystack.com
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Email (not yet wired, but set to avoid errors)
RESEND_API_KEY=re_test_1234...  # https://resend.com/api-keys
```

### 3. Run Dev Server

```bash
npm run dev
# Opens http://localhost:3000
```

### 4. Verify Setup

- [ ] Home page loads
- [ ] Apply form loads
- [ ] Admin dashboard loads (no auth required locally)
- [ ] No console errors

---

## II. FOLDER STRUCTURE

```
Kit/
├── app/                          # Next.js App Router
│   ├── (marketing)/              # Route group: home, about, apply
│   │   ├── page.tsx              # Home
│   │   ├── about/
│   │   ├── apply/
│   │   └── refund-policy/
│   │
│   ├── admin/                    # /admin routes (no auth gate — test env only!)
│   │   └── (protected)/          # Future: auth gate here
│   │       ├── summer/
│   │       ├── applications/
│   │       └── layout.tsx
│   │
│   ├── summer/                   # /summer (ID gate)
│   │   └── page.tsx
│   │
│   ├── smportal/                 # /smportal (shared student portal)
│   │   └── page.tsx
│   │
│   ├── api/                      # API routes
│   │   ├── paystack/
│   │   │   └── webhook/
│   │   └── resend/
│   │
│   ├── layout.tsx                # Root layout (nav, footer)
│   ├── globals.css               # Single CSS file (all styles)
│   └── page.tsx                  # / route
│
├── components/
│   ├── site/                     # Reusable components (Header, Footer, etc.)
│   ├── admin/                    # Admin-specific components
│   └── forms/                    # Form components
│
├── lib/
│   ├── supabase.ts               # Supabase client (server + browser)
│   ├── email/                    # Email templates + Resend integration
│   ├── summer.ts                 # Summer-specific helpers (ID gate, etc.)
│   └── utils.ts                  # General utilities
│
├── migrations/                   # Supabase migrations (19 total)
│   ├── 20260721000001_*.sql
│   ├── 20260722000002_*.sql
│   └── ...
│
├── db-tests/
│   └── smoke_test.sql            # Comprehensive database test
│
├── public/
│   ├── cute_baby.webp            # Summer portal hero image
│   ├── summersectionImage.webp   # Home page image
│   └── ...
│
├── .env.local                    # (create this, NOT in git)
├── .env.example                  # Example env vars
├── next.config.js                # Next.js config (Turbopack, etc.)
├── tsconfig.json                 # TypeScript strict
├── package.json
└── README.md
```

---

## III. COMMON TASKS

### Add a New Page

```bash
# Example: Add /team page
mkdir app/team
touch app/team/page.tsx
```

**`app/team/page.tsx`:**
```typescript
import Footer from "@/components/site/Footer";

export default function TeamPage() {
  return (
    <>
      <div className="page">
        <section>
          <div className="wrap">
            <h1>The Team</h1>
            <p>...</p>
          </div>
        </section>
        <Footer />
      </div>
    </>
  );
}
```

### Add a New Component

```bash
# Example: Add a "TeamCard" component
mkdir components/site/TeamCard
touch components/site/TeamCard.tsx
touch components/site/TeamCard.css  # if complex styling
```

**`components/site/TeamCard.tsx`:**
```typescript
interface Props {
  name: string;
  role: string;
  image: string;
}

export default function TeamCard({ name, role, image }: Props) {
  return (
    <div className="team-card">
      <img src={image} alt={name} />
      <h3>{name}</h3>
      <p className="role">{role}</p>
    </div>
  );
}
```

**Add CSS to `globals.css`:**
```css
.team-card {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 24px;
  text-align: center;
}

.team-card img {
  width: 100%;
  border-radius: 12px;
  margin-bottom: 16px;
}

.team-card .role {
  color: var(--muted);
  font-size: 13px;
}
```

### Fetch Data from Supabase (Server Component)

```typescript
// app/page.tsx
import { createClient } from "@/lib/supabase";

export default async function HomePage() {
  const supabase = createClient();

  // Fetch courses
  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .eq("status", "live");

  return (
    <section>
      {courses?.map((course) => (
        <div key={course.id}>{course.title}</div>
      ))}
    </section>
  );
}
```

### Call a Server Action

```typescript
// app/apply/page.tsx
"use client";

import { submitApplication } from "@/app/apply/actions";

export default function ApplyForm() {
  const handleSubmit = async (formData: FormData) => {
    const result = await submitApplication(formData);
    if (result.error) {
      console.error(result.error);
    } else {
      // Success
      window.location.href = "/apply/callback";
    }
  };

  return (
    <form action={handleSubmit}>
      <input name="student_name" required />
      <button type="submit">Apply</button>
    </form>
  );
}
```

### Write a Server Action

```typescript
// app/apply/actions.ts
"use server";

import { createClient } from "@/lib/supabase";

export async function submitApplication(formData: FormData) {
  const supabase = createClient();

  // Validate
  const name = formData.get("student_name")?.toString();
  if (!name || name.length < 2) {
    return { error: "Invalid name" };
  }

  // Call SECURITY DEFINER function
  const { data, error } = await supabase.rpc("submit_application", {
    p_student_name: name,
    // ... other params
  });

  if (error) return { error: error.message };
  return { data };
}
```

---

## IV. DATABASE WORKFLOW

### Pull Latest Schema

```bash
# Supabase CLI (must be installed)
supabase db pull
# Generates migrations based on live database
```

### Run Migrations Locally

```bash
# Start local Postgres container (Docker required)
supabase start

# Run all migrations
supabase migration up

# Check status
supabase migration list
```

### Add a New Migration

```bash
# Supabase automatically versions migrations
supabase migration new add_new_column
# Creates: migrations/20260730123456_add_new_column.sql

# Edit the file, add SQL:
# ALTER TABLE students ADD COLUMN phone_number TEXT;

# Apply locally
supabase migration up

# Test it works, then deploy to live
```

### Query the Database Directly

```bash
# Connect to local database
psql postgresql://postgres:postgres@localhost:54322/postgres

# Or connect to live (get connection string from Supabase dashboard)
psql "postgresql://postgres:[password]@[project].supabase.co:5432/postgres"

# Test a query
SELECT * FROM courses WHERE status = 'live';
```

---

## V. STYLING GUIDE

**Golden rule:** Everything lives in `globals.css`. No CSS modules, no Tailwind.

### Adding Styles

```css
/* 1. Define in globals.css using BEM-flat naming */
.team-card {
  /* styles */
}

.team-card-title {
  /* styles */
}

/* 2. Use brand tokens (defined in :root) */
.team-card {
  background: var(--paper);           /* #fcfdff */
  border: 1px solid var(--line);      /* #e8ebf2 */
  color: var(--ink);                  /* #1F2C4F */
}

/* 3. Responsive with media queries */
@media (max-width: 768px) {
  .team-card {
    padding: 16px;  /* smaller on mobile */
  }
}

/* 4. Hover states */
.team-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 24px rgba(31, 44, 79, 0.1);
}
```

### Brand Tokens

```css
:root {
  /* Neutrals */
  --navy: #1F2C4F;          /* Primary dark)
  --ink: #1F2C4F;           /* Text */
  --muted: #5d6781;         /* Secondary text */
  --faint: #97a0b5;         /* Tertiary text */
  --line: #e8ebf2;          /* Borders */
  --paper: #fcfdff;         /* Backgrounds */

  /* Colors */
  --blue: #1999E4;          /* Info, secondary CTA */
  --green: #25B290;         /* Success, primary CTA */

  /* Layout */
  --maxw: 1160px;           /* Max width for content */

  /* Gradient */
  --grad: linear-gradient(122deg, #1F2C4F, #1999E4, #25B290);
}
```

---

## VI. DEBUGGING TIPS

### "Form submission fails silently"

**Check:**
1. Browser DevTools → Network → POST request (what's the error?)
2. Next.js terminal (server-side error?)
3. Supabase logs (is the RPC returning an error?)

**Example:**
```typescript
// Add logging
const { data, error } = await supabase.rpc("submit_application", { ... });
if (error) {
  console.error("RPC error:", error.message, error.details);
}
```

### "Page shows 'Page not found' but file exists"

**Cause:** Route group naming or `page.tsx` missing.

**Check:**
```
app/
├── (marketing)/
│   └── about/
│       └── page.tsx  ← This is what makes /about work
```

If file is missing, route 404s.

### "Database query hangs"

**Causes:** RLS policy denying access, missing index, slow query.

**Debug:**
```sql
-- Disable RLS temporarily (local only!)
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
SELECT * FROM students LIMIT 1;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- If it returns data, RLS is the issue
```

### "Environment variable not found"

**Remember:**
- `NEXT_PUBLIC_*` = bundled into frontend (safe, no secrets)
- Other vars = server-side only (secrets OK here)

**If using in a Client Component:** Prefix with `NEXT_PUBLIC_`

```typescript
// ❌ WRONG - this won't exist in browser
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ✅ RIGHT - for public values
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
```

---

## VII. GIT WORKFLOW (PowerShell)

```powershell
# Check status
git status

# Make a change
git add .

# Commit (no special characters for PowerShell compatibility)
git commit -m "feat: add team page"

# Push to main
git push origin main

# View logs
git log --oneline -5
```

**Commit message tips:**
- Start with verb: feat, fix, chore, docs, refactor
- No backticks, `$`, or double quotes (PowerShell breaks)
- Example: `feat: rebuild portal redesign to match new CSS`

---

## VIII. TESTING LOCALLY

### Smoke Test (Database)

```bash
# Download smoke test from Supabase
psql $DATABASE_URL < db-tests/smoke_test.sql

# All tests pass? Good to go
```

### Manual User Flows

**Apply flow:**
1. Go to http://localhost:3000/apply
2. Fill form
3. Click "Pay with Paystack"
4. Use test card: 4111 1111 1111 1111, any future date, any CVV
5. Return to /apply/callback (should show success)

**Summer ID gate:**
1. Go to http://localhost:3000/summer
2. Use a real Summer ID from the database:
   ```sql
   SELECT summer_id FROM summer_students LIMIT 1;
   ```
3. Enter ID → should set signed cookie
4. Portal page should load

**Admin:**
1. Go to http://localhost:3000/admin
2. Verify it loads (no auth gate locally)

---

## IX. DEPLOYMENT (For First-Time Deploy)

```bash
# 1. Make sure code is clean
npm run build  # Should succeed with no errors

# 2. Push to GitHub
git push origin main

# 3. Vercel auto-deploys (check Vercel dashboard)

# 4. Monitor
# - Check Vercel deploy logs for errors
# - Test live URL (same flows as local)
# - Check Supabase dashboard for query errors
```

---

## X. COMMON ERRORS & FIXES

| Error | Cause | Fix |
|-------|-------|-----|
| `"Module not found: @/components/..."` | Import path wrong | Check file path spelling |
| `"cookies() outside request scope"` | Cookie at module scope | Move inside async function |
| `"RPC function does not exist"` | Migration not run | `supabase migration up` |
| `"RLS policy denies all reads"` | Policy too restrictive | Check `pg_policies` |
| `"Paystack webhook not firing"` | URL not registered | Update in Paystack dashboard + redeploy |
| `"Email not sending"` | Resend not wired | Set RESEND_API_KEY in .env.local |

---

**Still stuck?** Check:
1. Technical Reference (II-TECHNICAL-REFERENCE.md)
2. Supabase docs (https://supabase.com/docs)
3. Next.js docs (https://nextjs.org/docs)
4. Ask Alfred (alfredenyinna03@gmail.com)

**Last verified:** 29 July 2026
