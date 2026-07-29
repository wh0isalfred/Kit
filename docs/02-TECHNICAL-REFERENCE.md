# KIT — Technical Reference Manual

**For:** Developers picking up this codebase (human or AI)  
**Read when:** Starting any feature build, debugging, or migration work  
**Last updated:** 29 July 2026

---

## I. ARCHITECTURE AT A GLANCE

**Single deployment:** Next.js 16 on Vercel. No separate backend service.

```
Next.js App Router (TypeScript strict)
  ├─ Route groups: (marketing), (summer), admin
  ├─ Server Actions (authentication + DB writes)
  ├─ API Route Handlers (Paystack webhook, Resend)
  └─ Middleware (session refresh on /admin only)
      ↓
Supabase (Postgres 16)
  ├─ Row-Level Security (on every sensitive table)
  ├─ SECURITY DEFINER functions (public write gates)
  ├─ Auth (12-week only; summer uses signed cookies)
  └─ Storage (files bucketed by year/week)
```

**Why no backend service?** Supabase RLS + SECURITY DEFINER functions handle authz. Faster deployment, fewer moving parts, fits pre-revenue phase.

---

## II. THE TWO ACCESS MODELS (CRITICAL DIFFERENCE)

### A. Summer Program (No Auth)

**User:** Summer student with ID like `SM26734`.

**Flow:**
1. Visit `/summer`
2. Enter ID → calls `verify_summer_id(id)` RPC
3. RPC checks roster against rate limit (5 attempts per IP per day)
4. On match: signs an HMAC cookie with HS256 (secret = service role key, expires 24h)
5. Cookie grants access to `/smportal` (shared page) and student portal data

**Database:** Every summer read goes through a SECURITY DEFINER function that:
- Checks the signed cookie (no Supabase Auth session exists)
- Returns cohort-scoped data only

**Why this design?**
- No parent email confirmation needed (faster onboarding)
- No Supabase Auth overhead (lighter, cheaper)
- One URL per cohort (students bookmark it)
- No per-student data exposure risk (everything is cohort-wide anyway)

**Critical:** If summer ever needs per-student data (grades, private feedback, etc.), this model breaks. ADR 002 would need to reopen.

### B. 12-Week Program (Real Auth)

**User:** Student or teacher with Supabase Auth account.

**Flow:**
1. Sign up at `/login` OR admin creates account
2. Supabase Auth issues JWT (stores in `auth.users`, linked to `profiles`)
3. Every query scoped via RLS policies: `WHERE user_id = auth.uid() AND batch_id = profiles.batch_id`

**Database:** RLS policies on every table. Teachers can't SELECT all `students`, only via `students_for_teacher` (4 columns, teacher's batch only).

**Middleware:** Refresh session on `/admin/*` only (catch expired tokens early). Scoped matcher to prevent `/apply/callback` 404s.

---

## III. DATABASE SCHEMA ESSENTIALS

### Money Handling (CRITICAL)

**All amounts stored in kobo (bigint). NEVER naira.**

```sql
-- WRONG ❌
payments.amount = 7500  -- is this kobo or naira? unclear

-- RIGHT ✅
payments.amount_kobo = 750000  -- obviously kobo
-- Then at display boundary: ₦ ${amount_kobo / 100}
```

**Why?** Floats lose precision. Kobo is the atomic unit in Nigeria's financial system. Every view that displays naira does the `/100` conversion.

**Places this matters:**
- `applications.amount_kobo` (what they pay)
- `payments.amount_kobo` (what was received)
- `kit_points_rules.reward_naira` is an exception (display value only, never do math with it)

### Profiles (WATCH OUT)

**Primary key is `user_id` (FK to auth.users), NOT `id`.**

```sql
-- WRONG ❌
SELECT * FROM profiles WHERE id = $1;

-- RIGHT ✅
SELECT * FROM profiles WHERE user_id = auth.uid();
```

This bug caused three production issues. When querying profiles, always use `user_id`.

### Summer Tables

