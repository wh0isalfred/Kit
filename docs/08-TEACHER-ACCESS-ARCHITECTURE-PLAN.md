# 08 — Teacher Identity, Batch Access & Per-Batch Content: Build Plan

**Status:** 🟡 PROPOSED — not yet approved, not yet built. Nothing in this
document is live. Written for Alfred's review; execution begins only after
explicit sign-off, then proceeds step by step, each step confirmed working
before the next begins (same discipline as doc 06's build order).

**For:** Alfred, and whoever picks this up next (human or AI)
**Companion docs:** 02 (RPC/security patterns this follows), 03 (admin
account management, the pattern teacher management extends), 06 (batch
shell, the UI pattern this reuses), 07 (bug history — the mistakes this
plan is written to not repeat)

---

## 0. WHY THIS DOCUMENT EXISTS

The 12-week programme is starting. Two real gaps block it:

1. **"Teacher" isn't an identity.** Today it's a free-text string typed
   into `summer_batch_sessions` (per doc 01 §25 / structure.txt's own
   note on `/admin/teachers` being a deliberate stub). There is no login,
   no session, no way to scope what a teacher can see or do.
2. **Week content (title, note to students) is cohort-wide**, not
   per-batch (doc 01 §23, doc 06 §VIII, confirmed directly in the current
   "Weekly content — Summer 2026" admin screen). Two batches in the same
   cohort cannot currently show different material for the same week
   number.

This document proposes closing both gaps together, because the second one
needs to be teacher-editable, which means it needs the first one to exist
first.

---

## 1. DECISIONS ALREADY MADE (do not re-litigate these mid-build)

- A teacher is assigned directly to **batches**, not to a programme layer
  above batches. (Considered and deliberately rejected — see §7.)
- A teacher's batch access is **strictly their own batches, no exceptions**
  — no visibility into other teachers' batches, not even read-only, for now.
- Teacher permissions, v1: **grading (yes), attendance (yes), Class tab
  including week title/content (yes, full read/write), Resources (read-only),
  roster/enrolment (no access at all)**.
- Per-batch week content is needed for **12-week first**, summer second —
  but the schema is built once, shared by both, since the underlying gap
  (cohort-wide content) is identical in both programmes.
- Login: **email/password via Supabase Auth invite**, same mechanism
  admin already uses. Explicitly not SSO yet — see §8 for why this
  decision doesn't lock in anything permanent.
- `/teacher` is the teacher's own landing page — identity header (name,
  role title) plus their batch cards in one view, same shape as the
  student portal's existing "Hello, Kit 👋" pattern — not a separate
  profile route with an extra click in between.
- A teacher's own profile (`teacher_profiles`) is **fully read-only to
  the teacher in v1** — admin edits name/phone/email, teacher just views.
  Same boundary already applied to Resources: teacher reads, admin owns
  the write, one less write path to get RLS wrong on while this is new.
