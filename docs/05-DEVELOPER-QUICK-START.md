# Developer Quick Start Guide

**For:** New developers or AI assistants picking up KIT
**Last updated:** 12 August 2026 (session 8) — two new gotchas added, both from real launch-day bugs; folder structure has one real addition.

---

## I. LOCAL SETUP — unchanged from prior revision

---

## II. FOLDER STRUCTURE — one real addition

Everything from the prior revision is unchanged, plus:

```
src/
└── lib/
    └── countries.ts     # NEW — 248 countries, dial codes, generated from a
                          # verified public dataset (not typed by hand — see
                          # doc 07 Bug 6 for a real data-derivation bug caught
                          # in that process before it shipped). Imported by
                          # ApplicationForm.tsx for the country dial-code picker.
```

Everything else — the batch shell tree, the summer/smportal routes, the auth gate location — unchanged from prior revision.

---

## III. COMMON TASKS — unchanged from prior revision

**One pattern worth internalizing before writing any new summer-student-facing read:**
```typescript
// WRONG ❌ — will silently return nothing for every student
const { data } = await supabase.from("summer_students").select("...").eq("id", session.sid);

// RIGHT ✅ — matches the pattern used everywhere else
const { data } = await supabase.rpc("get_my_summer_student", { p_summer_student_id: session.sid });
```
Summer students have no Supabase Auth session — `is_admin()` is always false for them. A raw table query gated by RLS that only grants `is_admin()` access will compile fine, run fine, and return nothing, for every student, silently. This exact mistake broke the entire student portal on launch day (doc 07, Bug 2) and, independently, all resource downloads (doc 07, Bug 3). Before writing a new raw `.from(table).select()` anywhere in student-facing code, check whether that table's RLS actually grants a non-admin role read access — if the only policy is `ALL` + `is_admin()`, it won't work, and it won't tell you why.

---

## IV. DATABASE WORKFLOW — unchanged

---

## V. STYLING GUIDE — one important addition

**Before adding CSS for any class family that's already been styled once, search the whole stylesheet first:**
```powershell
Select-String -Path "src\app\globals.css" -Pattern "\.your-class-name"
```
CSS does not error on a duplicate rule — the browser just applies whichever matching definition comes later in the file. A real incident this session: three separate rounds of "here's the CSS to add" for a redesigned component were each pasted *in addition to* the previous round instead of replacing it. The result was several duplicate, conflicting definitions of the same classes, plus references to leftover class names from an even earlier design that the component no longer used — while the classes the *current* component code actually needed weren't in the file at all. Every round of debugging was reasoning about a version of the file that didn't match reality, because nobody had looked at the whole file, only at what was being added to it. Full account in doc 07, Bug 5.

**If a redesign "still looks the same" after a CSS change that should have visibly changed it, suspect a duplicate/stale rule before suspecting the new CSS is wrong.**

---

## VI. DEBUGGING TIPS — one addition

### "It works when I test it, but not for [some other role/user]"
Check RLS and storage policies before anything else, specifically whether the working case is an admin and the failing case isn't. A wrong path or wrong data fails identically for everyone; a permissions gap fails differently depending on who's asking. See doc 02 §II.A and doc 07, Bugs 2–3.

### Everything else — unchanged from prior revision

---

## VII. GIT WORKFLOW — unchanged

## VIII. TESTING LOCALLY — unchanged, plus:
**Test the actual portal and resource-download flow as a real student session, not just as an admin.** Both were completely broken in a way that only showed up for a non-admin caller — testing exclusively from an admin-logged-in browser would never have caught either bug.

## IX. DEPLOYMENT — unchanged

---

## X. COMMON ERRORS & FIXES — additions

| Error / symptom | Cause | Fix |
|-------|-------|-----|
| Works for admin, "Couldn't open that file" / blank data for everyone else | Table or bucket has only an `is_admin()`-gated `ALL` policy | Add a scoped `SELECT` policy for the actual calling role, or a `SECURITY DEFINER` function for table reads |
| CSS change deployed but visual result looks unchanged, or looks like a mix of old and new | Duplicate/stale rules earlier in the same stylesheet | Search for every occurrence of the class names first, delete all of them, paste one clean copy |
| File downloads open inline instead of downloading | Missing `download` option on `createSignedUrl` | Add `{ download: filename }` as the third argument |

Everything else — unchanged from prior revision.

---

**Still stuck?** doc 02, doc 07 (check if this exact bug has already happened), Supabase/Next.js docs, or ask Alfred.

**Last verified:** 12 August 2026 (session 8)
