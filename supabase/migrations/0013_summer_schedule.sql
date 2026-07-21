-- 0013_summer_schedule.sql
--
-- Admin-editable dates for the summer camp: when registration opens
-- and closes (drives the homepage countdown in SummerSection.tsx,
-- replacing the hardcoded `const CLOSE = new Date(...)`) and when
-- the camp itself runs.
--
-- Deliberately separate from `summer_cohorts`, which tracks the
-- *current week* once a camp is actually live — that's an
-- operational concern for the portal. This table is the pre-camp
-- marketing/admissions side. If you'd rather fold these columns
-- into `summer_cohorts` instead of keeping a second table, this
-- can be merged later — nothing here touches existing tables.

create table summer_camp_settings (
  id                      uuid primary key default gen_random_uuid(),
  cohort_year             int not null unique,
  registration_opens_at   timestamptz,
  registration_closes_at  timestamptz,   -- drives the homepage countdown
  camp_starts_at          date,
  camp_ends_at            date,
  is_active               bool not null default true,
  updated_at              timestamptz not null default now()
);

comment on table summer_camp_settings is
  'One row per year. is_active marks which year the public site reads '
  'from right now — flip it rather than deleting old rows, so past '
  'cohorts stay in the record.';

create trigger summer_camp_settings_set_updated_at
  before update on summer_camp_settings
  for each row execute function set_updated_at();

alter table summer_camp_settings enable row level security;

-- Public read — same posture as `courses`: no sensitive data here,
-- and the homepage countdown needs to read it without a session.
create policy summer_camp_settings_public_read
  on summer_camp_settings for select
  using (true);

-- Admin-only write.
create policy summer_camp_settings_admin_write
  on summer_camp_settings for all
  using (is_admin())
  with check (is_admin());

-- Populate once real dates are decided (Doc 1 §11.6 — still open).
-- Left uninserted deliberately rather than seeded with a guessed
-- date — getActiveSummerSchedule() returns null until this exists,
-- and the frontend should treat null as "hide the countdown," not
-- render a fabricated one.
--
-- insert into summer_camp_settings
--   (cohort_year, registration_opens_at, registration_closes_at, camp_starts_at, camp_ends_at)
-- values
--   (2026, null, null, null, null);