- Existing `teachers` table: empty, unused beyond an `admin_stats` count.
  Treated as dead; **`teacher_profiles` replaces it.** (Confirm its exact
  columns before dropping it — see Step 1's checklist.)

---

## 2. THE ACCESS MODEL, PRECISELY

Three identity/access tiers now exist side by side. Naming them precisely
matters, because doc 02 §II.A's entire lesson is that RLS gaps are invisible
until the wrong role hits them:

| Tier | Identity mechanism | Scope |
|---|---|---|
| Admin | Supabase Auth, `profiles.role='admin'` | Everything |
| **Teacher (NEW)** | Supabase Auth, `profiles.role='teacher'` | Only batches explicitly granted via `teacher_batches` |
| Summer student | Signed cookie, no `auth.users` row | Only their own data, via `SECURITY DEFINER` RPCs |
| 12-week student | Supabase Auth (real account) | Only their own data |

**The rule this plan follows throughout, taken directly from ADR 011:**
for every table or bucket a teacher can touch, read/write/update/delete
must each be explicitly answered — "no policy" is not the same as "no
access," it's silent, total denial that looks identical to a bug from the
outside. This has already caused three full outages in this project. This
plan is written specifically to not be a fourth.

---

## 3. USER FLOWS

### 3.1 Admin creates a teacher

```
/admin/teachers  (real page, replacing the current stub)
  → "Add teacher" → name, work email, phone
  → Server Action:
      1. supabase.auth.admin.inviteUserByEmail(email)
      2. insert into teacher_profiles (user_id, full_name, phone,
         created_by = <admin's user_id>)
      3. insert into profiles (user_id, role='teacher') on conflict
         do update
  → Teacher exists, invited, ZERO batch access — correct, safe default.
```

### 3.2 Admin assigns batches

```
/admin/teachers/[teacherId]
  → List of all batches (grouped by programme for readability only —
    no permission layer implied by the grouping)
  → Each batch is an independent checkbox → independent insert/delete
    on teacher_batches, no bulk-save step (see §7 for why granular
    writes were chosen over one big save).
```

### 3.3 Teacher logs in

```
/teacher/login       (Supabase Auth, separate login page from /admin/login)
/teacher              "Hello, {full_name}" + role_title, read-only —
                       then a card grid of ONLY their assigned batches,
                       same visual pattern as doc 06 §III's admin cards
                       and the existing student portal homepage. One
                       page, not a separate profile route — a teacher's
                       most common action is "see my batches," so there's
                       no click in between login and that.
/teacher/batch/[id]/overview    read-only, same component admin uses
/teacher/batch/[id]/class       full read/write — includes week title/
                                 note (the content model in §4)
/teacher/batch/[id]/resources   read-only
/teacher/batch/[id]/homework    full read/write — grading queue,
                                 same HomeworkReview.tsx component
```

**Editing their own profile (name, phone, email) is out of scope for v1**
— `teacher_profiles` is admin-write-only, teacher-read-only, same
boundary as Resources. If self-service profile editing is wanted later,
it's an additive RLS policy on `teacher_profiles`, not a redesign.

No roster, no applications, no other teachers' batches, anywhere in this
tree — enforced at the RLS layer (§5), not just hidden in the UI, because
UI-only hiding is exactly the class of assumption that caused the summer
portal outage.

### 3.4 Editing per-batch week content (the screenshot feature, corrected)

```
Inside /teacher/batch/[id]/class OR /admin/summer/batch/[id]/class:
  → Week selector (existing component/pattern)
  → Title, Note to students, Published checkbox — now scoped to
    THIS batch's row for THIS week, not the cohort's
  → Save → upsert into batch_week_content
  → Portal ("Today's class") reads the same batch-scoped row via a
    SECURITY DEFINER RPC — unpublished still means "materials coming
    soon," unchanged UX contract, different underlying table.
```

---

## 4. SCHEMA (proposed — not yet migrated)

```sql
-- Teacher identity
create table teacher_profiles (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  work_email    text not null,
  phone         text,
  role_title    text,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id),
  deactivated_at timestamptz,
  deactivated_by uuid references auth.users(id)
);

alter table profiles
  add constraint profiles_role_check check (role in ('admin', 'teacher'));

-- Batch-level grant (the only grant layer — see §7)
create table teacher_batches (
  teacher_id  uuid not null references auth.users(id) on delete cascade,
  batch_id    uuid not null references batches(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references auth.users(id),
  primary key (teacher_id, batch_id)
);

-- Per-batch weekly content — replaces the cohort-wide title/note fields
create table batch_week_content (
  id               uuid primary key default gen_random_uuid(),
  batch_id         uuid not null references batches(id) on delete cascade,
  week_number      int  not null,
  title            text,
  note_to_students text,
  published        boolean not null default false,
  updated_at       timestamptz not null default now(),
  updated_by       uuid references auth.users(id),
  unique (batch_id, week_number)
);
```

**Programme/course membership is derived, never stored twice:**
`batches.course_slug → courses.type` already answers "which programme is
this batch in" (confirmed against the existing `courseType` map pattern in
`admin/applications/page.tsx`). Storing a redundant `programme_type` on
`teacher_batches` would create a second place for that fact to live and
silently disagree with the first — the exact shape of bug the CSS
duplication incident (doc 07 Bug 5) already cost real debugging time on,
in a different layer.

