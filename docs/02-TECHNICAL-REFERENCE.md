# KIT — Technical Reference Manual

**For:** Developers picking up this codebase (human or AI)
**Read when:** Starting any feature build, debugging, or migration work
**Last updated:** 29 July 2026 (session 7 — Phase 3.6 shipped)

---

## I. ARCHITECTURE AT A GLANCE

**Single deployment:** Next.js 16 on Vercel. No separate backend service.

```
Next.js App Router (TypeScript strict)
  ├─ Route groups: (marketing), admin, summer, smportal
  ├─ Server Actions (authentication + DB writes + reads that need service-role trust)
  ├─ API Route Handlers (Paystack webhook)
  └─ Middleware (session refresh on /admin only)
      ↓
Supabase (Postgres 16)
  ├─ Row-Level Security (on every sensitive table)
  ├─ SECURITY DEFINER functions (public write gates + all summer reads)
  ├─ Auth (12-week only; summer uses signed cookies)
  └─ Storage (files bucketed — see §VI, corrected in this revision)
```

**Why no backend service?** Supabase RLS + SECURITY DEFINER functions handle authz. Fewer moving parts, fits pre-revenue phase.

**New in this revision — the Server Actions layer.** Phase 3.6 introduced two files that are now the primary way the admin side talks to the database: `src/app/admin/(protected)/summer/batch-actions.ts` and `.../resource-actions.ts`. Every one of them either calls a raw RPC (documented in §V) or calls `.from(table)` directly under an admin-authenticated Supabase client. §VII below documents these as their own reference, since they're now a real architectural layer, not just glue code.

---

## II. THE TWO ACCESS MODELS (CRITICAL DIFFERENCE)

### A. Summer Program (No Auth)

**User:** Summer student with ID like `SM26734`.

**Flow:**
1. Visit `/summer`
2. Enter ID → calls `verify_summer_id(id)` RPC
3. RPC checks roster against rate limit (5 attempts per IP per day)
4. On match: signs an HMAC cookie (HS256, secret = service role key, expires 24h)
5. Cookie grants access to `/smportal` and student portal data

**Database:** Every summer read goes through a SECURITY DEFINER function that verifies the signed cookie (there is no Supabase Auth session) and returns cohort/batch-scoped data only.

**Critical:** If summer ever needs per-student private data beyond what a SECURITY DEFINER function can scope safely, ADR 002 needs to reopen.

### B. 12-Week Program (Real Auth)

**User:** Student, teacher, or admin with a Supabase Auth account.

**Flow:**
1. Sign in at `/admin/login` (admin) or student/teacher equivalents (not built yet)
2. Supabase Auth issues a session, linked to `profiles`
3. Every query scoped via RLS: `WHERE user_id = auth.uid()` and batch checks where relevant

**The admin auth gate — corrected in this revision.** An earlier version of this document (and of doc 05) described `admin/(protected)/layout.tsx` as not yet having an auth check — a `# Future: auth gate here` comment implied it was still to be built. **This was stale. The gate exists and works:** it calls `supabase.auth.getUser()`, then checks `profiles.role === 'admin'`, and redirects to `/admin/login` otherwise. Every route under `(protected)/`, including the entire batch shell (`batch/[batchId]/*`), inherits this check from the parent layout — there is deliberately no redundant re-check in the batch shell's own layout, to avoid two auth checks doing the same query on every page load. If you're auditing this, verify by reading the actual file rather than trusting this paragraph.

**Middleware:** Refreshes the session on `/admin/*` only.

---

## III. DATABASE SCHEMA ESSENTIALS

### Money Handling (CRITICAL)

**All amounts stored in kobo (bigint). NEVER naira.**

```sql
-- WRONG
payments.amount = 7500  -- kobo or naira? unclear

-- RIGHT
payments.amount_kobo = 750000
-- Display boundary only: ₦ ${amount_kobo / 100}
```

### Profiles (WATCH OUT)

**Primary key is `user_id` (FK to auth.users), NOT `id`.**

```sql
-- WRONG
SELECT * FROM profiles WHERE id = $1;

-- RIGHT
SELECT * FROM profiles WHERE user_id = auth.uid();
```

