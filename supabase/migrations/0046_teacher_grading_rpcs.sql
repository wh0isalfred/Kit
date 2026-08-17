-- 0046 · Let teachers grade their own batches' homework
-- ───────────────────────────────────────────────────────────────
-- Found before shipping, not after: building the teacher Homework
-- tab required get_grading_queue, get_homework_roster, and
-- return_homework — all three checked `IF NOT is_admin() THEN RAISE
-- EXCEPTION`, hardcoded, with no path for any other role. This is a
-- different shape of gap than every other one found this session:
-- those were missing RLS policies (silent zero rows); this is an
-- explicit thrown exception INSIDE a SECURITY DEFINER function body,
-- which no RLS policy or teacher_batches wiring can route around —
-- the check happens before any of that context is even consulted.
-- Grading would not have quietly failed for a teacher; it would have
-- thrown on the very first click, which is at least a louder failure
-- mode than the others found this session, but still needed catching
-- before shipping a UI that calls it.
--
-- Each function now accepts admin OR an active teacher scoped to the
-- specific batch the operation touches — never a teacher acting on a
-- batch that isn't theirs, and never opened up to "any teacher, any
-- batch" the way the old is_admin()-only check was at least honest
-- about being total. Uses is_teacher_for_batch() (0039) throughout,
-- the same helper every other teacher-facing policy in this feature
-- already uses — one definition of "is this teacher allowed here,"
-- not a new one per function.

-- ── get_grading_queue ─────────────────────────────────────────
-- p_batch_id IS NULL previously meant "every batch, admin view."
-- For a teacher, NULL must NOT mean "every batch in the system" —
-- that would leak other teachers' students. A teacher calling with
-- NULL now gets their OWN batches only (all of them, since
-- get_grading_queue's own call sites already scope per-batch calls
-- via p_batch_id when that's what's wanted — NULL is treated as
-- "all batches I'm allowed to see," consistent with what NULL already
-- meant for admin, just narrowed to the caller's actual scope).
create or replace function get_grading_queue(p_batch_id uuid default null)
returns table(
  submission_id uuid, summer_student_id uuid, student_name text, summer_id text,
  batch_id uuid, resource_id uuid, resource_title text, week integer,
  day_number integer, submission_type text, url text, storage_path text,
  submitted_at timestamptz
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
begin
  if not is_admin() then
    if p_batch_id is not null and not is_teacher_for_batch(p_batch_id) then
      raise exception 'Not authorised for this batch.';
    end if;
    if p_batch_id is null and not exists (
      select 1 from teacher_batches tb
      join teachers t on t.id = tb.teacher_id
      where t.user_id = auth.uid() and t.active
    ) then
      raise exception 'Only an admin or an assigned teacher can view a grading queue.';
    end if;
  end if;

  return query
    select
      sub.id, s.id, s.name, s.summer_id, s.batch_id,
      r.id, r.title, r.week, r.day_number, r.submission_type,
      sub.url, sub.storage_path, sub.submitted_at
    from summer_submissions sub
    join summer_students  s on s.id = sub.summer_student_id
    join summer_resources r on r.id = sub.resource_id
    where sub.status = 'turned_in'
      and (
        is_admin()
        or is_teacher_for_batch(s.batch_id)
      )
      and (p_batch_id is null or s.batch_id = p_batch_id)
    order by sub.submitted_at asc;
end;
$function$;

comment on function get_grading_queue is
  'Admin sees everything (p_batch_id filters if given). A teacher '
  'sees only submissions from batches they hold, via '
  'is_teacher_for_batch() in the WHERE clause — this is the real '
  'per-row filter, the top-of-function check only rejects an '
  'obviously-wrong call (a teacher naming a batch that is not theirs, '
  'or an unrecognised caller entirely). Fixed 0046 — this function '
  'was admin-only with no teacher path at all before.';


-- ── get_homework_roster ───────────────────────────────────────
create or replace function get_homework_roster(p_resource_id uuid, p_batch_id uuid default null)
returns table(
  summer_student_id uuid, student_name text, summer_id text, batch_id uuid,
  submission_id uuid, status text, url text, storage_path text,
  submitted_at timestamptz, feedback text, returned_at timestamptz
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_cohort_year int;
begin
  if not is_admin() then
    if p_batch_id is null or not is_teacher_for_batch(p_batch_id) then
      raise exception 'Only an admin, or a teacher naming their own batch, can view a homework roster.';
    end if;
  end if;

  select r.cohort_year into v_cohort_year
    from summer_resources r where r.id = p_resource_id;

  return query
    select
      s.id, s.name, s.summer_id, s.batch_id,
      sub.id, coalesce(sub.status, 'assigned'),
      sub.url, sub.storage_path, sub.submitted_at,
      sub.feedback, sub.returned_at
    from summer_students s
    left join summer_submissions sub
      on sub.summer_student_id = s.id
     and sub.resource_id = p_resource_id
    where s.cohort_year = v_cohort_year
      and (p_batch_id is null or s.batch_id = p_batch_id)
      and (is_admin() or s.batch_id = p_batch_id)
    order by
      (sub.id is not null),
      s.name;
end;
$function$;

comment on function get_homework_roster is
  'A teacher MUST name their own batch (p_batch_id required, checked '
  'against is_teacher_for_batch before anything runs) — unlike '
  'get_grading_queue, there is no "give me everything I am allowed to '
  'see" mode here, since a roster naturally implies one batch''s '
  'names, not a cross-batch feed. Fixed 0046 — was admin-only before.';


-- ── return_homework ────────────────────────────────────────────
-- No batch_id parameter exists on this function — the submission's
-- batch has to be resolved internally via the same
-- summer_submissions -> summer_students join get_grading_queue and
-- get_homework_roster already use, then checked against
-- is_teacher_for_batch.
create or replace function return_homework(p_submission_id uuid, p_feedback text)
returns void
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_batch_id uuid;
begin
  if not is_admin() then
    select s.batch_id into v_batch_id
      from summer_submissions sub
      join summer_students s on s.id = sub.summer_student_id
     where sub.id = p_submission_id;

    if v_batch_id is null or not is_teacher_for_batch(v_batch_id) then
      raise exception 'Not authorised to grade this submission.';
    end if;
  end if;

  update summer_submissions
     set status = 'returned',
         feedback = p_feedback,
         returned_at = now()
   where id = p_submission_id;
end;
$function$;

comment on function return_homework is
  'A teacher may only return a submission belonging to a student in '
  'one of their own batches — resolved via the submission''s own '
  'student -> batch_id, then checked against is_teacher_for_batch(), '
  'since this function has no batch_id parameter to check directly. '
  'Fixed 0046 — was admin-only before, would have thrown on every '
  'teacher grading attempt with no exception, since the check ran '
  'before anything else in the function body.';
