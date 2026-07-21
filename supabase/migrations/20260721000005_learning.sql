-- ═══════════════════════════════════════════════════════════════
-- 0005 · Learning
-- ═══════════════════════════════════════════════════════════════
-- resources, assignments, submissions, announcements,
-- class_sessions, attendance.
--
-- Two tables here did not exist in the old schema and were flagged
-- as gaps in Doc 2 §4.4:
--
--   class_sessions — nothing recorded when a class happened or what
--                    the Meet link was, yet KIT Points award
--                    punctuality for joining in the first 5 minutes.
--   attendance     — the admin student detail screen has an
--                    Attendance tab with no table behind it.
--
-- Without both, punctuality points cannot be computed and the
-- attendance tab cannot be built.


-- ───────────────────────────────────────────────────────────────
-- resources — the batch repo
-- ───────────────────────────────────────────────────────────────
-- Doc 1 §6.2: resources stay locked until the teacher unlocks them.
-- The lock is enforced inside the RLS policy (0012), NOT by the
-- query — otherwise a locked resource's URL is one API call away
-- from any curious student.

create table resources (
  id       uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,

  title       text not null,
  description text,
  kind        text not null default 'file',

  -- Either an external link or a Supabase Storage path, not both.
  url          text,
  storage_path text,

  locked      bool not null default true,
  unlocked_at timestamptz,
  unlocked_by uuid references auth.users(id) on delete set null,

  sort_order int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint resources_kind_valid
    check (kind in ('file', 'link', 'slides', 'recording', 'starter_files')),

  constraint resources_has_a_target
    check (url is not null or storage_path is not null),

  -- unlocked_at must exist iff the resource is unlocked
  constraint resources_unlock_consistent
    check (locked = (unlocked_at is null))
);

create index resources_batch_idx on resources (batch_id, sort_order);

-- The student-facing query: unlocked resources for my batch.
create index resources_unlocked_idx
  on resources (batch_id, sort_order)
  where locked = false;

create trigger resources_updated_at
  before update on resources
  for each row execute function set_updated_at();

-- Keep unlocked_at truthful without trusting the caller to set it.
-- Fires on INSERT as well as UPDATE. A resource created already
-- unlocked is a legitimate case — admin uploading something meant to
-- be immediately available — and an UPDATE-only trigger would leave
-- unlocked_at null and trip resources_unlock_consistent on insert.
create or replace function sync_resource_unlock()
returns trigger
language plpgsql
as $$
begin
  if new.locked then
    new.unlocked_at := null;
    new.unlocked_by := null;
  else
    new.unlocked_at := coalesce(new.unlocked_at, now());
    new.unlocked_by := coalesce(new.unlocked_by, auth.uid());
  end if;
  return new;
end;
$$;

create trigger resources_sync_unlock
  before insert or update on resources
  for each row execute function sync_resource_unlock();


-- ───────────────────────────────────────────────────────────────
-- class_sessions
-- ───────────────────────────────────────────────────────────────
-- Doc 1 §7.1: classes run Saturdays on Google Meet, and joining
-- within the first 5 minutes earns punctuality points. That rule
-- is uncomputable without a recorded start time.

create table class_sessions (
  id       uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,

  title      text not null,
  week_number int,
  meet_link  text,

  scheduled_at timestamptz not null,
  started_at   timestamptz,
  ended_at     timestamptz,

  -- The punctuality window. Doc 1 §8.2 says 5 minutes; stored per
  -- session so a late start does not punish students who were on time.
  punctual_within_minutes int not null default 5,

  status     text not null default 'scheduled',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint class_sessions_status_valid
    check (status in ('scheduled', 'live', 'ended', 'cancelled')),

  constraint class_sessions_times_ordered
    check (ended_at is null or started_at is null or started_at <= ended_at),

  constraint class_sessions_window_sane
    check (punctual_within_minutes between 1 and 60)
);

create index class_sessions_batch_idx
  on class_sessions (batch_id, scheduled_at desc);

create index class_sessions_upcoming_idx
  on class_sessions (scheduled_at)
  where status in ('scheduled', 'live');

create trigger class_sessions_updated_at
  before update on class_sessions
  for each row execute function set_updated_at();


-- ───────────────────────────────────────────────────────────────
-- attendance
-- ───────────────────────────────────────────────────────────────

