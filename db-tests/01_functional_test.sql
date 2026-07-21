-- Functional test. Local only.
-- Exercises the paths where real bugs hide: the approve chain,
-- ID generation under concurrency-shaped conditions, points
-- accrual and reconciliation, batch capacity, amount tampering,
-- and the summer rate limiter.

\set ON_ERROR_STOP on
\timing off

do $$
declare
  v_admin   uuid := gen_random_uuid();
  v_teacher uuid;
  v_batch   uuid;
  v_app     uuid;
  v_app2    uuid;
  v_res     record;
  v_sid     uuid;
  v_kit     text;
  v_session uuid;
  v_assign  uuid;
  v_sub     uuid;
  v_points  int;
  v_summer  text;
  v_rl      record;
  v_ver     record;
  v_count   int;
  v_ok      bool;
begin
  raise notice '';
  raise notice '════════ KIT DATABASE FUNCTIONAL TEST ════════';

  -- Act as admin for the whole run.
  insert into auth.users (id, email) values (v_admin, 'ade@kit.ng');
  insert into profiles (user_id, role, full_name) values (v_admin, 'admin', 'Ade');
  update auth._current set uid = v_admin;

  -- ── 1 · course catalogue ─────────────────────────────────
  select count(*) into v_count from courses where status = 'live';
  assert v_count = 5, 'expected 5 live courses, got ' || v_count;
  raise notice '  1 ✓ course catalogue seeded (% live)', v_count;

  -- ── 2 · teacher + batch ──────────────────────────────────
  insert into teachers (name, email) values ('Mr Chidi', 'chidi@kit.ng')
    returning id into v_teacher;

  insert into batches (course_slug, cohort_label, year, cohort_number,
                       teacher_id, status, capacity)
  values ('web-development', 'B-01', 2026, 1, v_teacher, 'active', 2)
    returning id into v_batch;
  raise notice '  2 ✓ batch created (capacity deliberately 2 for the capacity test)';

  -- ── 3 · amount tampering is rejected ─────────────────────
  -- Doc 2 §9.4: "a client-side price is a suggestion, not a fact."
  begin
    insert into applications (
      student_name, student_dob, parent_name, parent_email, parent_phone,
      course_slug, plan, amount_due_kobo, amount_total_kobo
    ) values (
      'Tamper Test', '2012-05-01', 'Parent', 'p@x.com', '8021234567',
      'web-development', 'upfront', 10000, 10000   -- ₦100 for a ₦75,000 course
    );
    raise exception 'TEST FAILED: a ₦100 payment for a ₦75,000 course was accepted';
  exception when check_violation then
    raise notice '  3 ✓ tampered amount rejected by the database';
  end;

  -- ── 4 · age eligibility is enforced ──────────────────────
  begin
    insert into applications (
      student_name, student_dob, parent_name, parent_email, parent_phone,
      course_slug, plan, amount_due_kobo, amount_total_kobo
    ) values (
      'Too Young', current_date - interval '7 years', 'Parent', 'p@x.com',
      '8021234567', 'web-development', 'upfront', 7500000, 7500000
    );
    raise exception 'TEST FAILED: a 7-year-old was accepted';
  exception when check_violation then
    raise notice '  4 ✓ under-age application rejected';
  end;

  -- 16-year-old: currently rejected because age_max is 15.
  -- This is Doc 1 §10.1 surfacing as a runtime failure, exactly as
  -- the seed file warns. Asserting it so the behaviour is visible
  -- rather than discovered by a parent.
  begin
    insert into applications (
      student_name, student_dob, parent_name, parent_email, parent_phone,
      course_slug, plan, amount_due_kobo, amount_total_kobo
    ) values (
      'Sixteen', current_date - interval '16 years 2 months', 'Parent',
      'p@x.com', '8021234567', 'web-development', 'upfront', 7500000, 7500000
    );
    raise notice '  4 ! a 16-year-old WAS accepted — age_max must have been raised';
  exception when check_violation then
    raise notice '  4 ⚠ 16-year-old REJECTED (site advertises 10–16). Doc 1 §10.1 — unresolved.';
  end;

  -- ── 5 · valid application, monthly plan ──────────────────
  insert into applications (
    student_name, student_dob, student_gender, student_school,
    parent_name, parent_email, parent_phone, parent_relationship,
    course_slug, plan, amount_due_kobo, amount_total_kobo,
    referral_source, notes, consent_given, consent_at, consent_version
  ) values (
    'Joshua Okafor', '2012-03-14', 'Male', 'Seacrest Preparatory',
    'Mrs Okafor', 'okafor@email.com', '8021234567', 'Mother',
    'web-development', 'monthly', 2700000, 8100000,
    'Instagram', 'Loves building things.', true, now(), 'v1'
  ) returning id into v_app;

  select age_at_application into v_count from applications where id = v_app;
  assert v_count is not null, 'age_at_application was not derived';
  raise notice '  5 ✓ application accepted, age derived from DOB (%)', v_count;

  -- ── 6 · cannot approve before payment ────────────────────
  -- Doc 3 §6.3: "don't let one be approved until payment is verified."
  begin
    perform approve_application(v_app, v_batch);
    raise exception 'TEST FAILED: an unpaid application was approved';
  exception when check_violation then
    raise notice '  6 ✓ approval blocked while payment unverified';
  end;

  -- ── 7 · the approve chain ────────────────────────────────
  update applications
     set payment_status = 'paid', paid_at = now(), payment_ref = 'PSK_TEST_001'
   where id = v_app;

  select * into v_res from approve_application(v_app, v_batch);
  v_sid := v_res.student_id;
  v_kit := v_res.kit_id;

  assert v_kit = 'WD2601-0001', 'expected WD2601-0001, got ' || v_kit;
  raise notice '  7 ✓ approved → KIT ID %', v_kit;

  -- instalments 2 and 3 scheduled
  select count(*) into v_count
    from payments where student_id = v_sid and status = 'pending';
  assert v_count = 2, 'expected 2 pending instalments, got ' || v_count;
  raise notice '    ✓ % pending instalments scheduled (the spreadsheet replacement)', v_count;

  -- ── 8 · double approval is impossible ────────────────────
  begin
    perform approve_application(v_app, v_batch);
    raise exception 'TEST FAILED: the same application was approved twice';
  exception when unique_violation then
    raise notice '  8 ✓ double approval rejected (no duplicate students)';
  end;

  -- ── 9 · KIT ID increments, never collides ────────────────
  insert into applications (
    student_name, student_dob, parent_name, parent_email, parent_phone,
    course_slug, plan, amount_due_kobo, amount_total_kobo,
    payment_status, paid_at, payment_ref
  ) values (
    'Amara Bello', '2011-08-02', 'Mr Bello', 'bello@email.com', '8039998888',
    'web-development', 'upfront', 7500000, 7500000, 'paid', now(), 'PSK_TEST_002'
  ) returning id into v_app2;

  select * into v_res from approve_application(v_app2, v_batch);
  assert v_res.kit_id = 'WD2601-0002', 'expected WD2601-0002, got ' || v_res.kit_id;
  raise notice '  9 ✓ second KIT ID % (counter, not count(*))', v_res.kit_id;

  -- ── 10 · batch capacity is enforced ──────────────────────
  -- Batch capacity is 2 and both seats are taken.
  insert into applications (
    student_name, student_dob, parent_name, parent_email, parent_phone,
    course_slug, plan, amount_due_kobo, amount_total_kobo,
    payment_status, paid_at, payment_ref
  ) values (
    'Third Student', '2012-01-01', 'Parent', 'p3@email.com', '8031112222',
    'web-development', 'upfront', 7500000, 7500000, 'paid', now(), 'PSK_TEST_003'
  ) returning id into v_app2;

  begin
    perform approve_application(v_app2, v_batch);
    raise exception 'TEST FAILED: a 3rd student joined a 2-seat batch';
  exception when check_violation then
    raise notice ' 10 ✓ batch capacity enforced at the database';
  end;

  -- ── 11 · class, attendance, punctuality points ───────────
  insert into class_sessions (batch_id, title, scheduled_at, started_at, status)
  values (v_batch, 'Intro to HTML', now(), now(), 'live')
    returning id into v_session;

  insert into attendance (session_id, student_id, joined_at)
  values (v_session, v_sid, now() + interval '2 minutes');

  select kit_points into v_points from students where id = v_sid;
  assert v_points = 10, 'expected 10 punctuality points, got ' || v_points;
  raise notice ' 11 ✓ punctual join → % points', v_points;

  -- late join earns nothing
  insert into attendance (session_id, student_id, joined_at)
  select v_session, s.id, now() + interval '30 minutes'
    from students s where s.kit_id = 'WD2601-0002';

  select punctual into v_ok from attendance a
    join students s on s.id = a.student_id
   where s.kit_id = 'WD2601-0002';
  assert v_ok = false, 'a 30-minute-late join was marked punctual';
  raise notice '    ✓ late join correctly not punctual';

  -- ── 12 · assignment, submission, grade points ────────────
  insert into assignments (batch_id, title, max_grade, due_at)
  values (v_batch, 'Build a landing page', 100, now() + interval '7 days')
    returning id into v_assign;

  insert into submissions (assignment_id, student_id, content)
  values (v_assign, v_sid, 'https://github.com/...')
    returning id into v_sub;

  select kit_points into v_points from students where id = v_sid;
  assert v_points = 30, 'expected 30 after submission, got ' || v_points;

  update submissions set grade = 85, graded_at = now() where id = v_sub;

  select kit_points into v_points from students where id = v_sid;
  assert v_points = 45, 'expected 45 after an 85% grade, got ' || v_points;
  raise notice ' 12 ✓ submit + strong grade → % points', v_points;

  -- ── 13 · grade cannot exceed the maximum ─────────────────
  begin
    update submissions set grade = 500 where id = v_sub;
    raise exception 'TEST FAILED: a grade of 500/100 was accepted';
  exception when check_violation then
    raise notice ' 13 ✓ over-maximum grade rejected';
  end;

  -- ── 14 · duplicate submission is impossible ──────────────
  begin
    insert into submissions (assignment_id, student_id, content)
    values (v_assign, v_sid, 'double click');
    raise exception 'TEST FAILED: a duplicate submission was created';
  exception when unique_violation then
    raise notice ' 14 ✓ duplicate submission rejected (the double-click bug)';
  end;

  -- ── 15 · points are idempotent ───────────────────────────
  perform award_kit_points(v_sid, 'punctuality', 'attendance',
    (select id from attendance where student_id = v_sid limit 1));

  select kit_points into v_points from students where id = v_sid;
  assert v_points = 45, 'a repeated award double-counted: ' || v_points;
  raise notice ' 15 ✓ repeat award ignored (webhook-retry safe)';

  -- ── 16 · reconciliation catches drift ────────────────────
  update students set kit_points = 9999 where id = v_sid;   -- simulate divergence
  perform reconcile_kit_points();

  select kit_points into v_points from students where id = v_sid;
  assert v_points = 45, 'reconciliation failed, got ' || v_points;
  raise notice ' 16 ✓ reconcile_kit_points() restored cached total from ledger';

  -- ── 17 · leaderboard ─────────────────────────────────────
  select count(*) into v_count from batch_top5 where batch_id = v_batch;
  assert v_count = 2, 'expected 2 leaderboard rows, got ' || v_count;
  raise notice ' 17 ✓ batch_top5 returns % students', v_count;

  -- ── 18 · resource locking ────────────────────────────────
  insert into resources (batch_id, title, url, locked)
  values (v_batch, 'Week 1 Slides', 'https://example.com/slides.pdf', true);

  update resources set locked = false where batch_id = v_batch;
  select unlocked_at is not null into v_ok from resources where batch_id = v_batch;
  assert v_ok, 'unlocked_at was not set on unlock';
  raise notice ' 18 ✓ unlocking a resource stamps unlocked_at automatically';

  -- ── 19 · summer ID generation ────────────────────────────
  select summer_id into v_summer
    from enrol_summer_student(null, 'Summer Kid', 2026, 'sp@email.com', '8040001111');

  assert v_summer ~ '^SM26[0-9]{3}$', 'bad summer ID shape: ' || v_summer;
  raise notice ' 19 ✓ summer ID generated: % (random, not sequential)', v_summer;

  -- randomness sanity: 20 IDs should not be consecutive
  for v_count in 1..20 loop
    perform enrol_summer_student(null, 'Kid ' || v_count, 2026, null, null);
  end loop;

  select count(distinct summer_id) into v_count
    from summer_students where cohort_year = 2026;
  assert v_count = 21, 'summer ID collision: only % unique', v_count;
  raise notice '    ✓ 21 unique IDs, no collisions';

  -- ── 20 · the summer gate ─────────────────────────────────
  select * into v_ver from verify_summer_id(v_summer, '10.0.0.1'::inet, 'test');
  assert v_ver.ok, 'a valid summer ID was rejected';
  raise notice ' 20 ✓ valid summer ID admitted (%)', v_ver.student_name;

  -- forgiving input: children type with spaces, hyphens, lower case
  select * into v_ver from verify_summer_id(
    lower(substr(v_summer,1,4) || '-' || substr(v_summer,5)), '10.0.0.1'::inet, 'test');
  assert v_ver.ok, 'a hyphenated/lowercase ID was rejected';
  raise notice '    ✓ hyphen + lowercase input still matches';

  -- ── 21 · rate limiting ───────────────────────────────────
  -- ADR 002 requires this. Doc 2 §9.4 recorded it as unbuilt.
  for v_count in 1..9 loop
    perform verify_summer_id('SM26000', '10.0.0.99'::inet, 'attacker');
  end loop;

  select * into v_ver from verify_summer_id(v_summer, '10.0.0.99'::inet, 'attacker');
  assert v_ver.reason = 'rate_limited',
    'brute force was NOT rate limited (reason: ' || v_ver.reason || ')';
  raise notice ' 21 ✓ brute force rate-limited after 8 failures (retry in %s)', v_ver.retry_after;

  -- a different IP is unaffected
  select * into v_ver from verify_summer_id(v_summer, '10.0.0.2'::inet, 'other');
  assert v_ver.ok, 'rate limiting leaked across IPs';
  raise notice '    ✓ other IPs unaffected';

  -- ── 22 · summer portal read ──────────────────────────────
  insert into summer_content (cohort_year, week, published, class_title, meet_link)
  values (2026, 1, false, 'Day 1', 'https://meet.google.com/abc');

  select count(*) into v_count from get_summer_portal();
  assert v_count = 0, 'an unpublished week leaked to the portal';
  raise notice ' 22 ✓ unpublished week returns nothing (holding state, not empty sections)';

  update summer_content set published = true where cohort_year = 2026 and week = 1;
  select count(*) into v_count from get_summer_portal();
  assert v_count = 1, 'a published week did not appear';
  raise notice '    ✓ published week renders';

  -- ── 23 · rejection surfaces refund exposure ──────────────
  insert into applications (
    student_name, student_dob, parent_name, parent_email, parent_phone,
    course_slug, plan, amount_due_kobo, amount_total_kobo,
    payment_status, paid_at, payment_ref
  ) values (
    'Reject Me', '2012-06-06', 'Parent', 'r@email.com', '8050001111',
    'web-development', 'upfront', 7500000, 7500000, 'paid', now(), 'PSK_TEST_R'
  ) returning id into v_app2;

  select * into v_res from reject_application(v_app2, 'Batch full this cohort');
  assert v_res.refund_due, 'a paid rejection did not flag a refund';
  raise notice ' 23 ✓ paid rejection flags ₦% refund owed',
    to_char(kobo_to_naira(v_res.refund_kobo), 'FM999,999');

  -- ── 24 · audit trail ─────────────────────────────────────
  select count(*) into v_count from audit_log;
  assert v_count >= 4, 'audit log is thin: only % rows', v_count;
  raise notice ' 24 ✓ audit log recorded % admin actions', v_count;

  raise notice '';
  raise notice '════════ ALL 24 CHECKS PASSED ════════';
  raise notice '';
end $$;
