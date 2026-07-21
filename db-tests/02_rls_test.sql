-- RLS isolation test. Local only.
--
-- This is the test that matters most. ADR 003's entire justification
-- is that a forgotten WHERE clause must not be able to expose another
-- family's child. That claim is worth nothing unproven.
--
-- Runs as a non-superuser role, because RLS does not apply to the
-- table owner or a superuser — a test run as postgres would pass
-- while the real policies did nothing.

\set ON_ERROR_STOP on

-- ── test role ─────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'kit_app') then
    create role kit_app login;
  end if;
end $$;

grant usage on schema public, auth, storage to kit_app;
grant select, insert, update, delete on all tables in schema public to kit_app;
grant select, insert, update on all tables in schema auth to kit_app;
grant usage, select on all sequences in schema public to kit_app;
grant execute on all functions in schema public, auth to kit_app;


-- ── fixtures: two batches, two students, two teachers ─────────
do $$
declare
  v_admin uuid := gen_random_uuid();
  v_t1 uuid; v_t2 uuid;
  v_t1u uuid := gen_random_uuid();
  v_t2u uuid := gen_random_uuid();
  v_s1u uuid := gen_random_uuid();
  v_s2u uuid := gen_random_uuid();
  v_b1 uuid; v_b2 uuid;
  v_s1 uuid; v_s2 uuid;
begin
  insert into auth.users (id, email) values
    (v_admin,'admin@kit.ng'), (v_t1u,'t1@kit.ng'), (v_t2u,'t2@kit.ng'),
    (v_s1u,'s1@kit.ng'), (v_s2u,'s2@kit.ng');

  insert into profiles (user_id, role) values
    (v_admin,'admin'), (v_t1u,'teacher'), (v_t2u,'teacher'),
    (v_s1u,'student'), (v_s2u,'student');

  insert into teachers (user_id, name, email)
    values (v_t1u,'Teacher One','t1@kit.ng') returning id into v_t1;
  insert into teachers (user_id, name, email)
    values (v_t2u,'Teacher Two','t2@kit.ng') returning id into v_t2;

  insert into batches (course_slug, cohort_label, year, cohort_number, teacher_id, status)
    values ('web-development','RLS-A',2026,51,v_t1,'active') returning id into v_b1;
  insert into batches (course_slug, cohort_label, year, cohort_number, teacher_id, status)
    values ('web-development','RLS-B',2026,52,v_t2,'active') returning id into v_b2;

  insert into students (user_id, kit_id, name, email, batch_id, parent_phone, parent_email)
    values (v_s1u,'WD2651-0001','Student A','s1@kit.ng',v_b1,'8010000001','pa@x.com')
    returning id into v_s1;
  insert into students (user_id, kit_id, name, email, batch_id, parent_phone, parent_email)
    values (v_s2u,'WD2652-0001','Student B','s2@kit.ng',v_b2,'8010000002','pb@x.com')
    returning id into v_s2;

  -- one announcement and one resource per batch
  insert into announcements (batch_id, message) values
    (v_b1,'Batch A only'), (v_b2,'Batch B only');

  insert into resources (batch_id, title, url, locked) values
    (v_b1,'A unlocked','https://x/1',false),
    (v_b1,'A LOCKED',  'https://x/2',true),
    (v_b2,'B unlocked','https://x/3',false);

  -- stash the ids for the checks below
  create table if not exists _rls_fixtures (k text primary key, v uuid);
  delete from _rls_fixtures;
  insert into _rls_fixtures values
    ('admin',v_admin), ('t1u',v_t1u), ('t2u',v_t2u),
    ('s1u',v_s1u), ('s2u',v_s2u),
    ('b1',v_b1), ('b2',v_b2), ('s1',v_s1), ('s2',v_s2);
end $$;

grant select, insert, update, delete on _rls_fixtures to kit_app;

-- RLS is bypassed for the table owner unless forced. Force it on the
-- tables under test so this runs the way production will.
alter table students      force row level security;
alter table announcements force row level security;
alter table resources     force row level security;
alter table submissions   force row level security;
alter table audit_log     force row level security;