| Table | Purpose | Rows |
|-------|---------|------|
| `summer_cohorts` | Cohort metadata (dates, reg window, prize, live toggle) | 1–2 at a time (active + planning) |
| `summer_students` | Roster (one row per enrolled student) | ~50–200 per cohort |
| `summer_content` | Shared content (one row per cohort) | 1 per cohort |
| `summer_resources` | Weekly resources (one row per file) | ~30–50 per cohort (3 weeks × ~10–15 files) |
| `summer_access_attempts` | Audit log for ID gate (rate limiting) | grows over time |

**Invariants:**
- Only one row in `summer_cohorts` can have `active = true`
- `summer_resources.published_week >= current_week` (future weeks hidden)
- `summer_students` has **no password field** (no Auth account exists)

### 12-Week Tables

| Table | Purpose | RLS? |
|-------|---------|------|
| `courses` | Catalog (title, price, type='term', track, status) | Yes (public read, admin write) |
| `batches` | Cohorts (one per course × year × cohort_number, max 15 students) | Yes (teacher sees own batch) |
| `profiles` | User identity (user_id FK, role, batch_id) | Yes (user sees own, admin sees all) |
| `students` | 12-week roster (linked to auth.users via profiles.user_id) | Yes (student sees self, teacher sees batch) |
| `teachers` | Staff (linked to auth.users, can have multiple batches) | Yes (teacher sees own detail) |

---

## IV. SECURITY RULES (Do Not Violate)

### RLS

Every table with student/batch data has RLS enabled. Example:

```sql
CREATE POLICY "students_see_own" ON students
  FOR SELECT USING (
    auth.uid() = profiles.user_id
    AND profiles.batch_id = students.batch_id
  );
```

**If you add a table with sensitive data:**
1. Enable RLS (immediate)
2. Deny all by default (`CREATE POLICY ... USING (false)`)
3. Add explicit allow policies for each role

### SECURITY DEFINER

Functions like `submit_application()` and `verify_summer_id()` are SECURITY DEFINER (run as `postgres` role, bypass RLS). They are public.

