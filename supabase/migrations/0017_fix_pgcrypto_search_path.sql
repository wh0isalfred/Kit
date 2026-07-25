-- 0017_fix_pgcrypto_search_path.sql
--
-- gen_random_bytes lives in pgcrypto, which Supabase installs into
-- the `extensions` schema. Both ID generators pin search_path to
-- `public` only, so the function is invisible to them and every
-- summer enrolment fails with "function gen_random_bytes(integer)
-- does not exist".
--
-- gen_random_uuid() masked this — it's Postgres core since v13 and
-- needs no extension, so every other generated ID worked.
--
-- Fix: add `extensions` to the pinned search_path. Still pinned, so
-- the privilege-escalation protection the original comment describes
-- is intact — a caller still can't shadow `profiles` with their own
-- table.

create or replace function generate_summer_id(
  p_cohort_year int,
  p_digits      int default 3
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_candidate text;
  v_max       int;
  v_taken     int;
  v_attempt   int := 0;
begin
  if p_digits not between 3 and 6 then
    raise exception 'Summer ID suffix must be 3-6 digits.';
  end if;

  v_max := power(10, p_digits)::int;

  select count(*) into v_taken
    from summer_students where cohort_year = p_cohort_year;

  -- Refuse to keep issuing into a space that is filling up. At >50%
  -- occupancy, random guessing becomes viable even with rate
  -- limiting and the ADR 005 tradeoff no longer holds.
  if v_taken >= v_max / 2 then
    raise exception
      'Summer ID space for % is over half full (% of %). Widen p_digits to % - see ADR 005 consequences.',
      p_cohort_year, v_taken, v_max, p_digits + 1;
  end if;

  loop
    v_attempt := v_attempt + 1;

    if v_attempt > 100 then
      raise exception 'Could not find a free Summer ID after 100 attempts.';
    end if;

    -- Cryptographic randomness, not random(), which is seeded and
    -- predictable - a predictable "random" ID defeats ADR 005.
    v_candidate := format('SM%s%s',
      lpad((p_cohort_year % 100)::text, 2, '0'),
      lpad((('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::bigint % v_max)::text,
           p_digits, '0')
    );

    exit when not exists (
      select 1 from summer_students where summer_id = v_candidate
    );
  end loop;

  return v_candidate;
end;
$$;


-- Same bug, same fix. Would have failed on the first certificate.
create or replace function generate_certificate_serial()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v text;
begin
  loop
    v := 'KIT-' || upper(encode(gen_random_bytes(5), 'hex'));
    exit when not exists (select 1 from certificates where serial = v);
  end loop;
  return v;
end;
$$;