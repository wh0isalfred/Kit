-- ═══════════════════════════════════════════════════════════════
-- 0006 · KIT Points and certificates
-- ═══════════════════════════════════════════════════════════════
-- Doc 1 §8.2: points are stored as a LEDGER, not a mutable integer.
-- Every award is a row with a reason. students.kit_points is a cached
-- total maintained by trigger.
--
-- The reason this matters: when a parent asks why their child has 120
-- points and another has 140, the ledger is the answer. A mutable
-- counter cannot produce one.
--
-- Doc 2 §8.2 asks for a reconciliation path to be built WITH the
-- trigger rather than after the first discrepancy. reconcile_kit_points()
-- below is that path.


-- ───────────────────────────────────────────────────────────────
-- Points rules
-- ───────────────────────────────────────────────────────────────
-- Values live in a table rather than in code so admin can tune the
-- scoring without a deploy — and so the ledger can record which rule
-- version produced an award.

create table kit_points_rules (
  reason      text primary key,
  points      int  not null,
  label       text not null,
  description text,
  active      bool not null default true,
  updated_at  timestamptz not null default now()
);

create trigger kit_points_rules_updated_at
  before update on kit_points_rules
  for each row execute function set_updated_at();

insert into kit_points_rules (reason, points, label, description) values
  ('punctuality',   10, 'Joined on time',
   'Joined the class within the punctuality window (Doc 1 §8.2).'),
  ('participation',  5, 'Took part in a class task',
   'Submitted an answer to an in-class task.'),
  ('first_correct', 15, 'First correct answer',
   'Among the first to answer a class task correctly.'),
  ('assignment',    20, 'Submitted an assignment',
   'Completed and submitted an assignment.'),
  ('good_grade',    15, 'Strong grade',
   'Awarded for a high grade on a submission.'),
  ('manual',         0, 'Manual adjustment',
   'Admin-issued. Points supplied per-award, not from this rule.');


-- ───────────────────────────────────────────────────────────────
-- kit_points_ledger
-- ───────────────────────────────────────────────────────────────

create table kit_points_ledger (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,

  points int  not null,
  reason text not null references kit_points_rules(reason) on update cascade,

  -- What caused this award — a submission, an attendance row, a
  -- session. This is what makes "why do I have 120 points" answerable.
  ref_table text,
  ref_id    uuid,

  note       text,
  awarded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),

  constraint kit_points_ref_valid
    check (ref_table is null
           or ref_table in ('submissions', 'attendance', 'class_sessions')),

  -- Idempotency: one award per (student, reason, source row). Stops a
  -- retried webhook or a double-graded submission awarding twice.
  constraint kit_points_no_duplicate_award
    unique nulls not distinct (student_id, reason, ref_table, ref_id)
);

create index kit_points_student_idx
  on kit_points_ledger (student_id, created_at desc);

create index kit_points_reason_idx on kit_points_ledger (reason);

comment on table kit_points_ledger is
  'SOURCE OF TRUTH for KIT Points. students.kit_points is a cached total derived from here.';


-- ───────────────────────────────────────────────────────────────
-- Cached total maintenance
-- ───────────────────────────────────────────────────────────────
-- Incremental rather than a full recount per write: an award is a
-- delta, so applying the delta is O(1) where recounting is O(n) in
-- that student's ledger history.

create or replace function apply_kit_points_delta()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update students
       set kit_points = greatest(0, kit_points + new.points)
     where id = new.student_id;

  elsif tg_op = 'UPDATE' then
    if new.student_id <> old.student_id then
      update students set kit_points = greatest(0, kit_points - old.points)
       where id = old.student_id;
      update students set kit_points = greatest(0, kit_points + new.points)
       where id = new.student_id;
    else
      update students
         set kit_points = greatest(0, kit_points + (new.points - old.points))
       where id = new.student_id;
    end if;

  elsif tg_op = 'DELETE' then
    update students set kit_points = greatest(0, kit_points - old.points)
     where id = old.student_id;
    return old;
  end if;

  return new;
end;
$$;

create trigger kit_points_maintain_total
  after insert or update or delete on kit_points_ledger
  for each row execute function apply_kit_points_delta();


-- ───────────────────────────────────────────────────────────────
-- Reconciliation
-- ───────────────────────────────────────────────────────────────
-- Doc 2 §8.2. Cached totals and ledgers diverge — a restore, a manual
-- edit, a trigger disabled during a bulk import. Build the recount
-- path now, not after the first argument with a parent.
--
-- Safe to run any time; returns only what it corrected.

