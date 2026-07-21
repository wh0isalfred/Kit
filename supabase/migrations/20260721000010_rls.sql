-- ═══════════════════════════════════════════════════════════════
-- 0010 · Row Level Security
-- ═══════════════════════════════════════════════════════════════
-- ADR 003: the database is the enforcement point. Application-level
-- filtering is defence in depth, not the mechanism. A forgotten
-- `WHERE batch_id = ...` in one new route must not be able to expose
-- another family's child.
--
-- TWO THINGS TO KNOW BEFORE EDITING THIS FILE:
--
-- 1. Every helper is SECURITY DEFINER with a pinned search_path.
--    Both matter. Definer lets the helper read `profiles` without
--    triggering the policy on `profiles`, which would recurse
--    infinitely. The pinned search_path stops a caller shadowing
--    `profiles` with their own table and escalating privileges —
--    a definer function without one is a real vulnerability, not a
--    style nit.
--
-- 2. RLS does not filter columns. The teacher's restricted view of
--    student fields is a VIEW (0011), not a policy. Doc 2 §5.4.


-- ───────────────────────────────────────────────────────────────
-- Helpers
-- ───────────────────────────────────────────────────────────────

create or replace function app_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select role from profiles where user_id = auth.uid();
$$;

create or replace function is_admin()
returns bool
language sql stable security definer
set search_path = public
as $$
  select coalesce((select role from profiles where user_id = auth.uid()) = 'admin', false);
$$;

create or replace function app_student_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select id from students where user_id = auth.uid();
$$;

create or replace function app_teacher_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select id from teachers where user_id = auth.uid();
$$;

-- A SET of batches, not one.
--
-- The old schema assumed a teacher holds exactly one batch. That
-- stops being true the moment KIT runs two cohorts at once, and a
-- scalar helper would silently scope such a teacher to whichever
-- batch happened to come back first. Students get one element;
-- teachers get however many they teach.
create or replace function app_batch_ids()
returns uuid[]
language sql stable security definer
set search_path = public
as $$
  select case (select role from profiles where user_id = auth.uid())
    when 'student' then
      array(select batch_id from students
             where user_id = auth.uid() and batch_id is not null)
    when 'teacher' then
      array(select b.id from batches b
             join teachers t on t.id = b.teacher_id
            where t.user_id = auth.uid())
    else '{}'::uuid[]
  end;
$$;

create or replace function in_my_batch(p_batch_id uuid)
returns bool
language sql stable security definer
set search_path = public
as $$
  select p_batch_id = any(app_batch_ids());
$$;


-- ───────────────────────────────────────────────────────────────
-- Enable RLS everywhere
-- ───────────────────────────────────────────────────────────────
-- Enabled on every table without exception. A table with RLS off is
-- fully readable by any authenticated user through PostgREST, and
-- "we'll enable it later" is how that becomes permanent.

alter table profiles               enable row level security;
alter table courses                enable row level security;
alter table teachers               enable row level security;
alter table batches                enable row level security;
alter table students               enable row level security;
alter table applications           enable row level security;
alter table payments               enable row level security;
alter table resources              enable row level security;
alter table class_sessions         enable row level security;
alter table attendance             enable row level security;
alter table assignments            enable row level security;
alter table submissions            enable row level security;
alter table announcements          enable row level security;
alter table kit_points_rules       enable row level security;
alter table kit_points_ledger      enable row level security;
alter table certificates           enable row level security;
alter table summer_students        enable row level security;
alter table summer_content         enable row level security;
alter table summer_cohorts         enable row level security;
alter table summer_access_attempts enable row level security;
alter table audit_log              enable row level security;


-- ───────────────────────────────────────────────────────────────
-- profiles
-- ───────────────────────────────────────────────────────────────
-- No recursion: is_admin() is SECURITY DEFINER and so bypasses this
-- policy when it reads profiles.

create policy profiles_read_own on profiles for select
  using (user_id = auth.uid() or is_admin());

create policy profiles_admin_write on profiles for all
  using (is_admin()) with check (is_admin());


-- ───────────────────────────────────────────────────────────────
-- courses — public catalogue
-- ───────────────────────────────────────────────────────────────
-- The marketing site reads this anonymously. Only live and
-- coming_soon are public; archived courses stay internal.

create policy courses_public_read on courses for select
  to anon, authenticated
  using (status in ('live', 'coming_soon') or is_admin());

create policy courses_admin_write on courses for all
  using (is_admin()) with check (is_admin());


-- ───────────────────────────────────────────────────────────────
-- teachers
-- ───────────────────────────────────────────────────────────────

create policy teachers_read on teachers for select
  using (
    is_admin()
    or user_id = auth.uid()
    -- a student may see who teaches their batch
    or exists (
      select 1 from batches b
       where b.teacher_id = teachers.id
         and in_my_batch(b.id)
    )
  );