### Summer Tables

| Table | Purpose |
|-------|---------|
| `summer_cohorts` | Cohort metadata (dates, reg window, prize, `current_week` — cohort-wide, see doc 01 §IV) |
| `summer_students` | Roster (one row per enrolled student, `batch_id` FK) |
| `summer_content` | Per-week cohort-wide content (title, note) |
| `summer_resources` | Weekly resources — **now has a nullable `batch_id` column (0025).** `NULL` = shared/visible to every batch; set = visible only to that batch. Confirmed present via direct schema query. |
| `summer_batch_sessions` | Per-batch, per-week session state: instructor, meet link, next class time, `is_live`, `live_started_at` |
| `summer_submissions` | Homework submissions. See §V for the state model. |
| `batches` | Shared with the 12-week program — has `course_slug`, `year`, `cohort_number`, `cohort_label`, `capacity`, `status`. Summer batches all have `course_slug = 'summer'`. |

### 12-Week Tables

| Table | Purpose | RLS? |
|-------|---------|------|
| `courses` | Catalog | Yes (public read, admin write) |
| `batches` | Shared table, see above | Yes |
| `profiles` | User identity (`user_id` FK, role, batch_id) | Yes |
| `students` | 12-week roster | Yes |
| `teachers` | Staff | Yes |

---

## IV. SECURITY RULES (Do Not Violate)

### RLS

Every table with student/batch data has RLS enabled. If you add a table with sensitive data: enable RLS immediately, deny all by default, add explicit allow policies per role.

### SECURITY DEFINER

Public write/read gates like `submit_application()`, `verify_summer_id()`, and every `get_summer_*` function run as `postgres`, bypassing RLS. Rules:
- Always pin `search_path = public, extensions`
- Input validation happens INSIDE the function
- Audit sensitive writes

---

## V. KEY RPC FUNCTIONS (Verify Signatures in `pg_proc` — Not Here)

### Public Write Gates

| Function | Signature | Notes |
|----------|-----------|-------|
| `submit_application` | `(name, dob, parent_email, course_id, payment_plan)` → uuid | Anon, via Server Action |
| `verify_summer_id` | `(id text, ip text, ua text)` → RECORD | Anon, rate-limited |
| `enrol_summer_student` | two call paths (from application or bare) | Admin only |

### Admin Functions

| Function | Signature | Notes |
|----------|-----------|-------|
| `approve_application` | `(app_id uuid, batch_id uuid)` → RECORD | Requires `payment_status='paid'` |
| `reject_application` | `(app_id uuid, reason text)` → RECORD | Surfaces refund exposure |
| `set_summer_live` | `(cohort_year int, is_live bool)` → void | **Legacy, cohort-wide.** Superseded by `set_batch_live` (0022). The component built for this (`GoLiveControl.tsx`) is no longer wired to it — see §VII. |
| `set_batch_live` | `(p_batch_id uuid, p_week int, p_live bool)` → void | Per-batch-per-week. Upserts `summer_batch_sessions`. The live toggle every batch actually uses. |
| `return_homework` | `(p_submission_id uuid, p_feedback text)` → void | **2 args, keyed on the submission row.** Confirmed against migration 0023. |
| `get_homework_roster` | `(p_resource_id uuid, p_batch_id uuid DEFAULT NULL)` | 2 args, no week param. LEFT JOINs so non-submitters return as `status = 'assigned'`. |
| `get_grading_queue` | `(p_batch_id uuid DEFAULT NULL)` | 0026. `NULL` = whole cohort. **Call once and group client-side for per-batch counts — never in a loop.** |

### Student Read Paths (Summer)

| Function | Inputs | Returns |
|----------|--------|---------|
| `get_summer_portal` | `(p_cohort_year int, p_summer_student_id uuid)` | class_title, meet_link, is_live, next_class_at (batch-scoped) |
| `get_summer_resources` | `(p_cohort_year int, p_summer_student_id uuid)` | resources where `week <= current_week`, published, `batch_id IS NULL OR = student's batch` |
| `get_my_submission` | `(p_summer_student_id uuid, p_resource_id uuid)` | status, url, storage_path, submitted_at, feedback, returned_at |
| `get_my_submissions` | `(p_summer_student_id uuid)` | **All of one student's submission statuses, one call.** Use this for any list view — the homework list page uses exactly this to avoid an N+1. |
| `turn_in_homework` | `(p_summer_student_id, p_resource_id, p_url, p_storage_path)` | id, status, submitted_at |
| `unsubmit_homework` | `(p_summer_student_id uuid, p_resource_id uuid)` → void | Blocked once status = 'returned' |

