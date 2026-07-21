-- ═══════════════════════════════════════════════════════════════
-- 0011 · Views and read functions
-- ═══════════════════════════════════════════════════════════════
-- Everything the dashboards and the portal actually read.
--
-- Views are created with security_invoker = on so the caller's RLS
-- still applies. A view WITHOUT that flag runs as its owner and
-- silently bypasses every policy in 0010 — which is how a "helpful"
-- view becomes a data leak. The one deliberate exception is
-- students_for_teacher, which exists precisely to do column
-- restriction RLS cannot, and is explained inline.


-- ───────────────────────────────────────────────────────────────
-- students_for_teacher
-- ───────────────────────────────────────────────────────────────
-- Doc 1 §6.2 / Doc 2 §5.4: a teacher may see name, email, batch and
-- KIT score — and nothing else. No phone, no parent contact, no
-- date of birth, no school.
--
-- RLS gates rows, not columns, so teachers have NO select policy on
-- `students` at all (0010). They read through this view, which is
-- the only surface that exposes student rows to them and exposes
-- exactly four fields plus batch context.
--
-- security_invoker is OFF here on purpose — that is the entire point.
-- The row filter is therefore enforced in the WHERE clause below and
-- must be read carefully before any edit.

create view students_for_teacher
with (security_invoker = off)
as
  select
    s.id,
    s.kit_id,
    s.name,
    s.email,
    s.batch_id,
    s.kit_points,
    s.status,
    s.enrolled_at,
    b.cohort_label,
    b.course_slug
  from students s
  join batches  b on b.id = s.batch_id
 where is_admin()
    or (app_role() = 'teacher' and in_my_batch(s.batch_id));

comment on view students_for_teacher is
  'Column-restricted student list. The ONLY way a teacher may read student rows. Deliberately security_invoker=off — the row filter is the WHERE clause. Doc 1 §6.2.';


-- ───────────────────────────────────────────────────────────────
-- batch_leaderboard
-- ───────────────────────────────────────────────────────────────
-- Doc 1 §8.3: students see the TOP 5 of their own batch only.
--
-- This is a considered product decision, not an arbitrary cutoff. A
-- full 15-student ranking means ten children see themselves in the
-- bottom two-thirds every week, which is the opposite of what a
-- confidence-building programme should do. Do not "improve" this by
-- showing full rankings.

create view batch_leaderboard
with (security_invoker = on)
as
  select
    s.batch_id,
    s.id   as student_id,
    s.name,
    s.kit_id,
    s.kit_points,
    rank() over (partition by s.batch_id order by s.kit_points desc, s.enrolled_at) as position
  from students s
 where s.status = 'active'
   and s.batch_id is not null;

create view batch_top5
with (security_invoker = on)
as
  select * from batch_leaderboard where position <= 5;

comment on view batch_top5 is
  'Student-facing leaderboard. Top 5 only — see Doc 1 §8.3 for why this cutoff is deliberate.';


-- ───────────────────────────────────────────────────────────────
-- Admin operational views
-- ───────────────────────────────────────────────────────────────

-- The applications review queue. Doc 3 §6.3: default filter is
-- Pending, and payment-unverified rows must be visibly flagged
-- because they are not approvable.
create view admin_application_queue
with (security_invoker = on)
as
  select
    a.id,
    a.student_name,
    a.age_at_application,
    a.parent_name,
    a.parent_email,
    a.parent_phone,
    c.title as course_title,
    a.course_slug,
    a.plan,
    kobo_to_naira(a.amount_due_kobo)   as amount_due_naira,
    kobo_to_naira(a.amount_total_kobo) as amount_total_naira,
    a.payment_status,
    a.payment_ref,
    a.status,
    a.source,
    a.created_at,
    (a.payment_status = 'paid')  as approvable,
    (a.payment_status <> 'paid') as needs_payment_check
  from applications a
  join courses c on c.slug = a.course_slug
 where a.status = 'pending';


-- Who owes money. This view is what replaces the spreadsheet
-- (Doc 1 §9.4 — no Paystack subscriptions, manual chasing instead).
create view admin_outstanding_payments
with (security_invoker = on)
as
  select
    p.id as payment_id,
    s.id as student_id,
    s.kit_id,
    s.name  as student_name,
    s.parent_name,
    s.parent_email,
    s.parent_phone,
    b.cohort_label,
    p.instalment_number,
    p.instalment_of,
    kobo_to_naira(p.amount_kobo) as amount_naira,
    p.due_on,
    (current_date - p.due_on)    as days_overdue
  from payments p
  join students s on s.id = p.student_id
  left join batches b on b.id = s.batch_id
 where p.status = 'pending'
 order by p.due_on nulls last;


