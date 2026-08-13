-- 0035 · Regional pricing: GBP for Europe (corrected)
-- ───────────────────────────────────────────────────────────────
-- NOTE: adding parameters with defaults to an existing function
-- creates an OVERLOAD, not a replacement. The old 18-arg version must
-- be dropped explicitly, or two functions stay live and PostgREST may
-- route to the one that ignores currency and country entirely.

alter table applications
  add column if not exists parent_country text;

comment on column applications.parent_country is
  'ISO 3166-1 alpha-2 code selected by the parent on the application form. Drives regional pricing.';

alter table courses
  add column if not exists price_gbp_pence bigint,
  add column if not exists price_monthly_gbp_pence bigint;

comment on column courses.price_gbp_pence is
  'Price in pence for European applicants. NULL = not offered in Europe.';

update courses set price_gbp_pence = 2000 where type = 'summer';


-- Drop the old 18-arg version FIRST — signature confirmed against
-- pg_proc, not reconstructed from memory.
drop function if exists submit_application(text,date,text,text,text,citext,text,text,text,text,bigint,bigint,text,text,boolean,text,inet,text);


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
  p_user_agent           text default null,
  p_currency             text default 'NGN',
  p_parent_country       text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id     uuid;
  v_recent int;
begin
  if p_consent_given is not true then
    raise exception 'Consent is required';
  end if;

  if p_currency not in ('NGN', 'GBP') then
    raise exception 'Unsupported currency %', p_currency;
  end if;

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
    parent_country,
    course_slug, plan,
    amount_due_kobo, amount_total_kobo, currency,
    referral_source, notes,
    consent_given, consent_at, consent_version,
    source, ip_address, user_agent
  ) values (
    p_student_name, p_student_dob, nullif(p_student_gender,''), nullif(p_student_school,''),
    p_parent_name, p_parent_email, p_parent_phone, nullif(p_parent_relationship,''),
    nullif(p_parent_country,''),
    p_course_slug, nullif(p_plan,''),
    p_amount_due_kobo, p_amount_total_kobo, p_currency,
    nullif(p_referral_source,''), nullif(p_notes,''),
    p_consent_given, now(), null,
    p_source, p_ip_address, p_user_agent
  )
  returning id into v_id;

  if p_ip_address is not null then
    insert into application_attempts (ip_address) values (p_ip_address);
  end if;

  return v_id;
end;
$$;

revoke all on function submit_application(text,date,text,text,text,citext,text,text,text,text,bigint,bigint,text,text,boolean,text,inet,text,text,text) from public;
grant execute on function submit_application(text,date,text,text,text,citext,text,text,text,text,bigint,bigint,text,text,boolean,text,inet,text,text,text) to anon, authenticated;