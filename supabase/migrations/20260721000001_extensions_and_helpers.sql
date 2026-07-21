-- ═══════════════════════════════════════════════════════════════
-- 0001 · Extensions and shared helpers
-- ═══════════════════════════════════════════════════════════════
-- Nothing here is KIT-specific. Utility layer everything else uses.

create extension if not exists "pgcrypto";      -- gen_random_uuid, gen_random_bytes
create extension if not exists "citext";        -- case-insensitive email columns


-- ───────────────────────────────────────────────────────────────
-- updated_at maintenance
-- ───────────────────────────────────────────────────────────────
-- Attached to every table carrying an updated_at column. Without
-- this the column is a lie that only application code maintains,
-- and any direct SQL edit silently leaves it stale.

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ───────────────────────────────────────────────────────────────
-- Age from date of birth
-- ───────────────────────────────────────────────────────────────
-- Doc 2 §4.1: we store date of birth, never a computed age, because
-- an age integer is only true on the day it was written. This is the
-- one place age is derived.
--
-- NOT immutable (depends on current_date), so it cannot be used in a
-- CHECK constraint or an index. Eligibility is enforced by trigger
-- instead — see 0004.

create or replace function age_years(dob date, as_of date default current_date)
returns int
language sql
stable
as $$
  select extract(year from age(as_of, dob))::int;
$$;


-- ───────────────────────────────────────────────────────────────
-- Naira / kobo
-- ───────────────────────────────────────────────────────────────
-- Doc 2 §4.1: all money is stored in kobo as bigint. Paystack works
-- in kobo; storing naira and converting at the boundary means the
-- conversion lives in more than one place and one of them will
-- eventually be wrong.
--
-- These exist so nobody hand-writes `* 100` in a query.

create or replace function naira_to_kobo(naira numeric)
returns bigint
language sql
immutable
as $$
  select (naira * 100)::bigint;
$$;

create or replace function kobo_to_naira(kobo bigint)
returns numeric
language sql
immutable
as $$
  select (kobo::numeric / 100);
$$;