set role kit_app;


do $$
declare
  v_count int;
  v_s1u uuid; v_s2u uuid; v_t1u uuid; v_b2 uuid; v_s2 uuid;
begin
  select v into v_s1u from _rls_fixtures where k='s1u';
  select v into v_s2u from _rls_fixtures where k='s2u';
  select v into v_t1u from _rls_fixtures where k='t1u';
  select v into v_b2  from _rls_fixtures where k='b2';
  select v into v_s2  from _rls_fixtures where k='s2';

  raise notice '';
  raise notice '════════ RLS ISOLATION TEST ════════';

  -- ── as Student A ─────────────────────────────────────────
  update auth._current set uid = v_s1u;

  select count(*) into v_count from students;
  assert v_count = 1, 'Student A can see % student rows, expected 1 (their own)', v_count;
  raise notice '  1 ✓ student sees only their own row (% visible)', v_count;

  select count(*) into v_count from announcements;
  assert v_count = 1, 'Student A sees % announcements, expected 1', v_count;
  raise notice '  2 ✓ student sees only their batch''s announcements';

  -- The one that matters: locked resources must not be readable.
  select count(*) into v_count from resources;
  assert v_count = 1,
    'LEAK: Student A can see % resources, expected 1 (their batch, unlocked only)', v_count;
  raise notice '  3 ✓ locked resource invisible to student (policy, not query)';

  select count(*) into v_count from resources where title = 'A LOCKED';
  assert v_count = 0, 'LEAK: the locked resource was readable';
  raise notice '    ✓ explicit locked-title lookup returns nothing';

  -- Cross-batch attempt, spelled out
  select count(*) into v_count from announcements where batch_id = v_b2;
  assert v_count = 0, 'LEAK: Student A read Batch B announcements';
  raise notice '  4 ✓ explicit cross-batch query returns nothing';

  -- Audit log is invisible to non-admin
  select count(*) into v_count from audit_log;
  assert v_count = 0, 'LEAK: a student can read the audit log';
  raise notice '  5 ✓ audit log invisible to student';

  -- ── as Teacher One ───────────────────────────────────────
  update auth._current set uid = v_t1u;

  -- Teachers have NO direct select on students (Doc 2 §5.4) —
  -- they read through the column-restricted view instead.
  select count(*) into v_count from students;
  assert v_count = 0,
    'LEAK: teacher has direct access to % student rows; they must use students_for_teacher', v_count;
  raise notice '  6 ✓ teacher has NO direct student table access';

  select count(*) into v_count from students_for_teacher;
  assert v_count = 1, 'teacher sees % students in their batch, expected 1', v_count;
  raise notice '  7 ✓ teacher sees their batch through the restricted view';

  select count(*) into v_count from students_for_teacher where batch_id = v_b2;
  assert v_count = 0, 'LEAK: teacher read another batch through the view';
  raise notice '    ✓ view does not leak other batches';

  -- The view must not expose parent contact or DOB at all.
  select count(*) into v_count
    from information_schema.columns
   where table_name = 'students_for_teacher'
     and column_name in ('parent_phone','parent_email','dob','school','parent_name');
  assert v_count = 0,
    'LEAK: students_for_teacher exposes % restricted columns', v_count;
  raise notice '  8 ✓ view exposes no parent contact, DOB or school';

  -- Teacher can see their own batch's resources including locked ones
  select count(*) into v_count from resources;
  assert v_count = 2, 'teacher sees % resources, expected 2 (both, incl. locked)', v_count;
  raise notice '  9 ✓ teacher sees locked resources in their own batch';

  raise notice '';
  raise notice '════════ ALL RLS CHECKS PASSED ════════';
  raise notice '';
end $$;

reset role;

-- Undo the forced RLS so later runs behave normally.
alter table students      no force row level security;
alter table announcements no force row level security;
alter table resources     no force row level security;
alter table submissions   no force row level security;
alter table audit_log     no force row level security;
