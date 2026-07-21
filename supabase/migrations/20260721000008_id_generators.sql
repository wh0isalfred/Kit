-- ═══════════════════════════════════════════════════════════════
-- 0008 · Identity generators
-- ═══════════════════════════════════════════════════════════════
-- ADR 004 — KIT ID    · WD2601-0042 · sequential, human-readable
-- ADR 005 — Summer ID · SM26734     · random, IS the credential
--
-- The two formats have opposite requirements for the same reason
-- the ADRs are separate: one identifies inside an authenticated
-- system, the other IS the authentication.


-- ───────────────────────────────────────────────────────────────
-- KIT ID
-- ───────────────────────────────────────────────────────────────
-- Format: [CODE][YY][COHORT]-[NNNN]
--
-- The sequential part comes from batches.next_student_no, consumed
-- with UPDATE ... RETURNING, which is atomic in Postgres. Deriving
-- it from count(*) would hand two students the same number when two
-- approvals land at once — and approvals happen in bursts, because
-- admin sits down and works through the pending queue.

create or replace function generate_kit_id(p_batch_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code   text;
  v_year   int;
  v_cohort int;
  v_no     int;
begin
  -- Atomically claim the next number and read the batch in one shot.
  update batches b
     set next_student_no = b.next_student_no + 1
   where b.id = p_batch_id
  returning b.next_student_no - 1, b.year, b.cohort_number
       into v_no, v_year, v_cohort;

  if not found then
    raise exception 'Batch % does not exist.', p_batch_id
      using errcode = 'foreign_key_violation';
  end if;

  select c.code into v_code
    from batches b join courses c on c.slug = b.course_slug
   where b.id = p_batch_id;

  if v_code is null then
    raise exception
      'Course for batch % has no KIT ID code. See Doc 1 §10.2 — codes are agreed for WD and AI only.',
      p_batch_id;
  end if;

  if v_no > 9999 then
    raise exception 'Batch % has exhausted its 4-digit student numbering.', p_batch_id;
  end if;

  return format('%s%s%s-%s',
    v_code,
    lpad((v_year % 100)::text, 2, '0'),
    lpad(v_cohort::text,       2, '0'),
    lpad(v_no::text,           4, '0')
  );
end;
$$;

comment on function generate_kit_id is
  'ADR 004. Consumes batches.next_student_no atomically — never count(*).';


-- ───────────────────────────────────────────────────────────────
-- Summer ID
-- ───────────────────────────────────────────────────────────────
-- Format: SM[YY][RANDOM]
--
-- Random, not sequential, because this is the only credential
-- guarding a live Meet link (ADR 005). Uses gen_random_bytes rather
-- than random(), which is seeded and predictable — a predictable
-- "random" ID defeats the entire point of the ADR.
--
-- p_digits defaults to 3 per ADR 005. Doc 2 §7.2: widen to 4 at
-- ~100 summer students. The column regex already permits both, so
-- widening is this one default and nothing else.

create or replace function generate_summer_id(
  p_cohort_year int,
  p_digits      int default 3
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_candidate text;
  v_max       int;
  v_taken     int;
  v_attempt   int := 0;
begin
  if p_digits not between 3 and 6 then
    raise exception 'Summer ID suffix must be 3–6 digits.';
  end if;

  v_max := power(10, p_digits)::int;

  select count(*) into v_taken
    from summer_students where cohort_year = p_cohort_year;

  -- Refuse to keep issuing into a space that is filling up. At >50%
  -- occupancy, random guessing becomes viable even with rate limiting
  -- and the ADR 005 tradeoff no longer holds.
  if v_taken >= v_max / 2 then
    raise exception
      'Summer ID space for % is over half full (% of %). Widen p_digits to % — see ADR 005 consequences.',
      p_cohort_year, v_taken, v_max, p_digits + 1;
  end if;

  loop
    v_attempt := v_attempt + 1;

    if v_attempt > 100 then
      raise exception 'Could not find a free Summer ID after 100 attempts.';
    end if;

    -- Cryptographic randomness, not random().
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

comment on function generate_summer_id is
  'ADR 005. Cryptographically random suffix — random() is seeded and predictable, which would defeat the ADR. Raises rather than issuing into a space over 50% full.';


-- ───────────────────────────────────────────────────────────────
-- Certificate serial
-- ───────────────────────────────────────────────────────────────
-- Public-facing verification code. Random and non-enumerable so a
-- certificate cannot be forged by incrementing someone else's.

create or replace function generate_certificate_serial()
returns text
language plpgsql
security definer
set search_path = public
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

create or replace function set_certificate_serial()
returns trigger
language plpgsql
as $$
begin
  if new.serial is null or new.serial = '' then
    new.serial := generate_certificate_serial();
  end if;
  return new;
end;
$$;

create trigger certificates_serial
  before insert on certificates
  for each row execute function set_certificate_serial();

-- Now that the trigger fills it, the NOT NULL can be satisfied by
-- callers who omit it entirely.
alter table certificates alter column serial drop not null;
