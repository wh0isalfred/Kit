-- Public application submission.
--
-- `applications` has RLS enabled and no anon policy, deliberately —
-- it holds parent email/phone and a child's DOB and school. Granting
-- anon INSERT would also require granting SELECT for a returning
-- clause, and any SELECT policy on this table is a PII leak.
--
-- Instead: one SECURITY DEFINER function. anon holds no privileges on
-- the table at all; it can only call this, and can only influence the
-- fields that appear as parameters. status, payment_status,
-- student_id, reviewed_by and rejection_reason are unreachable by
-- construction rather than by policy.
--
-- The existing insert triggers (age eligibility, amount recompute)
-- still fire — this does not bypass them.

create or replace function submit_application(
  p_student_name         text,
  p_student_dob          date,
  p_student_gender       text,
  p_student_school       text,
  p_parent_name          text,
  p_parent_email         citext,
  p_parent_phone         text,
  p_parent_relationship  text,
  p_course_slug          text,
  p_plan                 text,
  p_amount_due_kobo      bigint,
  p_amount_total_kobo    bigint,
  p_referral_source      text default null,
  p_notes                text default null,
  p_consent_given        boolean default false,
  p_source               text default 'website',
  p_ip_address           inet default null,
  p_user_agent           text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_consent_given is not true then
    raise exception 'Consent is required';
  end if;

  -- Only a live course may be applied to. Checked here as well as in
  -- the app, because the app is not the security boundary.
  if not exists (
    select 1 from courses
    where slug = p_course_slug and status = 'live'
  ) then
    raise exception 'Course % is not open for applications', p_course_slug;
  end if;

  insert into applications (
    student_name, student_dob, student_gender, student_school,
    parent_name, parent_email, parent_phone, parent_relationship,
    course_slug, plan,
    amount_due_kobo, amount_total_kobo,
    referral_source, notes,
    consent_given, consent_at, consent_version,
    source, ip_address, user_agent
  ) values (
    p_student_name, p_student_dob, nullif(p_student_gender,''), nullif(p_student_school,''),
    p_parent_name, p_parent_email, p_parent_phone, nullif(p_parent_relationship,''),
    p_course_slug, nullif(p_plan,''),
    p_amount_due_kobo, p_amount_total_kobo,
    nullif(p_referral_source,''), nullif(p_notes,''),
    p_consent_given, now(), null,   -- consent_version: no terms doc exists yet
    p_source, p_ip_address, p_user_agent
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function submit_application is
  'Public application intake. The ONLY write path into `applications` '
  'for unauthenticated visitors. Returns the new id and nothing else.';

revoke all on function submit_application from public;
grant execute on function submit_application to anon, authenticated;


-- Attaching the Paystack reference after initialization. Same
-- problem: anon cannot UPDATE the table. Narrow function — sets the
-- reference once, only while the application is still unpaid, and
-- cannot touch anything else.
create or replace function set_application_payment_ref(
  p_application_id uuid,
  p_payment_ref    text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update applications
     set payment_ref = p_payment_ref
   where id = p_application_id
     and payment_status <> 'paid'
     and payment_ref is null;
end;
$$;

revoke all on function set_application_payment_ref from public;
grant execute on function set_application_payment_ref to anon, authenticated;