### ⚠️ Confirmed Signatures — History of Errors

These were documented wrong at various points and caused real, deployed bugs. Confirmed directly against migration files, not against any prior revision of this document:

| Function | ACTUAL signature | Previously documented / implemented as |
|---|---|---|
| `return_homework` | `(p_submission_id uuid, p_feedback text)` — 2 args | An earlier component called it with 3 args, `(p_resource_id, p_summer_student_id, p_feedback)` — wrong, does not exist as a function signature |
| `get_my_submission` | `(p_summer_student_id uuid, p_resource_id uuid)` — 2 args | A misplaced file (see doc 06) called it with 1 arg |
| `get_homework_roster` | `(p_resource_id uuid, p_batch_id uuid DEFAULT NULL)` | Correct everywhere it's used |
| `set_batch_live` | `(p_batch_id uuid, p_week int, p_live bool)` | Correct |
| `get_grading_queue` | `(p_batch_id uuid DEFAULT NULL)` | Added 0026, correct |

**Consequence of `return_homework`'s shape:** you can only return work that has a submission row. There is no "return" for a student who never submitted — correct behavior, but it means the Missing filter's only possible action is a nudge, never a return.

### Homework State Machine

Three states, two rows:

```
assigned   →  NO ROW in summer_submissions
turned_in  →  row exists, status = 'turned_in'
returned   →  row exists, status = 'returned', feedback + returned_at set
```

`get_homework_roster` and `get_grading_queue` both LEFT JOIN and `coalesce(sub.status, 'assigned')`, so non-submitters come back as `assigned` for free — no separate query for "who hasn't done this."

Re-submitting after a return **clears** the prior feedback and `returned_at` — deliberate: it's new work, the old review no longer applies.

---

## VI. STORAGE & FILES

### Buckets — CORRECTED in this revision

An earlier revision of this document listed a bucket named `submissions` with its own path structure. **That bucket does not exist.** Homework file uploads (`uploadSubmissionFile` in `summer-session.ts`) write to the **`summer`** bucket, under a `submissions/` path prefix:

```
summer/submissions/{summer_student_id}/{resource_id}/{timestamp}-{filename}
```

An admin-side function built during Phase 3.6 assumed the old (wrong) bucket table and called `.storage.from("submissions")`, which silently 404'd every file preview with a generic "Object not found" — indistinguishable at first from a permissions error. It was fixed by matching the real upload path. **If you see "Object not found" from Supabase Storage, check the bucket name before assuming an RLS problem** — Supabase Storage returns the same generic error for "wrong bucket" and "no permission," as a deliberate security-through-obscurity measure.

| Bucket | Path structure | Who reads | Who writes |
|--------|----------------|-----------|------------|
| `public-assets` | `/year/week{n}/filename` | anyone | Admin only |
| `batch-resources` | `/batch_id/week{n}/filename` | teacher + batch students | Teachers |
| `certificates` | `/batch_id/student_id/filename` | student (own), admin (all) | Admin only |
| `summer` | `/year/week{n}/filename` for cohort resources; `/submissions/{student_id}/{resource_id}/filename` for homework uploads | admin (all), students (via signed URL, own submissions only) | Admin (resources), students via Server Action (submissions) |

### Uploads (File Size Limits)

- Summer resources: ≤25 MB
- Homework submissions: ≤10 MB (enforced client-side in the upload form; server-side cap in `uploadResourceFile`/`uploadSubmissionFile` is 25 MB — tighten if you want a hard student-facing limit)
- Certificates: ≤5 MB

### Signed URLs

```typescript
// Server-side only, never client-side
const { data, error } = await supabase.storage
  .from('summer')
  .createSignedUrl('submissions/abc-123/def-456/1234-file.pdf', 600); // 10-min expiry
```

