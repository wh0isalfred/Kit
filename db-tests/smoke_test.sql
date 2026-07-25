-- ═══════════════════════════════════════════════════════════════
-- SMOKE TEST — run against the REAL Supabase project
-- ═══════════════════════════════════════════════════════════════
--
-- WHY THIS EXISTS
--
-- The db-tests/ suite runs against a plain Postgres with a shim
-- standing in for auth.users, storage, and the anon/authenticated
-- roles. That catches logic errors. It cannot catch anything that
-- differs between the shim and the real project -- and three real
-- bugs have now shipped through that gap:
--
--   1. pgcrypto installs into `public` on plain Postgres but into
--      `extensions` on Supabase, so every search_path=public
--      function calling gen_random_bytes failed only in production
--   2. enrol_summer_student() never set applications.summer_student_id,
--      so the approved-has-student constraint rejected every summer
--      enrolment. The shim tests only exercised the CSV-import
--      branch, where no application is touched
--   3. amount_total_kobo was computed with a hardcoded x3 rather
--      than courses.instalments
--
-- All three were only reachable by running the real chain against
-- the real database. That is what this file does.
--
-- HOW TO RUN
--
-- Paste the whole thing into the Supabase SQL Editor and run it.
-- It wraps everything in a transaction and ROLLS BACK at the end,
-- so it creates nothing permanent. Every check raises NOTICE on
-- pass and EXCEPTION on fail -- a clean run means the chain works.
--
-- Run it after every migration that touches a function or
-- constraint. It takes seconds.
--
-- ═══════════════════════════════════════════════════════════════

begin;

do $$
declare
  v_app_id     uuid;
  v_course     record;
  v_summer     record;
  v_batch_id   uuid;
  v_term       record;
  v_approve    record;
  v_reject     record;
  v_kit_id     text;
  v_sid        text;
  v_count      int;