---

## 5. RLS — WRITTEN OUT EXPLICITLY, PER ADR 011

```sql
create or replace function is_teacher_for_batch(p_batch_id uuid)
returns boolean
language sql security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from teacher_batches tb
    join teacher_profiles tp on tp.user_id = tb.teacher_id
    where tb.teacher_id = auth.uid()
      and tb.batch_id = p_batch_id
      and tp.active
  );
$$;
```

Every teacher-facing table gets FOUR explicit policies (select, insert,
update — delete deliberately omitted where noted), not one `for all`
shortcut. This is slower to write and exactly the point — a missing
policy should be a visible gap in a checklist, not an assumption:

| Table | Teacher SELECT | Teacher INSERT | Teacher UPDATE | Teacher DELETE |
|---|---|---|---|---|
| `batch_week_content` | ✅ own batch | ✅ own batch | ✅ own batch | ❌ never — unpublish via flag, mirrors the students-can't-delete-submissions pattern |
| `summer_submissions` (grading) | ✅ own batch's students | — | ✅ own batch's students (return only) | ❌ |
| `summer_attendance` | ✅ own batch | ✅ own batch | ✅ own batch | ❌ |
| `summer_batch_sessions` (Class tab: live toggle, meet link, instructor) | ✅ own batch | — | ✅ own batch | ❌ |
| `applications`, `students`, `payments`, any roster/enrolment table | ❌ | ❌ | ❌ | ❌ |
| Shared curriculum resources | ✅ (read what's visible to their batch) | ❌ | ❌ | ❌ |
| `teacher_profiles` (their own row only) | ✅ own row only | ❌ | ❌ | ❌ |

This table itself is the actual deliverable of the RLS step — it gets
filled in with real policy names during Step 3, and doc 02 gets a new
entry once confirmed live, the same way the summer storage fix was
documented after confirmation, not before.

**Student-facing read stays on the existing trust model**, unchanged in
shape:

```sql
create or replace function get_my_batch_week_content(p_week int)
returns table(title text, note_to_students text, published boolean)
language sql security definer
set search_path = public, pg_temp
as $$
  select bwc.title, bwc.note_to_students, bwc.published
  from batch_week_content bwc
  join summer_students ss on ss.batch_id = bwc.batch_id
  where ss.id = <the already-cookie-verified summer_student_id>
    and bwc.week_number = p_week
    and bwc.published = true;
$$;
```

Unpublished → no row → existing "materials coming soon" UI fires with
zero changes to the portal's own logic. This is deliberately verified as
a non-change to the student-facing contract, not a redesign.

---

## 6. WHAT STAYS EXACTLY AS-IS (confirming the blast radius is small)

- Admin's own `/admin/summer/batch/[id]` shell — unchanged in route,
  gains the ability to edit the now-per-batch title/note fields where it
  previously edited cohort-wide ones. Everything else on that page is
  untouched.
- The portal's "materials coming soon" fallback — untouched logic,
  different underlying query.
- `summer_batch_sessions` — untouched. Instructor/meet-link/live-toggle
  were already batch-scoped (confirmed by the reference screenshot's own
  caption); this plan does not touch that table at all.
- Summer student auth (signed cookie) — completely untouched. Teachers
  are an entirely separate tier; nothing about how students log in changes.

---

## 7. ALTERNATIVES CONSIDERED AND REJECTED (so this isn't re-argued later)

**A programme-level grant layer (teacher ↔ programme, separate from
teacher ↔ batch) was proposed, then explicitly rejected by Alfred** to
avoid redundancy — programme membership is fully derivable from
`batches.course_slug → courses.type`, so a separate grant would only ever
be able to agree or silently disagree with the batch-level grants, never
add real information. If a future need arises for "grant a teacher to an
entire programme, all current and future batches, without picking each
one" — that's a real, addressable feature request when it comes up, not a
gap in this design; it would be a UI convenience (a "select all in this
programme" button) writing the same `teacher_batches` rows, not a schema
change.

**One big "save all batch assignments" form was considered, rejected in
favor of per-checkbox independent writes** — a partial failure in a bulk
save is ambiguous ("did all five apply?"); independent writes are each
atomically verifiable, same philosophy as the homework queue's
optimistic-with-rollback pattern in doc 06 §V.a.

**SSO (Google Workspace/Entra) was considered for teacher login now,
deferred by Alfred's decision** — email/password via Supabase Auth invite,
matching the existing admin pattern, is correct for the company's current
size. This is explicitly not a permanent architectural choice: because
`auth.uid()` is provider-agnostic in Supabase Auth, switching to OAuth/SSO
later touches the login page and Supabase's Auth provider config only —
zero changes to `teacher_profiles`, `teacher_batches`,
`batch_week_content`, or any RLS policy in this document. This is worth
stating explicitly so nobody treats "we used passwords" as a decision
that needs to be revisited before this schema can be trusted.

**Storing anything payroll/compliance-adjacent (national ID, bank
details) on `teacher_profiles` was considered and explicitly excluded** —
no current feature needs it, and speculative sensitive-data storage is a
liability, not an asset, until there's a real, scoped reason for it.

---

## 8. BUILD ORDER (proposed — execution starts only after sign-off)

Each step ships and is confirmed working before the next begins, same
discipline as doc 06 §IX:

1. **Confirm the existing `teachers` table's actual columns** (not
   guessed) and decide repurpose-vs-retire. Migration: `teacher_profiles`,
   `profiles` role constraint, `teacher_batches`.
2. **RLS policies for `teacher_batches`/`teacher_profiles` themselves**
   — a teacher can SELECT their own `teacher_profiles` row and their own
   `teacher_batches` rows, nothing else, no write access to either
   (matches the read-only decision in §1) — tested in isolation via a
   real teacher session before any UI exists, per doc 06's own "fixed
   the two broken call sites first" discipline of verifying the
   foundation before building on it.
3. **`batch_week_content` migration + RLS**, filling in the table in §5
   with real, confirmed policy names.
4. **`get_my_batch_week_content` RPC + portal query swap** — smallest
   possible change to the student-facing side, confirmed against a real
   student session, not just an admin one (doc 05's own explicit warning:
   admin-only testing is what let the portal-access bug through the
   first time).
5. **`/admin/teachers` real page** — replaces the stub. Add teacher, view/
   edit batch assignments.
6. **`/teacher` route shell** — login, landing, batch cards. Reuses
   existing components (`HomeworkReview.tsx`, etc.) wherever the tab
   content is identical to admin's; new data-fetching layer above them.
7. **Class tab gets the title/note fields**, wired to the same
   `batch_week_content` table, for both `/admin/summer/batch/[id]/class`
   and `/teacher/batch/[id]/class`.
8. **Smoke test as a real teacher account**, not an admin browser —
   confirm the negative cases too: a teacher cannot see another
   teacher's batch, cannot reach `/admin`, cannot see roster/applications
   data anywhere.

---

## 9. OPEN QUESTIONS FOR ALFRED (before Step 1 starts)

- Confirm the existing `teachers` table's columns are safe to abandon
  in favor of `teacher_profiles` — need to see them, not guess.
- Confirm `work_email` should be a plain text field for now (no
  domain-restriction check at signup), given login stays email/password
  for the foreseeable future.
- Confirm there's no existing "instructor" free-text field on
  `summer_batch_sessions` that should be migrated/reconciled once real
  teacher accounts exist, or if that field simply stops being used
  going forward once a batch has a real assigned teacher.

---

**This document is a proposal. Nothing above is built. Work begins at
Step 1 only after Alfred reads this in full and gives explicit
go-ahead.**