**Two different code paths generate these, with two different trust models — know which one you're touching:**
- **Student-facing** (`getSummerFileUrl` in `summer-session.ts`): students have no Supabase Auth session, so this function is the entire security boundary — it checks the requesting student's session against the file path before signing. **Known bug (see doc 01 §IV):** its check assumes every path starts with the cohort year, which is true for resources but not for submission paths. Not yet fixed.
- **Admin-facing** (`getSubmissionFileUrl` in `batch-actions.ts`): the calling Server Action is already gated by `assertAdmin()`, so this function just signs — there's no additional path-ownership check needed, since only admins can reach it at all.

**Why server-side?** Signed URLs work via a secret key. Leaking the URL (10-minute expiry, forwardable) is an acceptable, documented risk. Leaking the key is catastrophic.

---

## VII. SERVER ACTIONS REFERENCE (New in This Revision)

Two files carry almost all of the batch shell's data access. Both live under `src/app/admin/(protected)/summer/`.

### `batch-actions.ts`

| Export | Type | What it does |
|---|---|---|
| `createBatch`, `updateBatch`, `deleteBatch` | mutation | Batch CRUD. `deleteBatch` refuses if students are enrolled. |
| `HomeworkRosterItem` (type), `getHomeworkRoster` | read | Wraps `get_homework_roster`. Maps the RPC's raw column names (`student_name`, `url`, `storage_path`) onto typed fields explicitly — this used to be passed through as `any[]`, which silently let a shape mismatch (a missing `submission_id`) reach the UI as `undefined` instead of a type error. |
| `returnHomework` | mutation | Wraps `return_homework(p_submission_id, p_feedback)`. |
| `BatchSessionInput` (type), `saveBatchSession` | mutation | Upserts `summer_batch_sessions` on `(batch_id, week)`. |
| `setBatchLive` | mutation | Wraps `set_batch_live`. |
| `GradingQueueItem` (type), `getGradingQueue` | read | Wraps `get_grading_queue`. Called with `null` for the whole-cohort view (batch cards), or a specific `batchId` for one batch's queue tab. |
| `getSubmissionFileUrl` | read | See §VI — the admin-side signed URL function, pointed at the `summer` bucket. |
| `HomeworkAssignment` (type), `getBatchHomeworkAssignments` | read | Lists gradeable homework resources visible to one batch (`kind = 'homework' AND submission_type IS NOT NULL`), applying the ADR 005 predicate: `batch_id IS NULL OR batch_id = this batch`. |
| `BatchOverview` (type), `getBatchOverview` | read | One bundled call for the Overview tab — roster count, live status, next class, assignments published vs. graded — rather than the page firing five separate queries. |

### `resource-actions.ts`

| Export | Type | What it does |
|---|---|---|
| `saveResource` | mutation | Create/update a `summer_resources` row. `ResourceInput.batchId` is **optional** — the cohort-level editor never sets it (always shared/`NULL`); the batch-level Resources tab always sets it to the current batch for new rows. |
| `deleteResource` | mutation | Unrestricted delete — used only by the cohort-level editor. |
| `deleteBatchResource` | mutation | **Refuses outright if the row is shared** (`batch_id IS NULL`) — deleting shared curriculum from inside a batch page is blocked by design (ADR 005); the error message points back to the cohort-level screen. |
| `getBatchResources` | read | Resources visible to one batch — same `batch_id IS NULL OR = batch` predicate as `getBatchHomeworkAssignments`, but unfiltered by `kind`, since this tab shows every resource type. |
| `toggleResourcePublished`, `uploadResourceFile`, `moveResource` | mutation | Unchanged from before Phase 3.6. |

**Pattern across both files:** functions that mutate use `assertAdmin()`, which throws if the caller isn't an authenticated admin. Functions that only read and wrap a SECURITY DEFINER RPC use plain `createClient()` instead — the RPC's own `is_admin()` check inside Postgres is the real gate, and re-checking in the Server Action would be a redundant round trip. `getSubmissionFileUrl` is the one read-only exception: since there's no RPC standing between it and Supabase Storage, `assertAdmin()` there is load-bearing, not decorative.

---

