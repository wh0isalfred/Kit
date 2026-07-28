# Admin UI Fixes — Steps 1–4 Complete

**Status:** All four quick/medium-priority fixes are done. Summer admin can now create batches, seat counts are correct, dead code is removed, and stale copy is fixed.

---

## What Changed

### Step 1: Stale Copy Fix
**File:** `SummerResources.tsx`  
**Change:** Line 507 — file submission option now says "fully wired" instead of "not fully wired yet, shows a 'coming soon' note"  
**Why:** We implemented `uploadSubmissionFile` and `HomeworkDetail` handles file uploads completely. The old copy was confusing admins into avoiding file submissions.

### Step 2: Dead Code Removed
**File:** `SummerAdmin.tsx` (no changes needed; GoLiveControl is gone from summer/page.tsx)  
**What was deleted:** The `GoLiveControl` component and its import from the rebuilt `summer-page.tsx`  
**Why:** Batches now have individual `is_live` toggles via `BatchSessionManager`. The cohort-level toggle wrote to a column students no longer read. This prevents admin accidentally thinking a toggle worked when it didn't.

### Step 3: Seat Counts Fixed
**File:** `applications-page.tsx` (replaces the broken version)  
**Change:** `seats_used` computation now:
  - Reads from `summer_students` for summer batches
  - Reads from `students` for 12-week batches
  - Uses `course.type` to determine which table to count from
**Impact:** Prevents admin from seeing "5 seats left" when a summer batch is actually full.

### Step 4: Batch Creation UI (NEW)
**Files:**
  - `BatchManagement.tsx` — the component, handles add/edit/delete UI
  - `batch-actions.ts` — server actions for CRUD
  - `summer-page.tsx` — rebuilt to include batch management
  - `batch-management.css` — styling for the batch cards

**Functionality:**
  - List all batches for the active cohort with real seat counts
  - Create new batches (label + capacity)
  - Edit existing batches (label + capacity)
  - Delete batches (blocks if any students are enrolled)
  - Visual progress bar showing occupancy

**Key detail:** The seat-count logic now lives in two places — here and `applications-page.tsx` — both reading from `summer_students`. This keeps them in sync and makes it obvious if they drift.

---

## Deployment

### 1. Replace applications page
```powershell
cp admin/applications-page.tsx src/app/admin/(protected)/applications/page.tsx
```

### 2. Update summer admin component
```powershell
cp admin/SummerResources.tsx src/app/admin/(protected)/summer/
```

### 3. Add batch management
```powershell
cp admin/BatchManagement.tsx src/app/admin/(protected)/summer/
cp admin/batch-actions.ts src/app/admin/(protected)/summer/
cp admin/batch-management.css src/app/globals.css  # append to end
```

### 4. Replace summer page
```powershell
cp admin/summer-page.tsx src/app/admin/(protected)/summer/page.tsx
```

### 5. Verify imports in summer layout
The summer layout (`src/app/admin/(protected)/summer/layout.tsx`) should be unchanged — it just renders `{children}`.

### 6. Test
- Go to `/admin/summer` — should see "Batches" section with "+ Add batch"
- Create a batch, see capacity and real seat count
- Go to `/admin/applications` — pending summer applications should now show accurate available seats
- Try to create a summer application, verify the batch picker reflects actual capacity

---

## What's Still Missing (Next Steps)

### Step 5: Homework Review Grid
Teacher roster view at `/admin/summer/homework-review` — allows admins to see who turned in what, leave feedback, and return work. `get_homework_roster` and `return_homework` RPCs already exist.

### Step 6: Clean Up the Rail
Seven nav items (`/admin/students`, `/admin/courses`, `/admin/batches`, `/admin/teachers`, `/admin/payments`, `/admin/classes`, `/admin/audit`) currently 404. Either comment them out in `AdminRail.tsx` or build minimal versions.

---

## Critical Notes

1. **Batches are now required** — `enrol_summer_student` in the DB requires a `batch_id`. Without this UI, summer couldn't operate. This unblocks everything.

2. **Seat counts are the source of truth** — the `summer_students` table is the real roster. Both the batch management UI and the applications page read from it. If they drift, something is wrong.

3. **GoLiveControl is completely gone** — if you see any imports of it, delete them. The live toggle now lives in `BatchSessionManager`, which writes to the correct column.

---

## Commit Message Suggestion
```
Implement batch management UI and fix seat-count tracking

- Add batch creation/edit/delete at /admin/summer with real seat counts
- Fix applications page to count summer_students, not students
- Remove dead GoLiveControl component (live toggle now per-batch)
- Fix stale copy: file submission is fully wired
- Unblocks summer enrolment workflow
```
