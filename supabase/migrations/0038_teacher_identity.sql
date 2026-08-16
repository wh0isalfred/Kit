-- 0038 · Teacher identity (REVISED)
-- ───────────────────────────────────────────────────────────────
-- CORRECTION: the original version of this migration dropped `teachers`
-- outright, on the assumption (stated as "confirmed unused") that it
-- was dead weight. That assumption was wrong and the push failed with
-- a real, useful error:
--
--   cannot drop table teachers because other objects depend on it
--   - batches.teacher_id     (foreign key)
--   - submissions.graded_by  (foreign key)
--   - admin_stats            (view, via `WHERE teachers.active`)
--
-- Verified directly against information_schema before writing this
-- version (never trust a doc's or a memory's claim about a table's
-- shape over the actual source — the standing rule this whole project
-- already runs on). teachers already has: id, user_id (nullable, 0
-- rows use it), name, email (citext), phone, active, created_at,
-- updated_at. It was clearly meant to grow a real auth link — user_id
-- already exists, just never finished or used. This migration finishes
-- that instead of replacing the table.
--
-- teachers.id stays the PK that batches.teacher_id and
-- submissions.graded_by point to — unchanged, not touched by this
-- migration. teachers.user_id becomes the real, enforced link to
-- auth.users for login/RLS purposes. The two are deliberately
-- different concerns: "which teacher graded this submission" (id)
-- doesn't need to change just because "how does a teacher log in"
-- (user_id) is being added.
--
-- Teachers get real Supabase Auth accounts (email/password invite,
-- same mechanism admin already uses — see doc 08 §1 for why this is
-- not a permanent architectural choice: auth.uid() is provider-
-- agnostic, so switching to SSO later touches only the login page and
-- Supabase's Auth provider config, never this table or any RLS policy
-- below).
--
-- Read-only to the teacher themselves in v1 (doc 08 §1): admin writes
-- everything here, teachers only ever SELECT their own row. One less
-- write path to get RLS wrong on while this is new.

alter table teachers
  add column if not exists role_title      text,
  add column if not exists created_by      uuid references auth.users(id),
  add column if not exists deactivated_at  timestamptz,
  add column if not exists deactivated_by  uuid references auth.users(id);

-- user_id becomes the real, enforced auth link. Unique so one auth
-- account can't back two teacher rows — that would make
-- is_teacher_for_batch() (0039) ambiguous about which teacher a
-- session actually is.
alter table teachers
  add constraint teachers_user_id_unique unique (user_id);

comment on table teachers is
  'Teacher identity. id is the stable PK used by batches.teacher_id and '
  'submissions.graded_by (unchanged, predates this migration). user_id '
  'links to auth.users for login/RLS once a teacher has a real account '
  '— nullable because a teacher row can exist before their invite is '
  'accepted. Admin-write, teacher-read-only-their-own-row (0038).';
comment on column teachers.user_id is
  'auth.users.id once this teacher has accepted their invite and logged '
  'in at least once. NULL = invited but not yet activated, or a legacy '
  'row from before real teacher accounts existed. is_teacher_for_batch() '
  '(0039) joins through this column, not teachers.id, to find grants.';
comment on column teachers.active is
  'The kill switch — pre-existing column, now load-bearing for access '
  'control too. Flipping to false revokes all batch access in one '
  'write (checked by is_teacher_for_batch(), 0039), no cascade of '
  'deletes needed. admin_stats.teachers_active already reads this '
  'column (confirmed via pg_get_viewdef before writing this migration) '
  '— unaffected by anything in this file.';

-- profiles.role gains 'teacher' alongside the existing 'admin'.
-- Constraint name looked up at runtime rather than assumed, since
-- guessing a name wrong here either silently no-ops or throws.
do $$
declare
  v_constraint_name text;
begin
  select con.conname into v_constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'profiles'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%role%';

  if v_constraint_name is not null then
    execute format('alter table profiles drop constraint %I', v_constraint_name);
  end if;
end $$;

alter table profiles
  add constraint profiles_role_check check (role in ('admin', 'teacher'));


-- ── Row Level Security ────────────────────────────────────────
-- teachers had no RLS before this (it was an empty, unused-for-access
-- table). Every access question answered explicitly per ADR 011 — no
-- `for all` shortcut. A teacher can read their OWN row via user_id,
-- nothing else, no writes.

alter table teachers enable row level security;

create policy "admins full access to teachers"
  on teachers for all
  using (is_admin());

create policy "teachers read only their own row"
  on teachers for select
  using (user_id = auth.uid());

-- Deliberately no INSERT/UPDATE/DELETE policy for teachers on their own
-- row — v1 is admin-write-only, teacher-read-only (doc 08 §1). If self-
-- service profile editing is wanted later, it's an additive policy, not
-- a redesign.