create policy teachers_admin_write on teachers for all
  using (is_admin()) with check (is_admin());


-- ───────────────────────────────────────────────────────────────
-- batches
-- ───────────────────────────────────────────────────────────────

create policy batches_read on batches for select
  using (is_admin() or in_my_batch(id));

create policy batches_admin_write on batches for all
  using (is_admin()) with check (is_admin());


-- ───────────────────────────────────────────────────────────────
-- students
-- ───────────────────────────────────────────────────────────────
-- Doc 1 §6.2: a teacher may see name, email, batch and KIT score —
-- nothing else. RLS cannot express that; it gates rows, not columns.
--
-- So teachers are given NO direct select on this table. They read
-- students through `students_for_teacher` (0011), which exposes only
-- the four permitted columns.
--
-- Relying on the UI simply not rendering phone and parent contact
-- would be theatre: the row still travels to the client and anyone
-- can open a network tab.

create policy students_read_own on students for select
  using (is_admin() or user_id = auth.uid());

create policy students_admin_write on students for all
  using (is_admin()) with check (is_admin());

-- Students may update nothing on their own row. Points, batch and
-- status are all system-owned; there is no legitimate self-edit.


-- ───────────────────────────────────────────────────────────────
-- applications and payments — admin only
-- ───────────────────────────────────────────────────────────────
-- Applications are written by the anon application form through a
-- SECURITY DEFINER Server Action, never by a direct client insert,
-- so there is deliberately no anon insert policy here. A public
-- insert policy would let anyone write arbitrary rows into the
-- admissions table.

create policy applications_admin_all on applications for all
  using (is_admin()) with check (is_admin());

create policy payments_admin_all on payments for all
  using (is_admin()) with check (is_admin());

-- A student may see their own payment history. Parents have no
-- login (Doc 1 §6.3), so this is the only in-product visibility.
create policy payments_read_own on payments for select
  using (student_id = app_student_id());


-- ───────────────────────────────────────────────────────────────
-- resources
-- ───────────────────────────────────────────────────────────────
-- Doc 2 §5.4: the locked filter lives INSIDE the policy. If locking
-- were applied in the query instead, a locked resource's URL would
-- be one API call away from any student who is curious — and this
-- audience is specifically curious teenagers.

create policy resources_read on resources for select
  using (
    is_admin()
    or (app_role() = 'teacher' and in_my_batch(batch_id))
    or (app_role() = 'student' and in_my_batch(batch_id) and locked = false)
  );

create policy resources_teacher_write on resources for all
  using (is_admin() or (app_role() = 'teacher' and in_my_batch(batch_id)))
  with check (is_admin() or (app_role() = 'teacher' and in_my_batch(batch_id)));


-- ───────────────────────────────────────────────────────────────
-- class_sessions
-- ───────────────────────────────────────────────────────────────

create policy class_sessions_read on class_sessions for select
  using (is_admin() or in_my_batch(batch_id));

create policy class_sessions_teacher_write on class_sessions for all
  using (is_admin() or (app_role() = 'teacher' and in_my_batch(batch_id)))
  with check (is_admin() or (app_role() = 'teacher' and in_my_batch(batch_id)));


-- ───────────────────────────────────────────────────────────────
-- attendance
-- ───────────────────────────────────────────────────────────────

create policy attendance_read on attendance for select
  using (
    is_admin()
    or student_id = app_student_id()
    or (app_role() = 'teacher' and exists (
          select 1 from class_sessions cs
           where cs.id = attendance.session_id and in_my_batch(cs.batch_id)))
  );

-- A student may mark themselves present, but only for a session in
-- their own batch that is currently live. Without the live check,
-- a student could backfill attendance for a class they missed and
-- collect punctuality points for it.
create policy attendance_student_join on attendance for insert
  with check (
    student_id = app_student_id()
    and exists (
      select 1 from class_sessions cs
       where cs.id = session_id
         and in_my_batch(cs.batch_id)
         and cs.status = 'live'
    )
  );

create policy attendance_teacher_write on attendance for all
  using (
    is_admin()
    or (app_role() = 'teacher' and exists (
          select 1 from class_sessions cs
           where cs.id = attendance.session_id and in_my_batch(cs.batch_id)))
  )
  with check (
    is_admin()
    or (app_role() = 'teacher' and exists (
          select 1 from class_sessions cs
           where cs.id = session_id and in_my_batch(cs.batch_id)))
  );


-- ───────────────────────────────────────────────────────────────
-- assignments
-- ───────────────────────────────────────────────────────────────

