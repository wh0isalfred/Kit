-- Registration window on the cohort itself, rather than a second
-- table. summer_cohorts already owns label/starts_on/ends_on/active;
-- 0013's summer_camp_settings duplicated all of that and would drift.

drop table if exists summer_camp_settings;   -- no-op if 0013 never ran

alter table summer_cohorts
  add column if not exists registration_opens_at  timestamptz,
  add column if not exists registration_closes_at timestamptz;

-- The homepage countdown reads this anonymously. summer_cohorts holds
-- no personal data — year, label, week, dates, prize — so exposing the
-- ACTIVE cohort only is safe. The roster (summer_students) stays
-- admin-only and is untouched by this.
create policy summer_cohorts_public_read on summer_cohorts for select
  to anon, authenticated
  using (active);