create table attendance (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references class_sessions(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,

  joined_at timestamptz not null default now(),
  left_at   timestamptz,

  -- Computed on insert against the session's window, then frozen.
  -- If it were derived at read time, editing a session's start time
  -- would retroactively rewrite who was punctual — and points have
  -- already been awarded on the original answer.
  punctual bool not null default false,

  marked_by uuid references auth.users(id) on delete set null,
  note      text,

  created_at timestamptz not null default now(),

  constraint attendance_one_per_session unique (session_id, student_id),
  constraint attendance_times_ordered
    check (left_at is null or joined_at <= left_at)
);

create index attendance_student_idx on attendance (student_id, joined_at desc);
create index attendance_session_idx on attendance (session_id);

create or replace function compute_attendance_punctuality()
returns trigger
language plpgsql
as $$
declare
  s record;
begin
  select started_at, scheduled_at, punctual_within_minutes
    into s from class_sessions where id = new.session_id;

  new.punctual := new.joined_at
    <= coalesce(s.started_at, s.scheduled_at)
       + make_interval(mins => s.punctual_within_minutes);

  return new;
end;
$$;

create trigger attendance_punctuality
  before insert on attendance
  for each row execute function compute_attendance_punctuality();


-- ───────────────────────────────────────────────────────────────
-- assignments
-- ───────────────────────────────────────────────────────────────

create table assignments (
  id       uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,

  -- Set for in-class tasks (Doc 1 §7.1 — teacher puts a task on
  -- screen, student answers in the sandbox). NULL for homework.
  session_id uuid references class_sessions(id) on delete set null,

  title       text not null,
  description text,
  kind        text not null default 'assignment',

  max_grade int not null default 100,
  due_at    timestamptz,
  published bool not null default true,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint assignments_kind_valid
    check (kind in ('assignment', 'class_task')),

  constraint assignments_max_grade_positive
    check (max_grade > 0),

  -- A class task belongs to a session; homework does not.
  constraint assignments_class_task_has_session
    check (kind <> 'class_task' or session_id is not null)
);

create index assignments_batch_idx   on assignments (batch_id, due_at);
create index assignments_session_idx on assignments (session_id);

create trigger assignments_updated_at
  before update on assignments
  for each row execute function set_updated_at();


-- ───────────────────────────────────────────────────────────────
-- submissions
-- ───────────────────────────────────────────────────────────────

create table submissions (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id    uuid not null references students(id)    on delete cascade,

  content      text,
  storage_path text,

  grade     int,
  feedback  text,
  graded_at timestamptz,
  graded_by uuid references teachers(id) on delete set null,

  -- Doc 1 §8.2: being among the first to answer a class task
  -- correctly earns bonus points. Frozen at grading time.
  correct_rank int,

  submitted_at timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- One submission per student per assignment. Without this, a
  -- double-click creates two rows and the grade lands on the wrong one.
  constraint submissions_one_per_student unique (assignment_id, student_id),

  constraint submissions_grade_consistent
    check ((grade is null) = (graded_at is null)),

  constraint submissions_grade_not_negative
    check (grade is null or grade >= 0)
);

create index submissions_assignment_idx on submissions (assignment_id);
create index submissions_student_idx    on submissions (student_id, submitted_at desc);

-- Teacher's grading queue: ungraded work, oldest first.
create index submissions_ungraded_idx
  on submissions (assignment_id, submitted_at)
  where graded_at is null;

create trigger submissions_updated_at
  before update on submissions
  for each row execute function set_updated_at();

-- Grade cannot exceed the assignment's maximum. Cross-table, so a
-- CHECK constraint cannot express it.
create or replace function validate_submission_grade()
returns trigger
language plpgsql
as $$
declare
  v_max int;
begin
  if new.grade is null then
    return new;
  end if;

  select max_grade into v_max from assignments where id = new.assignment_id;

  if new.grade > v_max then
    raise exception 'Grade % exceeds the maximum of % for this assignment.',
      new.grade, v_max
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger submissions_validate_grade
  before insert or update on submissions
  for each row execute function validate_submission_grade();


-- ───────────────────────────────────────────────────────────────
-- announcements
-- ───────────────────────────────────────────────────────────────

create table announcements (
  id       uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,

  message text not null,
  pinned  bool not null default false,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index announcements_batch_idx
  on announcements (batch_id, pinned desc, created_at desc);

create trigger announcements_updated_at
  before update on announcements
  for each row execute function set_updated_at();