## VIII. ENVIRONMENT VARIABLES

### Required (Production)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY (keep secret)
PAYSTACK_SECRET_KEY (keep secret; sk_live_ in prod — rotated 29 July 2026 after an earlier leak)
NEXT_PUBLIC_SITE_URL
RESEND_API_KEY
```

### Baked at Build Time

`NEXT_PUBLIC_SITE_URL` and `PAYSTACK_SECRET_KEY` are baked into the build. Redeploy after any change:

```bash
git commit --allow-empty -m "chore: redeploy to pick up env changes"
git push
```

---

## IX. COMMON PATTERNS & GOTCHAS

### Cookies Outside Request Scope

```typescript
// WRONG — module scope
const session = cookies().get('kit_summer');

// RIGHT — inside an async function
export default async function Page() {
  const session = cookies().get('kit_summer');
}
```

### A Dynamic Route Folder Does Not Serve Its Parent Path

This one caused a real, shipped bug during Phase 3.6. `src/app/smportal/homework/[id]/page.tsx` handles `/smportal/homework/abc-123`. It does **not** handle `/smportal/homework` — that needs its own `page.tsx` sitting directly in `homework/`. A file with `{ id }`-shaped detail-page logic was found sitting at the parent path; every visit got `params.id === undefined`, matched nothing, and fell through to `notFound()` unconditionally. If a route 404s and you can see a `page.tsx` file that looks related, check whether it's actually the file for *that exact path*, not a same-named file for a child route.

### RLS Debugging

```sql
SELECT tablename, policyname, qual FROM pg_policies WHERE tablename = 'students';
SELECT current_user, current_role;
```

### Verifying a Migration Actually Ran

Don't trust a document's claim. Check directly:

```sql
-- Does a column exist?
SELECT column_name FROM information_schema.columns WHERE table_name = 'summer_resources';

-- Does a function exist, and with what signature?
SELECT proname, pg_get_functiondef(p.oid) FROM pg_proc p WHERE proname = 'get_grading_queue';
```

This is exactly how 0025 and 0026 were confirmed run during the Phase 3.6 build, after an earlier document claimed they were still pending.

---

## X. DEPLOYMENT PIPELINE

1. Code change → test locally → git commit (no backticks/`$`/`"`) → push to `main` → Vercel auto-deploys → test on live URL.
2. **On a build failure, read the actual error and the actual file the error names.** Two files can share a generic name (`page.tsx` appears dozens of times in this codebase) — a fix aimed at the wrong one won't show up in the error and won't fix anything.
3. **If a build fails with a missing-name error** (`Cannot find name 'X'`) in a file that's been edited more than once this session, the most likely cause is a dropped piece from a manual diff merge, not new broken logic. Ask for the complete current file and reconstruct it, rather than patching around the missing piece.

---

## XI. MONITORING & DEBUGGING

### "column X does not exist" / "function X does not exist"

Don't assume a migration didn't run just because a doc says so, and don't assume it did either — check directly (§IX above).

### "Object not found" from Supabase Storage

Could mean wrong bucket name **or** an RLS/permissions denial — Supabase deliberately returns the same message for both. Check the actual upload code's bucket name first (cheapest to rule out); only chase RLS policies if the bucket and path are confirmed correct.

### Webhook not firing

Check the webhook URL in the Paystack dashboard matches the deployed domain, and that `NEXT_PUBLIC_SITE_URL` is correct and was baked in via a redeploy after any change. **As of this revision, this has been flagged as unverified twice and still has no confirmation it was actually tested on kitacademy.net.**

---

## XII. PERFORMANCE NOTES

- Rate limit: 5 summer ID attempts per IP per day
- Signed URL expiry: 10 minutes
- Session cookie expiry: 24 hours (summer)
- `get_grading_queue(null)` is called once per page load for the whole-cohort batch-card view, and once more per batch when that batch's own Homework tab badge count is computed in the batch shell layout — a known, accepted minor redundancy (two RPC calls instead of one, for one batch, on one page), not a loop across batches.

---

**Need help?** Check `pg_proc` and `information_schema`, not memory, and not this document, if there's any doubt. Empiricism over assumptions — this document exists to save you time, not to replace verification.
