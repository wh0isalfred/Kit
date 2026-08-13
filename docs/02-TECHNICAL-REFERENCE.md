# KIT — Technical Reference Manual

**For:** Developers picking up this codebase (human or AI)
**Last updated:** 13 August 2026 (session 9)

---

## I. ARCHITECTURE AT A GLANCE

Unchanged from prior revision — Next.js 16 on Vercel, Supabase Postgres, RLS + SECURITY DEFINER functions, no separate backend.

---

## II. THE TWO ACCESS MODELS

### A. Summer Program (No Auth) — the section that matters most right now

Unchanged in design from prior revision — signed HMAC cookie, no Supabase Auth account, `getSummerSession()` is the only correct way to read it.

**⚠️ The single most important rule in this whole document, added after two full-outage bugs traced to the same mistake:**

**Summer students authenticate via a signed cookie, never Supabase Auth. This means `is_admin()` — and any RLS policy or storage policy gated only on `is_admin()` — evaluates false for every summer student, always, with no exceptions.** If a table or storage bucket has exactly one policy and it's `ALL`-scoped and `is_admin()`-gated, that table or bucket is **completely unreadable by any summer student**, regardless of whether the application code checks the session correctly first. The app-level check and the database-level check are two separate gates — passing one says nothing about the other.

This exact gap caused two independent, total-outage bugs on launch day:
1. `summer_students` had only an admin `ALL` policy — the student portal's own name/batch lookup returned nothing for every student, unconditionally, from day one.
2. The `summer` storage bucket had only an admin `ALL` policy — every resource download failed for every student with a generic "Couldn't open that file," which looks identical to a wrong file path from the outside.

**A third instance appeared on the WRITE side (session 9):** students could not *upload* homework, because the `summer` bucket's only write policy was also `is_admin()`-gated. Reads had been fixed; writes had never been reachable until a separate Next.js body-size limit was raised, so the gap stayed hidden. **Three outages, one unanswered question, three different places.**

**The rule, generalized (ADR 011): for every new table or bucket, explicitly answer READ, WRITE, UPDATE, and DELETE for every role that will touch it — before the migration is considered done.**

