-- 0031 · Rate limit on public application submission
-- ───────────────────────────────────────────────────────────────
-- submit_application is the one unauthenticated write path into
-- `applications` and had no throttle at all — a script could fill the
-- table (and the admin queue) indefinitely.
--
-- Mirrors the existing summer_access_attempts pattern (see
-- 20260721000007_summer.sql) rather than introducing a second style:
-- plain Postgres, no Redis, no extra vendor.
--
-- ONE IMPORTANT DIFFERENCE from check_summer_rate_limit: that one
-- counts only FAILED attempts, which is right for brute-forcing an ID.
-- There is no "failed" application — a flood would be all successes —
-- so this counts every submission in the window.
--
-- Limit chosen deliberately loose: 5 per IP per hour. A parent with
-- three children applying in one sitting must never be blocked, and
-- shared connections (school labs, offices, mobile carrier NAT — very
-- common in Nigeria) can legitimately put several unrelated families
-- behind one IP. This stops an automated flood while being close to
-- impossible for real users to hit. Tune upward, not downward, if a
-- real applicant ever reports being blocked.

create table application_attempts (
  id          bigserial primary key,
  ip_address  inet,
  created_at  timestamptz not null default now()
);

create index application_attempts_ip_idx
  on application_attempts (ip_address, created_at desc);

create index application_attempts_cleanup_idx
  on application_attempts (created_at);

alter table application_attempts enable row level security;
-- No policies: only SECURITY DEFINER functions touch this table.
-- anon and authenticated hold no direct privileges on it.


create or replace function purge_application_attempts(
  p_older_than interval default '30 days'
)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted int;
begin
  delete from application_attempts
   where created_at < now() - p_older_than;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

comment on function purge_application_attempts is
  'Retention for the application rate limiter. Same policy as purge_summer_attempts.';


-- Replaces the 0014 version. Only two things change: the rate-limit
-- check at the top, and recording the attempt after a successful
-- insert. Signature, validation, insert and return value are all
-- byte-identical to 0014 — nothing in the app layer needs to change.
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
  v_id       uuid;
  v_recent   int;
begin
  if p_consent_given is not true then
    raise exception 'Consent is required';
  end if;

  -- Rate limit. Skipped entirely when the IP is unknown (p_ip_address
  -- is null) rather than blocking — a missing x-forwarded-for header
  -- must never cost a real application. Admin/manual submissions come
  -- through a different path and are unaffected.
  if p_ip_address is not null then
    select count(*) into v_recent
      from application_attempts
     where ip_address = p_ip_address
       and created_at > now() - interval '1 hour';

    if v_recent >= 5 then
      raise exception 'rate_limited'
        using hint = 'Too many applications from this connection. Please try again later.';
    end if;
  end if;

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
    p_consent_given, now(), null,
    p_source, p_ip_address, p_user_agent
  )
  returning id into v_id;

  -- Recorded only after a successful insert — a submission rejected by
  -- a validation trigger shouldn't count against a real parent's quota.
  if p_ip_address is not null then
    insert into application_attempts (ip_address) values (p_ip_address);
  end if;

  return v_id;
end;
$$;

comment on function submit_application is
  'Public application intake. The ONLY write path into `applications` '
  'for unauthenticated visitors. Rate limited to 5 per IP per hour '
  '(0031). Returns the new id and nothing else.';

revoke all on function submit_application from public;
grant execute on function submit_application to anon, authenticated;