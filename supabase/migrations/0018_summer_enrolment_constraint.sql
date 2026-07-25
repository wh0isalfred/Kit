-- ═══════════════════════════════════════════════════════════════
-- 0018 · Approved applications can be summer enrolments
-- ═══════════════════════════════════════════════════════════════
-- applications_approved_has_student required student_id to be set
-- whenever status = 'approved'. student_id references `students`,
-- which is the 12-week table.
--
-- A summer enrolment creates a row in `summer_students` instead, so
-- student_id stays null and the constraint rejects the update at the
-- end of enrol_summer_student(). Summer enrolment could never have
-- completed. The constraint encoded an assumption -- every approval
-- produces a `students` row -- that was never true for the summer
-- product.
--
-- Fixing this by weakening the constraint to "or true" would be the
-- wrong move: the point of it is that an approved application must
-- be traceable to the thing it created, otherwise an approval can
-- silently produce nothing. So instead the model is corrected to
-- record which of the two it produced.

alter table applications
  add column if not exists summer_student_id uuid
    references summer_students(id) on delete set null;

comment on column applications.summer_student_id is
  'Set when a summer application is enrolled. The counterpart to '
  'student_id, which is only for the 12-week programme. Exactly one '
  'of the two is set on an approved application.';

create index if not exists applications_summer_student_idx
  on applications (summer_student_id);

alter table applications
  drop constraint if exists applications_approved_has_student;

-- Same guarantee as before, now aware that KIT has two products:
-- an approved application must point at whatever it created.
alter table applications
  add constraint applications_approved_has_enrolment
  check (
    status <> 'approved'
    or student_id is not null
    or summer_student_id is not null
  );


-- ───────────────────────────────────────────────────────────────
-- enrol_summer_student -- now closes the loop
-- ───────────────────────────────────────────────────────────────
-- Two changes:
--   1. sets applications.summer_student_id, satisfying the constraint
--      above and giving the application a forward link to what it
--      produced (summer_students.application_id was only the reverse)
--   2. search_path includes `extensions`, because this calls
--      generate_summer_id(), which needs pgcrypto's gen_random_bytes

create or replace function enrol_summer_student(
  p_application_id uuid default null,
  p_name           text default null,
  p_cohort_year    int  default null,
  p_parent_email   text default null,
  p_parent_phone   text default null
)
returns table (summer_student_id uuid, summer_id text, name text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  a       record;
  v_year  int;
  v_name  text;
  v_email citext;
  v_phone text;
  v_sid   text;
  v_id    uuid;
begin
  -- Two entry paths: from a paid application, or typed in by admin
  -- (CSV roster import, walk-in). The record `a` only exists on the
  -- first path, so every read of it is guarded.
  if p_application_id is not null then
    select * into a from applications where id = p_application_id;
    if not found then
      raise exception 'Application % not found.', p_application_id;
    end if;
    if a.payment_status <> 'paid' then
      raise exception 'Application % is not paid.', p_application_id;
    end if;
    if a.status = 'approved' then
      raise exception 'Application % is already enrolled.', p_application_id
        using errcode = 'unique_violation';
    end if;
    v_name  := a.student_name;
    v_email := coalesce(p_parent_email, a.parent_email);
    v_phone := coalesce(p_parent_phone, a.parent_phone);
  else
    v_name  := p_name;
    v_email := p_parent_email;
    v_phone := p_parent_phone;
  end if;

  if v_name is null then
    raise exception 'A student name is required.';
  end if;

  v_year := coalesce(
    p_cohort_year,
    (select year from summer_cohorts where active limit 1),
    extract(year from now())::int
  );

  v_sid := generate_summer_id(v_year);

  insert into summer_students
    (summer_id, name, cohort_year, parent_email, parent_phone, application_id)
  values
    (v_sid, v_name, v_year, v_email, v_phone, p_application_id)
  returning id into v_id;

  if p_application_id is not null then
    update applications
       set status            = 'approved',
           summer_student_id = v_id,      -- was missing: constraint blocked
           reviewed_at       = now(),
           reviewed_by       = auth.uid()
     where id = p_application_id and status = 'pending';
  end if;

  perform write_audit(
    'enrol_summer', 'summer_students', v_id,
    format('Enrolled %s as %s', v_name, v_sid), null
  );

  return query select v_id, v_sid, v_name;
end;
$$;
