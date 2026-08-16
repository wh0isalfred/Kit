-- 0039 · Teacher batch assignment (REVISED)
-- ───────────────────────────────────────────────────────────────
-- CORRECTION from the original version: teacher_batches.teacher_id now
-- references teachers(id), not auth.users(id) directly. This follows
-- 0038's finding that teachers.id (the existing PK, already used by
-- batches.teacher_id and submissions.graded_by) and teachers.user_id
-- (the auth link) are different columns. Referencing teachers(id) here
-- keeps ONE consistent meaning of "teacher_id" across the schema —
-- batches.teacher_id, submissions.graded_by, and teacher_batches.
-- teacher_id all now point at the same thing. Referencing auth.users
-- directly here (the original version) would have made this the only
-- place in the schema where "teacher_id" meant something different,
-- which is exactly the kind of quiet inconsistency this project's own
-- bug history warns about.
--
-- A teacher is assigned directly to batches — no programme-level grant
-- layer above it. Considered and deliberately rejected (doc 08 §7):
-- programme membership is fully derivable from
-- batches.course_slug → courses.type, so a separate grant would only
-- ever agree or silently disagree with the batch-level grants, never
-- add real information. If "grant a teacher to an entire programme,
-- all current and future batches" is ever wanted, that's a UI
-- convenience writing these same rows, not a schema change.
--
-- Strictly the teacher's own batches, no exceptions (doc 08 §1) — no
-- visibility into another teacher's batches, not even read-only.

create table teacher_batches (
  teacher_id  uuid not null references teachers(id) on delete cascade,
  batch_id    uuid not null references batches(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references auth.users(id),
  primary key (teacher_id, batch_id)
);

comment on table teacher_batches is
  'Which batches a teacher can access. teacher_id references teachers(id) '
  '— the same id batches.teacher_id and submissions.graded_by already '
  'use, NOT auth.users directly (see correction note above). The ONLY '
  'grant layer — no programme-level grant above this, see doc 08 §7. '
  'Written as independent per-batch rows from the admin UI (one '
  'checkbox = one insert/delete), never a bulk diff-and-save, so a '
  'partial failure is never ambiguous about which grants actually '
  'landed.';


-- ── The access-check helper ───────────────────────────────────
-- Mirrors is_admin()'s existing shape. SECURITY DEFINER so it can read
-- teacher_batches/teachers regardless of the calling context's own RLS
-- visibility into those tables — same trust pattern as every other
-- helper in this project (doc 02 §II.A).
--
-- Joins auth.uid() -> teachers.user_id -> teachers.id -> teacher_batches,
-- because the caller's session only gives us auth.uid(); we have to
-- resolve which teachers.id row that corresponds to before we can check
-- teacher_batches at all. teachers.user_id is UNIQUE (0038), so this
-- resolves to at most one row — no ambiguity.
--
-- Index note: teachers_user_id_unique (0038) backs the first join,
-- the primary key on teacher_batches (teacher_id, batch_id) backs the
-- second — both indexed lookups, no table scan, so calling this once
-- per row during an RLS check carries no N+1 risk even as the batch/
-- submission count grows.

create or replace function is_teacher_for_batch(p_batch_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from teachers t
    join teacher_batches tb on tb.teacher_id = t.id
    where t.user_id = auth.uid()
      and tb.batch_id = p_batch_id
      and t.active
  );
$$;

comment on function is_teacher_for_batch is
  'True if the calling auth.uid() resolves (via teachers.user_id) to an '
  'ACTIVE teacher assigned to p_batch_id. Deactivating a teacher '
  '(teachers.active = false) revokes every batch at once through this '
  'check — no cascade of deletes needed on teacher_batches itself.';


-- ── Row Level Security on teacher_batches itself ──────────────
-- A teacher can see which batches THEY hold, nothing else — not other
-- teachers' rows, no write access (grants are admin-only). The policy
-- has to resolve auth.uid() -> teachers.id the same way the helper
-- does, since teacher_batches.teacher_id is teachers.id, not auth.uid()
-- directly.

alter table teacher_batches enable row level security;

create policy "admins full access to teacher_batches"
  on teacher_batches for all
  using (is_admin());

create policy "teachers read only their own grants"
  on teacher_batches for select
  using (
    teacher_id in (select id from teachers where user_id = auth.uid())
  );

-- Deliberately no INSERT/UPDATE/DELETE policy for teachers here —
-- assigning batches is an admin action, full stop.