**The fix pattern, now the standard for anything student-facing:**
- **For a table:** write a `SECURITY DEFINER` function that trusts the already-cookie-verified id passed to it (same pattern as `get_summer_portal`, `get_summer_resources`, `turn_in_homework`, and now `get_my_summer_student`) — never a raw `.from(table).select()` from student-facing code.
- **For storage reads:** add a narrowly-scoped `SELECT` policy (`TO public`, filtered to exactly the paths that should be readable) alongside the existing admin policy — never widen the admin policy itself, and never make a bucket broadly public if it also holds anything private (see `summer`'s `submissions/` exclusion below).
- **For storage writes:** same shape — a scoped `INSERT` policy, restricted to the specific prefix that role should be able to write to. Use `INSERT` rather than `ALL` unless overwrite/delete is genuinely needed.

**Before writing any new summer-student-facing read, ask: does this table/bucket have a policy that a cookie-only, non-admin caller can actually satisfy? If the only policy is `is_admin()`-gated, it will silently return nothing — not error, just nothing — for every student.**

### B. 12-Week Program (Real Auth)

Unchanged from prior revision.

---

## III. DATABASE SCHEMA ESSENTIALS

Unchanged from prior revision — money in kobo, `profiles.user_id` as PK, summer tables as previously documented.

---

## IV. SECURITY RULES

Unchanged in principle. One addition:

### The `is_admin()`-only trap (see §II.A above for the full incident writeup)
Checking `is_admin()` for admin *write* access is correct and unchanged. The mistake is assuming that same policy also implicitly handles *read* access for other roles — it doesn't, RLS policies are additive per command, and if `ALL` is the only policy present, there is no separate `SELECT` grant for anyone else to fall back on.

---

## V. KEY FUNCTIONS

### New this session

| Function | Signature | Notes |
|----------|-----------|-------|
| `get_my_summer_student` | `(p_summer_student_id uuid)` → `name, cohort_year, batch_id` | **Fixes the portal-access outage.** `SECURITY DEFINER`, deliberately no `active` filter (matches the raw query it replaced exactly). Caller must already hold a verified session cookie — trusts whatever id it's given, same trust model as every other summer RPC. |

### Everything else — unchanged from prior revision, still verified against migration files:

| Function | ACTUAL signature |
|---|---|
| `return_homework` | `(p_submission_id uuid, p_feedback text)` |
| `get_my_submission` | `(p_summer_student_id uuid, p_resource_id uuid)` |
| `get_homework_roster` | `(p_resource_id uuid, p_batch_id uuid DEFAULT NULL)` |
| `set_batch_live` | `(p_batch_id uuid, p_week integer, p_live boolean)` |
| `get_grading_queue` | `(p_batch_id uuid DEFAULT NULL)` |
| `unsubmit_homework` | `(p_summer_student_id uuid, p_resource_id uuid)` — **still only allows `status = 'turned_in'`, deliberately.** A migration to also allow `'returned'` (0028) was written but never applied — the "Redo" feature that would have used it was removed from the UI instead. Do not assume 0028 is live; it isn't. |

---

## VI. STORAGE & FILES

### The `summer` bucket now has TWO policies — both matter

```sql
-- Original (admin write access)
CREATE POLICY "summer files written by admin"
ON storage.objects FOR ALL
USING (bucket_id = 'summer' AND is_admin());

-- Added this session (0029) — student read access, scoped
CREATE POLICY "summer resources readable by anyone"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'summer'
  AND (storage.foldername(name))[1] <> 'submissions'
);
```

**Why the second policy excludes `submissions/` specifically:** the same bucket holds both admin-uploaded resources (`{year}/week{n}/...`) and students' own submitted homework (`submissions/{sid}/{resourceId}/...`). A blanket "make the bucket public" fix would have solved the resource-download bug but also made every student's private submitted homework readable by anyone holding the public anon key. The exclusion is the entire reason this needed a real policy, not a one-line dashboard toggle.

**Deployment status: confirmed applied and working.** Students can download resources.

### And a THIRD policy for student uploads (0030)

```sql
CREATE POLICY "summer submissions writable by anyone"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'summer'
  AND (storage.foldername(name))[1] = 'submissions'
);
```

`INSERT` only, not `ALL` — students create submission files but cannot overwrite or delete existing ones directly through storage. Scoped to `submissions/` so a student can never write into `{year}/week{n}/` where lesson materials live.

**A limitation to know rather than discover:** this permits anyone holding the public anon key to write into `submissions/`. That's consistent with the whole summer trust model — students have no Supabase Auth identity, so the database genuinely cannot tell one from another; the real gate is the Server Action verifying the session cookie (ADR 002). The database is not enforcing "student A can't write into student B's folder" — only application code is.

**Current state: the `summer` bucket has three policies** — admin `ALL`, public `SELECT` on non-submission paths, public `INSERT` on `submissions/`. Verify with:
```sql
select policyname, cmd from pg_policies
where tablename = 'objects' and qual::text like '%summer%';
```

### Forcing downloads instead of inline rendering

```typescript
const { data, error } = await supabase.storage
  .from("summer")
  .createSignedUrl(storagePath, 60 * 10, { download: downloadName });
```
The `download` option sets `Content-Disposition: attachment`, which is what actually forces a browser to download rather than render. Without it, any browser-renderable MIME type (markdown, plain text, some PDFs) opens inline instead of downloading — binary types like `.zip` happened to work by accident, which is why this bug wasn't caught until someone tried a `.pptx`. `downloadName` strips the upload-time `{timestamp}-` prefix so the saved file has a clean, real name.

**Apply this same `download` option to any future signed-URL-generating code that's meant to produce a downloadable file** — it's not automatic, it has to be requested every time.

### Error logging — do this every time, not just when convenient

```typescript
const { data, error } = await supabase.storage.from("summer").createSignedUrl(...);
if (error || !data) {
  console.error("getSummerFileUrl:", storagePath, error?.message);  // ← don't skip this
  return { ok: false, error: "Couldn't open that file." };
}
```
A generic user-facing message is fine and often correct (don't leak internals to students). **But log the real error somewhere first.** A prior version of this exact function discarded the real Supabase error entirely, which meant the actual cause (a missing storage policy) took multiple rounds of hypothesis-testing to find instead of being visible in Vercel's logs on the first try.

### Everything else in this section — bucket table, size limits, signed URL tradeoffs — unchanged from prior revision.

---

## VII. ENVIRONMENT VARIABLES

Unchanged.

---

## VIII. COMMON PATTERNS & GOTCHAS

Unchanged from prior revision, plus:

### "It works for me (as admin) but fails for every student"
This specific split is a strong, almost diagnostic signal — not a coincidence, not "must be their device." A wrong file path or wrong data fails the same way for everyone. A permissions gap fails differently depending on who's asking. If you see this exact pattern, check RLS/storage policies before anything else — see §II.A.

### A duplicate CSS rule doesn't error, it just silently wins or loses
Unlike component code, CSS has no build-time check for "this class is defined twice." If a fix is pasted into a stylesheet that's been edited before for the same class family, search for existing occurrences first:
```powershell
Select-String -Path "src\app\globals.css" -Pattern "\.your-class-name"
```
If it comes back with more than the expected number of hits, delete all of them and paste exactly one clean copy — don't try to figure out which existing copy to keep, just start clean.

### A dynamic route folder does not serve its parent path
Unchanged from prior revision.

### Supabase returns ONLY the columns you name in `.select()`
A column that exists in the database but isn't listed comes back `undefined`, not `null` — and if the calling code has a `?? false` or `?? 0` fallback, the feature silently does nothing rather than erroring. This caused a badge to never render and counts to stay wrong across two rounds of debugging. **Properly generated types catch this; a type cast hides it (ADR 012).**

### Never cast around stale generated types — regenerate them
```powershell
npx supabase gen types typescript --linked > src/lib/database.types.ts
```
Run after every migration that adds or changes a column. A cast like `(row as { col?: T }).col` silences the stale-type error *and* the real errors in the same area.

### A stat reading zero may mean its source is never written to
`admin_stats` computed revenue from the `payments` table, which nothing in the codebase ever writes to — a full search found only admin nav labels. The dashboard showed ₦0 with six paid applications. **Check the write path before debugging the read path.**

---

## VIII-B. PLATFORM LIMITS THAT AREN'T IN YOUR CODE

These are constraints imposed by Next.js and Vercel, not by anything in this repo. They cause failures that look like application bugs.

| Limit | Value | Where it's set | Notes |
|---|---|---|---|
| Server Action request body | **1MB by default** | `next.config.ts` → `experimental.serverActions.bodySizeLimit` | Currently set to `4mb`. Blocked a real student's homework upload before any code ran. |
| Vercel serverless function payload | **~4.5MB, hard** | Platform — not configurable | Raising `bodySizeLimit` above this does NOT help; it fails higher up with a more confusing error. This is why the limit is 4mb, not 25mb. |
| Supabase Storage object size | Bucket-configurable | Supabase dashboard | Not currently the binding constraint. |

**The real fix for larger uploads** is direct-to-Supabase: mint a signed upload URL server-side, have the browser upload straight to storage, bypassing Vercel entirely. Removes the ceiling and takes load off serverless functions. Not yet built.

**Rule: advertised limits in UI copy must be derived from the real constraint.** The upload UI promised "up to 25MB" while no layer of the stack supported more than ~4.5MB.

---

## IX–XII. Deployment pipeline, monitoring, performance, smoke test

Unchanged from prior revision.

---

**Need help?** Refer to this doc, `pg_proc`/`pg_policies`/`information_schema.columns` directly, the Storage browser, doc 07 for whether this exact bug has already happened, or the smoke test.
