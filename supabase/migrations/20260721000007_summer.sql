-- ═══════════════════════════════════════════════════════════════
-- 0007 · Summer programme
-- ═══════════════════════════════════════════════════════════════
-- ADR 002: ID-only access. No Supabase Auth session, no password.
-- ADR 005: random suffix so IDs are not enumerable.
--
-- The rate limit table here is not optional decoration. ADR 002
-- names per-IP rate limiting as a REQUIREMENT of the decision to
-- skip real authentication, and Doc 2 §9.4 records it as unbuilt.
-- The gate must not ship without it — behind that ID is a live
-- video call with children on it.


-- ───────────────────────────────────────────────────────────────
-- summer_students — the roster
-- ───────────────────────────────────────────────────────────────

create table summer_students (
  id        uuid primary key default gen_random_uuid(),
  summer_id text unique not null,

  name        text not null,
  cohort_year int  not null,

  parent_email citext,
  parent_phone text,
  age          int,

  application_id uuid references applications(id) on delete set null,

  active     bool not null default true,
  last_seen_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- ADR 005 shape: SM26734. No hyphen.
  --
  -- Doc 1 §10.6 flags that the login wireframe shows `SM26-___` with
  -- a hyphen while the ADR does not. This constraint implements the
  -- ADR. If the hyphen wins instead, change it HERE and in
  -- generate_summer_id() together — a kid typing SM26734 into a field
  -- expecting SM26-734 will be told their valid ID is invalid.
  constraint summer_students_id_shape
    check (summer_id ~ '^SM[0-9]{2}[0-9]{3,4}$'),

  constraint summer_students_year_sane
    check (cohort_year between 2025 and 2100)
);

create index summer_students_lookup_idx
  on summer_students (summer_id)
  where active;

create index summer_students_cohort_idx on summer_students (cohort_year);

create trigger summer_students_updated_at
  before update on summer_students
  for each row execute function set_updated_at();

comment on column summer_students.summer_id is
  'ADR 005. This IS the credential (ADR 002) — random suffix, never sequential. Regex allows 3 or 4 digits so widening the space at ~100 students needs no migration; see Doc 2 §7.2.';


-- ───────────────────────────────────────────────────────────────
-- summer_content — one row per cohort-week, read by everyone
-- ───────────────────────────────────────────────────────────────

create table summer_content (
  id          uuid primary key default gen_random_uuid(),
  cohort_year int not null,
  week        int not null,

  -- Doc 2 §4.3 / wireframe state: "the portal exists before admin has
  -- typed anything into it." Without this flag an unfilled week
  -- renders as empty sections, which reads as broken software rather
  -- than "materials coming soon".
  published bool not null default false,

  class_title  text,
  class_note   text,
  meet_link    text,
  next_class_at timestamptz,

  homework      jsonb not null default '{}'::jsonb,
  announcements jsonb not null default '[]'::jsonb,
  schedule      jsonb not null default '[]'::jsonb,
  recordings    jsonb not null default '[]'::jsonb,
  resources     jsonb not null default '[]'::jsonb,

  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint summer_content_one_per_week unique (cohort_year, week),
  constraint summer_content_week_sane    check (week between 1 and 12)
);

create index summer_content_lookup_idx
  on summer_content (cohort_year, week)
  where published;

create trigger summer_content_updated_at
  before update on summer_content
  for each row execute function set_updated_at();

comment on table summer_content is
  'Effectively a singleton per cohort-week. Admin writes one row; every summer student reads it. Identical render for all of them — there is no per-student data here, and that is exactly what makes ADR 002 safe.';


-- ───────────────────────────────────────────────────────────────
-- summer_cohorts — the currently-live cohort and week
-- ───────────────────────────────────────────────────────────────
-- The portal needs to know which week is "now". Deriving it from
-- dates guesses; storing it lets admin control it explicitly, which
-- matters when a week slips.

create table summer_cohorts (
  year         int primary key,
  label        text not null,
  current_week int not null default 1,
  starts_on    date,
  ends_on      date,
  active       bool not null default false,
  prize_kobo   bigint default 3000000,   -- ₦30,000, Doc 1 §3.2
  updated_at   timestamptz not null default now(),

  constraint summer_cohorts_week_sane check (current_week between 1 and 12)
);

create trigger summer_cohorts_updated_at
  before update on summer_cohorts
  for each row execute function set_updated_at();