**Rules:**
- Always pin `search_path = public, extensions` (prevents `profiles` shadowing)
- Input validation happens INSIDE the function (don't trust caller)
- Deduplicate logic (if two functions do the same thing, one is a bug)
- Audit what they do (write to `audit_log`)

Example:

```sql
CREATE FUNCTION submit_application(
  p_student_name TEXT,
  ... -- all inputs
) RETURNS TABLE (...) 
  SECURITY DEFINER
  SET search_path = public, extensions
LANGUAGE plpgsql
AS $$
DECLARE
  v_amount_kobo BIGINT;
BEGIN
  -- Validate inputs (don't trust form submission)
  IF p_student_name IS NULL OR length(trim(p_student_name)) < 2 THEN
    RAISE EXCEPTION 'Student name required and must be at least 2 chars';
  END IF;
  
  -- Compute amount server-side (don't trust form)
  SELECT price_kobo INTO v_amount_kobo FROM courses WHERE id = p_course_id;
  
  -- Insert + audit
  INSERT INTO applications (..., amount_kobo, ...) VALUES (..., v_amount_kobo, ...);
  PERFORM write_audit('application_submitted', 'applications', v_app_id, ...);
  
  RETURN QUERY SELECT * FROM applications WHERE id = v_app_id;
END;
$$;
```

---

## V. KEY FUNCTIONS (Verify Signatures in pg_proc)

### Public Write Gates

| Function | Signature | Returns | When to call |
|----------|-----------|---------|--------------|
| `submit_application` | `(name, dob, parent_email, course_id, payment_plan)` → uuid | application uuid | Anon at /apply (client calls via Server Action) |
| `verify_summer_id` | `(id TEXT, ip TEXT, ua TEXT)` → RECORD | student ID + name or ERROR | Anon at /summer (client calls via Server Action, rate-limited) |
| `enrol_summer_student` | Two paths: from application OR bare enrollment | student uuid + summer_id | Admin only |

### Admin Functions

| Function | Signature | Returns | Notes |
|----------|-----------|---------|-------|
| `approve_application` | `(app_id uuid, batch_id uuid)` → RECORD | student_id, kit_id, etc. | Requires payment_status='paid' |
| `reject_application` | `(app_id uuid, reason TEXT)` → RECORD | refund_due (true/false), amount_kobo | Refund policy live; amount surfaces exposure |
| `set_summer_live` | `(cohort_year INT, is_live BOOL)` → void | (audited) | Admin only, no guard rails (single source of truth) |
| `set_batch_live` | `(batch_id uuid, week INT, is_live BOOL)` → void | (audited) | Per-batch-week live toggle (12-week) |

### Student Read Paths (Summer)

All `get_summer_*` functions return cohort-scoped data only:

| Function | Inputs | Returns | Rate? |
|----------|--------|---------|-------|
| `get_summer_portal` | cohort_year INT, summer_student_id uuid | meet_link, is_live, current_week | No (called from component) |
| `get_summer_resources` | cohort_year INT, summer_student_id uuid | array of resources (published_week <= current_week) | No |
| `get_homework_roster` | resource_id uuid, batch_id uuid | students + status (turned_in, returned, etc.) | No |

**Critical:** These are SECURITY DEFINER. They do the summer_student_id check inside the function. Don't trust the caller to pass the right ID.

---

## VI. STORAGE & FILES

### Buckets

| Bucket | Path structure | RLS policy | Who can upload |
|--------|----------------|-----------|----------------|
| `public-assets` | `/year/week{n}/filename` | anyone read, admin write | Admin only |
| `batch-resources` | `/batch_id/week{n}/filename` | teacher + students in batch read, teacher write | Teachers |
| `submissions` | `/batch_id/assignment_id/student_id/filename` | student see own, teacher see batch | Students (via Server Action) |
| `certificates` | `/batch_id/student_id/filename` | student see own, admin see all | Admin only |
| `summer` | `/year/week{n}/filename` | anyone read, admin write | Admin only |

### Uploads (File Size Limits)

- Summer resources: ≤25 MB (slides, PDFs, videos)
- Homework submissions: ≤10 MB (student work)
- Certificates: ≤5 MB (PNG/PDF)

### Signed URLs

```typescript
// Server-side, NEVER client-side
const url = await supabase.storage
  .from('summer')
  .createSignedUrl(`2026/week1/slides.pdf`, 600); // 10-min expiry

// Client-side: <a href={url}>Download</a>
```

**Why server-side?** Signed URLs work via secret key. Leaking the URL is fine; leaking the key is catastrophic.

---

## VII. ENVIRONMENT VARIABLES

### Required (Production)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY (keep secret)
PAYSTACK_SECRET_KEY (keep secret, use sk_live on prod)
NEXT_PUBLIC_SITE_URL (used for Paystack callback URL construction)
RESEND_API_KEY (not yet wired, but env var exists)
```

### Baked at Build Time

`NEXT_PUBLIC_SITE_URL` and `PAYSTACK_SECRET_KEY` are baked into the Next.js build. After changing them in Vercel env vars, you must **redeploy** (even with no code changes).

```bash
# Force a redeploy after env change (on Vercel)
git commit --allow-empty -m "chore: redeploy to pick up env changes"
git push
```

### Local Development

`.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ... (anon key)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (service-role key)
PAYSTACK_SECRET_KEY=sk_test_... (test key)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
RESEND_API_KEY=re_test_... (or leave blank)
```

---

## VIII. COMMON PATTERNS & GOTCHAS

### Cookies Outside Request Scope

**WRONG ❌**
```typescript
// At module scope
const session = cookies().get('kit_summer');  // ERROR!
export default function Page() { ... }
```

**RIGHT ✅**
```typescript
// Inside async component
export default async function Page() {
  const session = cookies().get('kit_summer');  // OK
  ...
}
```

Cookies are request-scoped. Module-scope calls fail with `"cookies called outside request scope"`.

### Money Math

**WRONG ❌**
```typescript
const naira = 15000;
const kobo = naira / 100;  // Precision loss! Use *100 instead
const saved = kobo * 100;  // Might be 14999.99
```

**RIGHT ✅**
```typescript
const kobo = 1500000;  // Store this
const naira = kobo / 100;  // Display this
```

### RLS Debugging

If a query returns no rows but you expect results:

```sql
-- Check RLS policies
SELECT tablename, policyname, qual FROM pg_policies 
WHERE tablename = 'students';

-- Test with a known ID
SELECT * FROM students WHERE id = 'some-uuid';  -- Might return nothing if RLS denies

-- Check your role
SELECT current_user, current_role;

-- Temporarily disable RLS for testing
ALTER TABLE students DISABLE ROW LEVEL SECURITY;  -- DO NOT LEAVE THIS ON
-- ... test ...
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
```

### Migrations with Complex Logic

After running a migration that touches functions:

```bash
# Verify function signature
SELECT proname, pg_get_functiondef(p.oid) 
FROM pg_proc p WHERE proname = 'submit_application';

# Run smoke test (if it exists)
psql $DATABASE_URL < db-tests/smoke_test.sql
```

---

## IX. DEPLOYMENT PIPELINE

### Local → Production

1. **Code change** (e.g., new Server Action)
2. **Test locally** (`npm run dev`, verify Supabase connection)
3. **Git commit** (human-readable message, no backticks/`$`/`"` for PowerShell)
4. **Push to `main`** (GitHub)
5. **Vercel auto-deploys** (check deploy log for env var errors)
6. **Test on live URL** (especially Paystack, Resend, RLS)

### Database Migrations

1. **Write migration file** (`migrations/` folder)
2. **Test locally** (`supabase migration up`)
3. **Verify function signatures** (`pg_proc`)
4. **Run smoke test** (if applicable)
5. **Commit** (include `#migration` tag in message for clarity)
6. **Supabase auto-runs** on linked branch, or manually via dashboard

### Secrets Rotation

Paystack key compromised? Stripe key leaked? **Do this:**

1. Generate new key in service dashboard (Paystack, Stripe, Resend, etc.)
2. Update in Vercel env vars
3. **Redeploy** (force with empty commit if needed)
4. Revoke old key in service dashboard (after confirming new one works)

---

## X. MONITORING & DEBUGGING

### Error: "column X does not exist"

**Cause:** Assumed a migration ran that didn't.

**Fix:**
```bash
# Check migration status
supabase migration list

# Check table structure
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'applications';
```

### Error: "relation 'profiles' does not exist inside this stored procedure"

**Cause:** SECURITY DEFINER function running without `search_path = public, extensions`.

**Fix:** Recreate function with `SET search_path = public, extensions`.

### Webhook not firing

**Symptom:** Application paid but `payment_status` stays `pending_payment`.

**Check:**
1. Webhook URL in Paystack dashboard matches deployed URL
2. `NEXT_PUBLIC_SITE_URL` is correct (baked at build time)
3. Redeploy after any URL change
4. Test webhook manually from Paystack dashboard

### RLS denying all reads

**Symptom:** Query returns 0 rows even though data exists.

**Check:**
```sql
-- List all policies on the table
SELECT tablename, policyname, qual, with_check 
FROM pg_policies 
WHERE tablename = 'students';

-- Temporarily disable RLS for testing ONLY
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
SELECT * FROM students LIMIT 1;  -- Does this return data?
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- If data appears, RLS is overly restrictive
```

---

## XI. PERFORMANCE NOTES

- **Paystack init timeout:** 15s (configured in Server Action)
- **Rate limit:** 5 summer ID attempts per IP per day
- **Signed URL expiry:** 10 minutes (files)
- **Session cookie expiry:** 24 hours (summer)
- **JWT expiry:** Supabase default (1 hour, auto-refreshed by middleware on `/admin`)

For large-scale deployments (500+ students):
- Index `summer_students(cohort_year)` and `applications(status, course_id)`
- Add database replication (Supabase Pro or higher)
- Consider caching cohort metadata in Redis (future)

---

## XII. THE SMOKE TEST (Run After Migrations)

```bash
# Connect to Supabase
psql $DATABASE_URL < db-tests/smoke_test.sql

# This tests:
# - All migrations applied
# - Functions exist with correct signatures
# - Constraints enforced
# - RLS policies exist
# - Storage buckets configured
```

**Result:** All tests pass, or errors are surfaced. Commit-blocking test.

---

**Need help?** Refer to this doc, check `pg_proc`, or run the smoke test. Empiricism > assumptions.