create or replace function reconcile_kit_points()
returns table (student_id uuid, kit_id text, was int, now_is int)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with truth as (
    select s.id,
           s.kit_id,
           s.kit_points as cached,
           coalesce((select sum(l.points)
                       from kit_points_ledger l
                      where l.student_id = s.id), 0)::int as actual
      from students s
  ),
  fixed as (
    update students s
       set kit_points = greatest(0, t.actual)
      from truth t
     where s.id = t.id
       and s.kit_points <> greatest(0, t.actual)
    returning s.id, s.kit_id, t.cached, s.kit_points
  )
  select * from fixed;
end;
$$;

comment on function reconcile_kit_points is
  'Recomputes every cached kit_points total from the ledger. Returns only corrected rows. Run from a scheduled job (Doc 2 §8.4) or manually after any bulk import.';


-- ───────────────────────────────────────────────────────────────
-- Award helper
-- ───────────────────────────────────────────────────────────────
-- Single entry point for awarding points. Looks the value up from
-- the rules table and swallows the idempotency conflict, so callers
-- can fire it safely on retry.

create or replace function award_kit_points(
  p_student_id uuid,
  p_reason     text,
  p_ref_table  text default null,
  p_ref_id     uuid default null,
  p_points     int  default null,
  p_note       text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points int;
  v_id     uuid;
begin
  select points into v_points
    from kit_points_rules
   where reason = p_reason and active;

  if not found then
    raise exception 'Unknown or inactive points rule: %', p_reason;
  end if;

  v_points := coalesce(p_points, v_points);

  insert into kit_points_ledger
    (student_id, points, reason, ref_table, ref_id, note, awarded_by)
  values
    (p_student_id, v_points, p_reason, p_ref_table, p_ref_id, p_note, auth.uid())
  on conflict do nothing
  returning id into v_id;

  return v_id;   -- NULL when the award already existed
end;
$$;


-- ───────────────────────────────────────────────────────────────
-- Automatic awards
-- ───────────────────────────────────────────────────────────────

-- Punctuality, on attendance insert.
create or replace function award_punctuality_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.punctual then
    perform award_kit_points(
      new.student_id, 'punctuality', 'attendance', new.id
    );
  end if;
  return new;
end;
$$;

create trigger attendance_award_points
  after insert on attendance
  for each row execute function award_punctuality_points();


-- Assignment submission + grade, on submission.
create or replace function award_submission_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max  int;
  v_kind text;
begin
  select max_grade, kind into v_max, v_kind
    from assignments where id = new.assignment_id;

  -- Submitting at all
  if tg_op = 'INSERT' then
    perform award_kit_points(
      new.student_id,
      case when v_kind = 'class_task' then 'participation' else 'assignment' end,
      'submissions', new.id
    );
  end if;

  -- A strong grade, once graded (>= 70%)
  if new.graded_at is not null
     and (tg_op = 'INSERT' or old.graded_at is null)
     and new.grade::numeric / nullif(v_max, 0) >= 0.7 then
    perform award_kit_points(
      new.student_id, 'good_grade', 'submissions', new.id
    );
  end if;

  -- First correct answer on a class task
  if new.correct_rank is not null
     and new.correct_rank <= 3
     and (tg_op = 'INSERT' or old.correct_rank is null) then
    perform award_kit_points(
      new.student_id, 'first_correct', 'submissions', new.id,
      null, format('Rank %s', new.correct_rank)
    );
  end if;

  return new;
end;
$$;

create trigger submissions_award_points
  after insert or update on submissions
  for each row execute function award_submission_points();


-- ───────────────────────────────────────────────────────────────
-- certificates
-- ───────────────────────────────────────────────────────────────
-- Doc 2 §4.4: referenced by the admin student-detail wireframe,
-- absent from the old schema.
--
-- Doc 1 §8.2: every finisher gets a certificate; the top scorer in
-- each batch gets a special certificate plus a cash prize handed
-- over in person.

create table certificates (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  batch_id   uuid not null references batches(id)  on delete cascade,

  kind text not null default 'completion',

  -- Public verification code, so a certificate can be checked
  -- against the database rather than taken on trust.
  serial text unique not null,

  storage_path text,
  points_at_issue int,
  prize_amount_kobo bigint,
  prize_paid_at   timestamptz,

  issued_at  timestamptz not null default now(),
  issued_by  uuid references auth.users(id) on delete set null,

  constraint certificates_kind_valid
    check (kind in ('completion', 'top_of_batch')),

  constraint certificates_one_per_kind
    unique (student_id, batch_id, kind),

  constraint certificates_prize_only_for_top
    check (kind = 'top_of_batch' or prize_amount_kobo is null)
);

create index certificates_student_idx on certificates (student_id);
create index certificates_batch_idx   on certificates (batch_id, kind);