create policy assignments_read on assignments for select
  using (
    is_admin()
    or (app_role() = 'teacher' and in_my_batch(batch_id))
    or (app_role() = 'student' and in_my_batch(batch_id) and published)
  );

create policy assignments_teacher_write on assignments for all
  using (is_admin() or (app_role() = 'teacher' and in_my_batch(batch_id)))
  with check (is_admin() or (app_role() = 'teacher' and in_my_batch(batch_id)));


-- ───────────────────────────────────────────────────────────────
-- submissions
-- ───────────────────────────────────────────────────────────────
-- A student sees only their own work — never a classmate's. This is
-- deliberately tighter than batch scope: the leaderboard shows
-- points, not answers.

create policy submissions_read on submissions for select
  using (
    is_admin()
    or student_id = app_student_id()
    or (app_role() = 'teacher' and exists (
          select 1 from assignments a
           where a.id = submissions.assignment_id and in_my_batch(a.batch_id)))
  );

create policy submissions_student_insert on submissions for insert
  with check (
    student_id = app_student_id()
    and exists (
      select 1 from assignments a
       where a.id = assignment_id and in_my_batch(a.batch_id) and a.published
    )
  );

-- A student may edit their own submission only while it is ungraded.
-- Once graded it is frozen — otherwise a student could change their
-- answer after seeing the mark.
create policy submissions_student_update on submissions for update
  using (student_id = app_student_id() and graded_at is null)
  with check (student_id = app_student_id() and graded_at is null);

create policy submissions_teacher_grade on submissions for update
  using (
    is_admin()
    or (app_role() = 'teacher' and exists (
          select 1 from assignments a
           where a.id = submissions.assignment_id and in_my_batch(a.batch_id)))
  )
  with check (
    is_admin()
    or (app_role() = 'teacher' and exists (
          select 1 from assignments a
           where a.id = assignment_id and in_my_batch(a.batch_id)))
  );


-- ───────────────────────────────────────────────────────────────
-- announcements
-- ───────────────────────────────────────────────────────────────

create policy announcements_read on announcements for select
  using (is_admin() or in_my_batch(batch_id));

create policy announcements_teacher_write on announcements for all
  using (is_admin() or (app_role() = 'teacher' and in_my_batch(batch_id)))
  with check (is_admin() or (app_role() = 'teacher' and in_my_batch(batch_id)));


-- ───────────────────────────────────────────────────────────────
-- KIT Points
-- ───────────────────────────────────────────────────────────────
-- A student may read their own ledger — this is what makes "why do
-- I have 120 points" answerable to the student, not just to admin.
-- Nobody but admin writes it directly; awards go through
-- award_kit_points(), which is SECURITY DEFINER.

create policy kit_points_rules_read on kit_points_rules for select
  to authenticated using (true);

create policy kit_points_rules_admin on kit_points_rules for all
  using (is_admin()) with check (is_admin());

create policy kit_points_read on kit_points_ledger for select
  using (
    is_admin()
    or student_id = app_student_id()
    or (app_role() = 'teacher' and exists (
          select 1 from students s
           where s.id = kit_points_ledger.student_id and in_my_batch(s.batch_id)))
  );

create policy kit_points_admin_write on kit_points_ledger for all
  using (is_admin()) with check (is_admin());


-- ───────────────────────────────────────────────────────────────
-- certificates
-- ───────────────────────────────────────────────────────────────

create policy certificates_read on certificates for select
  using (
    is_admin()
    or student_id = app_student_id()
    or (app_role() = 'teacher' and in_my_batch(batch_id))
  );

create policy certificates_admin_write on certificates for all
  using (is_admin()) with check (is_admin());


-- ───────────────────────────────────────────────────────────────
-- Summer
-- ───────────────────────────────────────────────────────────────
-- Summer students have NO Supabase Auth session (ADR 002), so none
-- of these policies apply to them. The portal reads through a
-- SECURITY DEFINER function behind the signed cookie instead
-- (get_summer_portal, 0011).
--
-- Consequence: `anon` gets no access at all here. The gate is the
-- Server Action, not the anon key.

create policy summer_students_admin on summer_students for all
  using (is_admin()) with check (is_admin());

create policy summer_content_admin on summer_content for all
  using (is_admin()) with check (is_admin());

create policy summer_cohorts_admin on summer_cohorts for all
  using (is_admin()) with check (is_admin());

create policy summer_attempts_admin on summer_access_attempts for select
  using (is_admin());


-- ───────────────────────────────────────────────────────────────
-- audit_log
-- ───────────────────────────────────────────────────────────────
-- Read-only even for admin. An audit log an administrator can edit
-- is not an audit log. Writes happen only through write_audit(),
-- which is SECURITY DEFINER and therefore bypasses this.

create policy audit_log_admin_read on audit_log for select
  using (is_admin());
