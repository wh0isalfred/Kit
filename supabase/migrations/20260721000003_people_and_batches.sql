-- ═══════════════════════════════════════════════════════════════
-- 0003 · People and batches
-- ═══════════════════════════════════════════════════════════════
-- profiles → the RLS pivot (ADR 003)
-- batches  → "the casing" (Doc 1 §8.1)
-- teachers, students
--
-- SCHEMA CHANGE vs. the old Database.md: `teachers.batch_id` is
-- removed. The old schema had teachers.batch_id → batches.id AND
-- batches.teacher_id → teachers.id, which is a circular foreign key
-- and two places to disagree about who teaches what.
--
-- batches.teacher_id is now the single source of truth. A teacher's
-- batches are derived: `select * from batches where teacher_id = me`.
-- This also removes the v1 assumption that a teacher can only ever
-- hold one batch, which stops being true the moment KIT runs two
-- cohorts at once.


-- ───────────────────────────────────────────────────────────────
-- profiles — every authenticated user, and what they are
-- ───────────────────────────────────────────────────────────────
-- ADR 003. Every RLS policy in this database resolves through here.
-- Deliberately thin: identity and authorisation only. Student and
-- teacher detail lives in their own tables.

create table profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null,
  full_name  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_role_valid
    check (role in ('student', 'teacher', 'admin'))
);

create index profiles_role_idx on profiles (role);

create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

comment on table profiles is
  'RLS pivot (ADR 003). No batch_id column — batch membership lives on students.batch_id and batches.teacher_id, so there is exactly one place it can be wrong.';


-- ───────────────────────────────────────────────────────────────
-- teachers
-- ───────────────────────────────────────────────────────────────

create table teachers (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid unique references auth.users(id) on delete set null,
  name       text not null,
  email      citext not null,
  phone      text,
  active     bool not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index teachers_email_idx  on teachers (email);
create index teachers_active_idx on teachers (active);

create trigger teachers_updated_at
  before update on teachers
  for each row execute function set_updated_at();


-- ───────────────────────────────────────────────────────────────
-- batches — "the casing"
-- ───────────────────────────────────────────────────────────────
-- Doc 1 §8.1: max 15 students. A batch is the student's whole
-- visible world. Capacity is enforced by trigger below, not by
-- hoping the application checks.

create table batches (
  id            uuid primary key default gen_random_uuid(),
  course_slug   text not null references courses(slug) on update cascade,
  cohort_label  text not null,

  -- KIT ID components (ADR 004): WD·26·01-0042
  year          int not null,
  cohort_number int not null,

  capacity      int  not null default 15,
  teacher_id    uuid references teachers(id) on delete set null,
  starts_on     date,
  ends_on       date,
  status        text not null default 'planned',

  -- Atomic counter for the sequential part of the KIT ID.
  -- NOT count(*) — a concurrent double-approval would hand two
  -- students the same number. See 0009.
  next_student_no int not null default 1,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint batches_status_valid
    check (status in ('planned', 'active', 'completed', 'cancelled')),

  constraint batches_capacity_sane
    check (capacity > 0 and capacity <= 50),

  constraint batches_year_sane
    check (year between 2025 and 2100),

  constraint batches_cohort_number_sane
    check (cohort_number between 1 and 99),

  constraint batches_dates_ordered
    check (starts_on is null or ends_on is null or starts_on <= ends_on),

  -- One cohort number per course per year — this tuple is what the
  -- KIT ID encodes, so a duplicate means duplicate student IDs.
  constraint batches_cohort_unique
    unique (course_slug, year, cohort_number)
);

create index batches_course_idx  on batches (course_slug);
create index batches_teacher_idx on batches (teacher_id);
create index batches_status_idx  on batches (status);

create trigger batches_updated_at
  before update on batches
  for each row execute function set_updated_at();

comment on column batches.capacity is
  'Default 15. Doc 1 §8.1: this is a PRODUCT constraint, not a technical one — a teacher can grade live tasks for 15 students and know them by name. Do not raise it quietly for unit economics; the teaching model changes with it.';

comment on column batches.next_student_no is
  'Atomic counter for KIT ID generation. Incremented with UPDATE ... RETURNING, never derived from count(*).';


-- ───────────────────────────────────────────────────────────────
-- students
-- ───────────────────────────────────────────────────────────────

create table students (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique references auth.users(id) on delete set null,
  kit_id      text unique not null,

  name        text not null,
  email       citext not null,
  dob         date,
  gender      text,
  school      text,

  -- Parent contact. Denormalised from the application on purpose:
  -- the application is a historical record of what was submitted,
  -- the student row is current truth, and a parent who changes
  -- phone number should not require editing an old application.
  parent_name         text,
  parent_email        citext,
  parent_phone        text,
  parent_relationship text,

  batch_id    uuid references batches(id) on delete set null,

  -- Cached total over kit_points_ledger. The ledger is the truth;
  -- this is maintained by trigger and reconcilable. See 0006.
  kit_points  int not null default 0,

  status      text not null default 'active',

  application_id uuid,   -- FK added in 0004 (applications not yet created)

  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint students_status_valid
    check (status in ('active', 'completed', 'withdrawn', 'suspended')),

  constraint students_gender_valid
    check (gender is null or gender in ('Male', 'Female', 'Prefer not to say')),

  -- ADR 004 shape: WD2601-0042
  constraint students_kit_id_shape
    check (kit_id ~ '^[A-Z]{2}[0-9]{2}[0-9]{2}-[0-9]{4}$'),

  constraint students_points_not_negative
    check (kit_points >= 0)
);

create index students_batch_idx  on students (batch_id);
create index students_status_idx on students (status);
create index students_email_idx  on students (email);
create index students_kit_id_idx on students (kit_id);

-- Leaderboard query: top N within a batch. Doc 1 §8.2.
create index students_leaderboard_idx
  on students (batch_id, kit_points desc)
  where status = 'active';

create trigger students_updated_at
  before update on students
  for each row execute function set_updated_at();

comment on column students.kit_points is
  'CACHED total. kit_points_ledger is the source of truth. Maintained by trigger; reconcile with reconcile_kit_points(). Never write directly.';

comment on column students.status is
  'Doc 2 §4.2: without this, a finished cohort pollutes every active-student count forever.';


-- ───────────────────────────────────────────────────────────────
-- Batch capacity enforcement
-- ───────────────────────────────────────────────────────────────
-- Doc 1 §8.1 says max 15. If that is only checked in application
-- code, the 16th student arrives via a race between two approvals
-- and nobody notices until a teacher counts heads.

create or replace function enforce_batch_capacity()
returns trigger
language plpgsql
as $$
declare
  v_capacity int;
  v_current  int;
begin
  if new.batch_id is null then
    return new;
  end if;

  -- Only re-check when the student is actually joining a batch.
  if tg_op = 'UPDATE'
     and old.batch_id is not distinct from new.batch_id
     and old.status = new.status then
    return new;
  end if;

  if new.status <> 'active' then
    return new;
  end if;

  select capacity into v_capacity
    from batches where id = new.batch_id
    for update;   -- serialises concurrent approvals into this batch

  select count(*) into v_current
    from students
   where batch_id = new.batch_id
     and status = 'active'
     and id <> new.id;

  if v_current >= v_capacity then
    raise exception
      'Batch % is full (% of % seats). Assign this student to another batch.',
      new.batch_id, v_current, v_capacity
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger students_batch_capacity
  before insert or update on students
  for each row execute function enforce_batch_capacity();