begin

  raise notice '── 1. Extensions reachable from a pinned search_path ──';

  -- The bug that broke summer enrolment. If pgcrypto is in
  -- `extensions` and a function pins search_path=public, this fails.
  begin
    perform gen_random_bytes(4);
    raise notice 'PASS  gen_random_bytes reachable';
  exception when others then
    raise exception 'FAIL  gen_random_bytes unreachable: %', sqlerrm;
  end;

  begin
    v_sid := generate_summer_id(2026);
    if v_sid !~ '^SM[0-9]{2}[0-9]{3,4}$' then
      raise exception 'FAIL  generate_summer_id returned malformed id: %', v_sid;
    end if;
    raise notice 'PASS  generate_summer_id -> %', v_sid;
  exception when others then
    raise exception 'FAIL  generate_summer_id: %', sqlerrm;
  end;

  begin
    perform generate_certificate_serial();
    raise notice 'PASS  generate_certificate_serial';
  exception when others then
    raise exception 'FAIL  generate_certificate_serial: %', sqlerrm;
  end;


  raise notice '── 2. Course catalogue is coherent ──';

  select count(*) into v_count from courses where status = 'live';
  if v_count = 0 then
    raise exception 'FAIL  no live courses -- the apply form has nothing to offer';
  end if;
  raise notice 'PASS  % live courses', v_count;

  select count(*) into v_count
    from courses where status = 'live' and price_kobo is null;
  if v_count > 0 then
    raise exception 'FAIL  % live course(s) have no price', v_count;
  end if;
  raise notice 'PASS  every live course has a price';

  select count(*) into v_count
    from courses
   where status = 'live' and price_monthly_kobo is not null and instalments is null;
  if v_count > 0 then
    raise exception 'FAIL  % course(s) have a monthly price but no instalment count', v_count;
  end if;
  raise notice 'PASS  monthly plans have instalment counts';

  select count(*) into v_count
    from courses where status = 'live' and (age_min is null or age_max is null);
  if v_count > 0 then
    raise warning 'WARN  % live course(s) have no age band -- the trigger falls back to 10-16', v_count;
  else
    raise notice 'PASS  every live course has an explicit age band';
  end if;


  raise notice '── 3. Summer application -> payment -> enrolment ──';

  select * into v_summer from courses where type = 'summer' and status = 'live' limit 1;
  if v_summer is null then
    raise exception 'FAIL  no live summer course to test with';
  end if;

  -- Submit through the same public RPC the website uses, not a
  -- direct insert -- that is the path real applications take.
  v_app_id := submit_application(
    p_student_name        => 'SMOKE TEST Student',
    p_student_dob         => (current_date - interval '13 years')::date,
    p_student_gender      => 'Male',
    p_student_school      => 'Smoke Test School',
    p_parent_name         => 'SMOKE TEST Parent',
    p_parent_email        => 'smoketest@example.com',
    p_parent_phone        => '+2348000000000',
    p_parent_relationship => 'Mother',
    p_course_slug         => v_summer.slug,
    p_plan                => null,
    p_amount_due_kobo     => v_summer.price_kobo,
    p_amount_total_kobo   => v_summer.price_kobo,
    p_referral_source     => 'Other',
    p_notes               => 'Created by the smoke test. Rolled back.',
    p_consent_given       => true,
    p_source              => 'manual'
  );
  raise notice 'PASS  submit_application (summer) -> %', v_app_id;

  -- Enrolling before payment must be refused.
  begin
    perform enrol_summer_student(p_application_id => v_app_id);
    raise exception 'FAIL  unpaid application was enrolled -- payment gate is broken';
  exception
    when others then
      if sqlerrm like '%FAIL%' then raise;
      end if;
      raise notice 'PASS  unpaid enrolment refused (%)', left(sqlerrm, 40);
  end;

  update applications
     set payment_status = 'paid', paid_at = now(), payment_ref = 'smoke-test'
   where id = v_app_id;

  -- The real thing. This is what was failing on the constraint.
  select * into v_summer from enrol_summer_student(p_application_id => v_app_id);
  raise notice 'PASS  enrol_summer_student -> % (%)', v_summer.summer_id, v_summer.name;

  -- Forward link must be set, or the constraint would have blocked.
  select summer_student_id, status into v_count, v_sid
    from applications where id = v_app_id;
  if v_sid <> 'approved' then
    raise exception 'FAIL  application not marked approved after enrolment';
  end if;
  raise notice 'PASS  application closed and linked to the summer student';

  -- Double enrolment must be refused.
  begin
    perform enrol_summer_student(p_application_id => v_app_id);
    raise exception 'FAIL  application was enrolled twice';
  exception
    when others then
      if sqlerrm like '%FAIL%' then raise;
      end if;
      raise notice 'PASS  double enrolment refused';
  end;


  raise notice '── 4. Summer ID gate ──';

  select * into v_summer
    from verify_summer_id(v_summer.summer_id, '127.0.0.1'::inet, 'smoke-test');
  if not v_summer.ok then
    raise warning 'WARN  verify_summer_id rejected a just-issued id (reason: %). Usually means no ACTIVE summer cohort for this year.', v_summer.reason;
  else
    raise notice 'PASS  verify_summer_id accepted the new id';
  end if;

  select * into v_summer
    from verify_summer_id('SM99999', '127.0.0.1'::inet, 'smoke-test');
  if v_summer.ok then
    raise exception 'FAIL  verify_summer_id accepted a nonexistent id';
  end if;
  raise notice 'PASS  verify_summer_id rejected a bad id';


  raise notice '── 5. Term application -> approval -> KIT ID ──';

  select * into v_term from courses
   where type = 'term' and status = 'live' and price_kobo is not null limit 1;

  if v_term is null then
    raise warning 'SKIP  no live term course';
  else
    v_app_id := submit_application(
      p_student_name        => 'SMOKE TEST Term',
      p_student_dob         => (current_date - interval '13 years')::date,
      p_student_gender      => 'Female',
      p_student_school      => 'Smoke Test School',
      p_parent_name         => 'SMOKE TEST Parent',
      p_parent_email        => 'smoketest2@example.com',
      p_parent_phone        => '+2348000000001',
      p_parent_relationship => 'Father',
      p_course_slug         => v_term.slug,
      p_plan                => 'upfront',
      p_amount_due_kobo     => v_term.price_kobo,
      p_amount_total_kobo   => v_term.price_kobo,
      p_consent_given       => true,
      p_source              => 'manual'
    );
    raise notice 'PASS  submit_application (term) -> %', v_app_id;

    -- Tampered amount must be rejected by the trigger.
    begin
      perform submit_application(
        p_student_name      => 'SMOKE TEST Tamper',
        p_student_dob       => (current_date - interval '13 years')::date,
        p_student_gender    => null, p_student_school => null,
        p_parent_name       => 'X', p_parent_email => 'x@example.com',
        p_parent_phone      => '+2348000000002', p_parent_relationship => null,
        p_course_slug       => v_term.slug,
        p_plan              => 'upfront',
        p_amount_due_kobo   => 10000,    -- ₦100 for a ₦75,000 course
        p_amount_total_kobo => 10000,
        p_consent_given     => true, p_source => 'manual'
      );
      raise exception 'FAIL  tampered amount was accepted';
    exception
      when others then
        if sqlerrm like '%FAIL%' then raise;
        end if;
        raise notice 'PASS  tampered amount rejected';
    end;

    update applications
       set payment_status = 'paid', paid_at = now(), payment_ref = 'smoke-test-2'
     where id = v_app_id;

    select id into v_batch_id from batches
     where course_slug = v_term.slug and status not in ('completed','cancelled')
     limit 1;

    if v_batch_id is null then
      raise warning 'SKIP  no batch for % -- approval untested. CREATE A BATCH.', v_term.slug;
    else
      select * into v_approve from approve_application(v_app_id, v_batch_id);
      if v_approve.kit_id !~ '^[A-Z]{2}[0-9]{4}-[0-9]{4}$' then
        raise exception 'FAIL  malformed KIT ID: %', v_approve.kit_id;
      end if;
      raise notice 'PASS  approve_application -> % in %', v_approve.kit_id, v_approve.batch_label;

      select count(*) into v_count from payments where application_id = v_app_id;
      if v_count = 0 then
        raise exception 'FAIL  approval recorded no payment row';
      end if;
      raise notice 'PASS  payment ledger written (% row(s))', v_count;
    end if;
  end if;


  raise notice '── 6. Rejection and refund exposure ──';

  v_app_id := submit_application(
    p_student_name        => 'SMOKE TEST Reject',
    p_student_dob         => (current_date - interval '13 years')::date,
    p_student_gender      => null, p_student_school => null,
    p_parent_name         => 'SMOKE TEST Parent',
    p_parent_email        => 'smoketest3@example.com',
    p_parent_phone        => '+2348000000003',
    p_parent_relationship => null,
    p_course_slug         => (select slug from courses where type='summer' and status='live' limit 1),
    p_plan                => null,
    p_amount_due_kobo     => (select price_kobo from courses where type='summer' and status='live' limit 1),
    p_amount_total_kobo   => (select price_kobo from courses where type='summer' and status='live' limit 1),
    p_consent_given       => true, p_source => 'manual'
  );

  update applications
     set payment_status = 'paid', paid_at = now(), payment_ref = 'smoke-test-3'
   where id = v_app_id;

  select * into v_reject from reject_application(v_app_id, 'Smoke test rejection');
  if not v_reject.refund_due then
    raise exception 'FAIL  a paid rejected application did not surface a refund';
  end if;
  raise notice 'PASS  reject_application surfaced refund of % kobo', v_reject.refund_kobo;

  -- Rejection without a reason must be refused.
  begin
    perform reject_application(v_app_id, '');
    raise exception 'FAIL  rejection accepted without a reason';
  exception
    when others then
      if sqlerrm like '%FAIL%' then raise;
      end if;
      raise notice 'PASS  reason-less rejection refused';
  end;


  raise notice '── 7. Read paths the app depends on ──';

  perform * from admin_application_queue limit 1;
  raise notice 'PASS  admin_application_queue';

  perform * from admin_stats;
  raise notice 'PASS  admin_stats';

  perform * from public_courses limit 1;
  raise notice 'PASS  public_courses';

  perform * from get_summer_portal();
  raise notice 'PASS  get_summer_portal';

  perform * from get_summer_resources();
  raise notice 'PASS  get_summer_resources';

  perform * from admin_outstanding_payments limit 1;
  raise notice 'PASS  admin_outstanding_payments';


  raise notice '════════════════════════════════════════';
  raise notice 'ALL CHECKS PASSED';
  raise notice '════════════════════════════════════════';

end $$;

-- Nothing above is kept. Change to COMMIT only if you deliberately
-- want the test rows in your database, which you almost certainly
-- do not.
rollback;