-- Exactly one active cohort at a time.
create unique index summer_cohorts_one_active
  on summer_cohorts ((true)) where active;


-- ───────────────────────────────────────────────────────────────
-- summer_access_attempts — the ADR 002 rate limiter
-- ───────────────────────────────────────────────────────────────
-- Every ID check writes a row here, successful or not. The Server
-- Action calls check_summer_rate_limit() BEFORE looking the ID up,
-- so a brute-forcer is stopped before touching the roster.
--
-- Deliberately in Postgres rather than Redis/Upstash: one fewer
-- vendor, and at KIT's traffic this table will never be large enough
-- to care. If it ever is, that is the trigger to move it — same
-- reasoning as ADR 001.

create table summer_access_attempts (
  id           bigserial primary key,
  ip_address   inet,
  attempted_id text,
  success      bool not null default false,
  user_agent   text,
  created_at   timestamptz not null default now()
);

create index summer_attempts_ip_idx
  on summer_access_attempts (ip_address, created_at desc);

create index summer_attempts_cleanup_idx
  on summer_access_attempts (created_at);


create or replace function check_summer_rate_limit(
  p_ip           inet,
  p_max_failures int      default 8,
  p_window       interval default '10 minutes'
)
returns table (allowed bool, failures int, retry_after_seconds int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_failures int;
  v_oldest   timestamptz;
begin
  select count(*), min(created_at)
    into v_failures, v_oldest
    from summer_access_attempts
   where ip_address = p_ip
     and success = false
     and created_at > now() - p_window;

  if v_failures >= p_max_failures then
    return query select
      false,
      v_failures,
      greatest(0, extract(epoch from (v_oldest + p_window - now()))::int);
  else
    return query select true, v_failures, 0;
  end if;
end;
$$;

comment on function check_summer_rate_limit is
  'ADR 002 brute-force guard. Call BEFORE the roster lookup. Defaults: 8 failures per IP per 10 minutes. At a 1,000-value ID space (ADR 005) this makes exhaustive guessing take days, not minutes.';


create or replace function record_summer_attempt(
  p_ip         inet,
  p_id         text,
  p_success    bool,
  p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into summer_access_attempts
    (ip_address, attempted_id, success, user_agent)
  values (p_ip, p_id, p_success, p_user_agent);
end;
$$;


-- Retention. Doc 2 §9.4 flags the absence of any deletion policy;
-- this is the one place it is cheap to just do.
create or replace function purge_summer_attempts(p_older_than interval default '30 days')
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
begin
  delete from summer_access_attempts
   where created_at < now() - p_older_than;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;


-- ───────────────────────────────────────────────────────────────
-- verify_summer_id — the whole gate, in one call
-- ───────────────────────────────────────────────────────────────
-- Rate limit → look up → record the attempt, atomically. The Server
-- Action calls this and gets back either a student or a reason.
--
-- Note what it does NOT return on failure: any hint about whether
-- the prefix or the number was wrong. The wireframe state is explicit
-- about that — no hints for guessing.

create or replace function verify_summer_id(
  p_summer_id  text,
  p_ip         inet,
  p_user_agent text default null
)
returns table (
  ok            bool,
  reason        text,
  student_id    uuid,
  student_name  text,
  cohort_year   int,
  retry_after   int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit  record;
  v_row    record;
  v_clean  text;
begin
  select * into v_limit from check_summer_rate_limit(p_ip);

  if not v_limit.allowed then
    return query select
      false, 'rate_limited'::text, null::uuid, null::text, null::int,
      v_limit.retry_after_seconds;
    return;
  end if;

  -- Be generous about input: children type with spaces, hyphens and
  -- lower case. Be strict about what counts as a match.
  v_clean := upper(regexp_replace(coalesce(p_summer_id, ''), '[\s\-]', '', 'g'));

  select ss.id, ss.name, ss.cohort_year
    into v_row
    from summer_students ss
    join summer_cohorts sc on sc.year = ss.cohort_year and sc.active
   where ss.summer_id = v_clean
     and ss.active;

  if found then
    perform record_summer_attempt(p_ip, v_clean, true, p_user_agent);
    update summer_students set last_seen_at = now() where id = v_row.id;

    return query select
      true, 'ok'::text, v_row.id, v_row.name, v_row.cohort_year, 0;
  else
    perform record_summer_attempt(p_ip, v_clean, false, p_user_agent);

    return query select
      false, 'not_found'::text, null::uuid, null::text, null::int, 0;
  end if;
end;
$$;
