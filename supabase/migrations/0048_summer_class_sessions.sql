-- 0048 · Real class sessions (Summer v2, Step 3 — schema only)
-- ───────────────────────────────────────────────────────────────
-- Part of the Summer Architecture v2 plan (doc 09). This migration
-- creates summer_class_sessions and its RLS, and adds the new
-- session_id column + partial unique index to summer_attendance.
--
-- DELIBERATELY DOES NOT migrate existing summer_batch_sessions rows
-- into the new table yet -- see the companion preview query. A
-- foreign key below requires a matching batch_week_content row to
-- exist; whether every summer_batch_sessions row satisfies that is
-- unverified against live data. Migrating blind risked a failed
-- transaction on real production data. The data migration is a
-- separate, follow-up piece once that's checked.
--
-- DELIBERATELY DOES NOT touch check_in_attendance() or
-- set_batch_live() -- both keep working EXACTLY as they do today.
-- summer_attendance keeps its existing UNIQUE(summer_student_id, week)
-- constraint untouched; the new session_id column is nullable and
-- unpopulated by anything yet. Zero regression risk to the live,
-- currently-working attendance check-in flow. Rewiring those
-- functions to actually use sessions is Step 4, not this step.

-- ══════════════════════════════════════════════════════════════
-- summer_class_sessions — one row PER ACTUAL CLASS, not per
-- (batch, week). Replaces summer_batch_sessions' upsert-only shape.
-- ══════════════════════════════════════════════════════════════

create table summer_class_sessions (
  id                 uuid primary key default gen_random_uuid(),
  batch_id           uuid not null references batches(id) on delete cascade,
  week_number        int  not null,

  title              text,   -- nullable -- doesn't need to exist days ahead
  teacher_id         uuid references teachers(id) on delete set null,
  instructor_name    text,   -- fallback for a guest/substitute not in `teachers`

  meet_link          text,
  scheduled_start_at timestamptz,
  scheduled_end_at   timestamptz,  -- INFORMATIONAL ONLY, see comment below
  started_at         timestamptz,
  ended_at           timestamptz,

  status             text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'ended', 'cancelled')),

  created_by         uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- A session can only be created for a week that already exists for
  -- this batch. Same composite-FK idiom this codebase already uses
  -- (summer_resources_week_fk, 0016) -- not a novel pattern.
  constraint summer_class_sessions_week_fk
    foreign key (batch_id, week_number)
    references batch_week_content (batch_id, week_number)
    on delete cascade
);

comment on table summer_class_sessions is
  'One row per actual class. Replaces summer_batch_sessions'' upsert- '
  'only (batch_id, week) shape -- multiple sessions per week are now '
  'representable, with real scheduled/live/ended/cancelled history.';

comment on column summer_class_sessions.scheduled_end_at is
  'INFORMATIONAL ONLY (Alfred''s call, Summer v2 plan doc 09 §2). '
  'Effective live state is ALWAYS started_at + batches.live_class_max_minutes '
  '-- this column plays no role in that computation, ever.';

comment on column summer_class_sessions.teacher_id is
  'Nullable, preferred when the instructor is a registered KIT '
  'teacher. instructor_name is the fallback for a guest/substitute '
  '(Alfred''s call, doc 09 §2). Exactly one of the two is expected to '
  'carry the real name; not enforced by a CHECK in v1.';

create index summer_class_sessions_batch_idx
  on summer_class_sessions (batch_id);

-- Enforces AT MOST ONE live session per batch at a time — same
-- partial-unique-index technique as batch_week_content_one_current_per_batch
-- and summer_cohorts_one_active. This was a plain index in an earlier
-- draft of this migration, which would NOT have stopped two sessions
-- in the same batch both being marked 'live' simultaneously — caught
-- and fixed before this file was ever applied, not after.
create unique index summer_class_sessions_one_live_per_batch
  on summer_class_sessions (batch_id)
  where status = 'live';

comment on index summer_class_sessions_one_live_per_batch is
  'At most one status=''live'' row per batch_id. Structural '
  'enforcement, not merely assumed — mirrors batch_week_content_one_current_per_batch.';

create trigger summer_class_sessions_updated_at
  before update on summer_class_sessions
  for each row execute function set_updated_at();


-- ── Row Level Security ────────────────────────────────────────
-- Every access question answered explicitly per ADR 011 -- no `for
-- all` shortcut for teachers. No DELETE policy for teachers,
-- intentionally: end a session via status = 'cancelled'/'ended',
-- never delete the row -- mirrors batch_week_content's identical
-- no-delete rule (0040) for the identical reason.

alter table summer_class_sessions enable row level security;

create policy "admins full access to summer_class_sessions"
  on summer_class_sessions for all
  using (is_admin());

create policy "teachers read their own batch's class sessions"
  on summer_class_sessions for select
  using (is_teacher_for_batch(batch_id));

create policy "teachers insert their own batch's class sessions"
  on summer_class_sessions for insert
  with check (is_teacher_for_batch(batch_id));

create policy "teachers update their own batch's class sessions"
  on summer_class_sessions for update
  using (is_teacher_for_batch(batch_id))
  with check (is_teacher_for_batch(batch_id));

-- No student policy at all -- same posture as summer_batch_sessions
-- and every other summer table. Students read exclusively through a
-- SECURITY DEFINER function, not built until Step 4/5.


-- ══════════════════════════════════════════════════════════════
-- summer_attendance -- add session_id, NULLABLE, alongside the
-- EXISTING week-based uniqueness. Both coexist deliberately.
-- ══════════════════════════════════════════════════════════════
-- check_in_attendance() is UNCHANGED by this migration and continues
-- writing rows exactly as it does today -- (summer_student_id,
-- batch_id, week), no session_id. The existing
-- UNIQUE(summer_student_id, week) constraint is NOT dropped and stays
-- the live enforcement mechanism until Step 4 rewires the function.
--
-- The new partial unique index below is inert until something
-- actually populates session_id -- it does not conflict with the old
-- constraint (a different column), and multiple NULL session_id rows
-- never violate a uniqueness check on that column, by ordinary SQL
-- NULL semantics. It exists now so Step 4 has something correct to
-- write into, rather than retrofitting it under time pressure later.

alter table summer_attendance
  add column if not exists session_id uuid
    references summer_class_sessions(id) on delete set null;

comment on column summer_attendance.session_id is
  'Which specific class session this check-in belongs to. NULLABLE '
  'and UNPOPULATED by check_in_attendance() as of this migration -- '
  'see 0048''s own header. Resolved per Summer v2 plan doc 09 §2: '
  'attendance becomes per-session, not per-week, once Step 4 rewires '
  'the check-in RPC to require it.';

create unique index if not exists summer_attendance_one_per_session
  on summer_attendance (summer_student_id, session_id)
  where session_id is not null;

comment on index summer_attendance_one_per_session is
  'Future enforcement, once check_in_attendance() is rewritten '
  '(Step 4) to require a session_id -- a student can be marked '
  'present at each session they actually join, not just once per '
  'week. Inert today: nothing populates session_id yet, so this '
  'index currently matches zero rows and changes no behaviour.';

create index if not exists summer_attendance_session_idx
  on summer_attendance (session_id)
  where session_id is not null;