-- Doc 3 §6.7: five numbers is enough for v1. Charts and cohort
-- comparisons are a later phase — resist adding them here.
create view admin_stats
with (security_invoker = on)
as
  select
    (select count(*) from applications where status = 'pending')          as applications_pending,
    (select count(*) from applications
      where status = 'pending' and payment_status = 'paid')               as applications_approvable,
    (select count(*) from students where status = 'active')               as students_active,
    (select count(*) from students where status = 'completed')            as students_completed,
    (select count(*) from teachers where active)                          as teachers_active,
    (select count(*) from batches where status = 'active')                as batches_active,
    (select count(*) from summer_students ss
       join summer_cohorts sc on sc.year = ss.cohort_year and sc.active)  as summer_students,
    (select current_week from summer_cohorts where active limit 1)        as summer_week,
    kobo_to_naira((select coalesce(sum(amount_kobo), 0)::bigint
                     from payments where status = 'paid'))                as revenue_naira,
    kobo_to_naira((select coalesce(sum(amount_kobo), 0)::bigint
                     from payments where status = 'pending'))             as outstanding_naira;

comment on view admin_stats is
  'Doc 3 §6.1: on a fresh install every number here is legitimately zero. The dashboard must render that as "No applications yet", not as broken software.';


-- ───────────────────────────────────────────────────────────────
-- Student dashboard
-- ───────────────────────────────────────────────────────────────

create view my_batch_resources
with (security_invoker = on)
as
  select r.id, r.batch_id, r.title, r.description, r.kind,
         r.url, r.storage_path, r.unlocked_at, r.sort_order
    from resources r
   where r.locked = false;   -- RLS already enforces this; explicit for readability

create view my_assignments
with (security_invoker = on)
as
  select
    a.id, a.batch_id, a.title, a.description, a.kind,
    a.due_at, a.max_grade,
    sub.id        as submission_id,
    sub.submitted_at,
    sub.grade,
    sub.feedback,
    sub.graded_at,
    case
      when sub.graded_at is not null then 'graded'
      when sub.id is not null        then 'submitted'
      when a.due_at < now()          then 'overdue'
      else 'todo'
    end as state
  from assignments a
  left join submissions sub
    on sub.assignment_id = a.id
   and sub.student_id = app_student_id()
 where a.published;


-- ───────────────────────────────────────────────────────────────
-- The summer portal read
-- ───────────────────────────────────────────────────────────────
-- ADR 002: summer students have no auth session, so no RLS policy
-- can grant them anything. The Server Action verifies the signed
-- cookie, then calls this. SECURITY DEFINER, and it returns only
-- non-personal shared content — exactly the shallowness that makes
-- ADR 002 acceptable in the first place.
--
-- If this function ever starts returning per-student data, ADR 002
-- must be reopened before that change ships.

create or replace function get_summer_portal(p_cohort_year int default null)
returns table (
  cohort_year   int,
  week          int,
  published     bool,
  class_title   text,
  class_note    text,
  meet_link     text,
  next_class_at timestamptz,
  homework      jsonb,
  announcements jsonb,
  schedule      jsonb,
  recordings    jsonb,
  resources     jsonb,
  updated_at    timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_year int;
  v_week int;
begin
  select sc.year, sc.current_week into v_year, v_week
    from summer_cohorts sc
   where sc.active
     and (p_cohort_year is null or sc.year = p_cohort_year)
   limit 1;

  if v_year is null then
    return;   -- no active cohort: the portal shows its holding state
  end if;

  return query
    select c.cohort_year, c.week, c.published,
           c.class_title, c.class_note, c.meet_link, c.next_class_at,
           c.homework, c.announcements, c.schedule, c.recordings, c.resources,
           c.updated_at
      from summer_content c
     where c.cohort_year = v_year
       and c.week = v_week
       and c.published;   -- unpublished weeks return nothing, not empty sections
end;
$$;

comment on function get_summer_portal is
  'The entire summer portal read. Returns zero rows when the week is unpublished — the UI renders "materials coming soon" rather than a page of empty headers. Wireframe state, Doc 3 §5.2.';


-- ───────────────────────────────────────────────────────────────
-- Course catalogue for the marketing site
-- ───────────────────────────────────────────────────────────────
-- Doc 3 §7 Phase 1: the programme cards are currently hardcoded
-- arrays in Programs.tsx. This is what they read once wired.

create view public_courses
with (security_invoker = on)
as
  select
    slug, code, title, type, track, summary, description, status,
    duration_label, age_min, age_max, sort_order,
    kobo_to_naira(price_kobo)         as price_naira,
    kobo_to_naira(price_monthly_kobo) as price_monthly_naira,
    instalments
  from courses
 where status in ('live', 'coming_soon')
 order by sort_order, title;
