-- 0034 · Mark internal/test records so they don't distort real figures
-- ───────────────────────────────────────────────────────────────
-- An internal test application ("KIT", alfredenyinna03@gmail.com) was
-- submitted and manually marked paid to verify the payment flow. It is
-- real data and should stay — deleting test rows loses the evidence
-- that the flow was tested — but it should not count toward revenue or
-- the student roster.
--
-- A flag rather than a name filter: `where name <> 'KIT'` breaks the
-- day a real student is called Kit, and gives no way to mark the NEXT
-- test account without another migration.

alter table applications
  add column if not exists is_test boolean not null default false;

alter table summer_students
  add column if not exists is_test boolean not null default false;

comment on column applications.is_test is
  'Internal/test record. Excluded from revenue and dashboard counts.';
comment on column summer_students.is_test is
  'Internal/test record. Excluded from roster counts.';

-- Flag the known test records by id, not by name — precise, and it
-- documents exactly which rows were affected.
update applications
   set is_test = true
 where id = '5e8d54c5-7e31-40d5-824f-dfa3b32f7147';

update summer_students
   set is_test = true
 where application_id = '5e8d54c5-7e31-40d5-824f-dfa3b32f7147';


-- Rebuild admin_stats excluding test rows from every figure.
-- Unchanged from 0032 apart from the is_test filters.
create or replace view admin_stats as
 SELECT ( SELECT count(*) AS count
           FROM applications
          WHERE applications.status = 'pending'::text
            AND NOT applications.is_test) AS applications_pending,
    ( SELECT count(*) AS count
           FROM applications
          WHERE applications.status = 'pending'::text
            AND applications.payment_status = 'paid'::text
            AND NOT applications.is_test) AS applications_approvable,
    ( SELECT count(*) AS count
           FROM students
          WHERE students.status = 'active'::text) AS students_active,
    ( SELECT count(*) AS count
           FROM students
          WHERE students.status = 'completed'::text) AS students_completed,
    ( SELECT count(*) AS count
           FROM teachers
          WHERE teachers.active) AS teachers_active,
    ( SELECT count(*) AS count
           FROM batches
          WHERE batches.status = 'active'::text) AS batches_active,
    ( SELECT count(*) AS count
           FROM summer_students ss
             JOIN summer_cohorts sc ON sc.year = ss.cohort_year AND sc.active
          WHERE NOT ss.is_test) AS summer_students,
    ( SELECT summer_cohorts.current_week
           FROM summer_cohorts
          WHERE summer_cohorts.active
         LIMIT 1) AS summer_week,
    kobo_to_naira(( SELECT COALESCE(sum(applications.amount_due_kobo), 0::numeric)::bigint
           FROM applications
          WHERE applications.payment_status = 'paid'::text
            AND NOT applications.is_test)) AS revenue_naira,
    kobo_to_naira(( SELECT COALESCE(sum(applications.amount_due_kobo), 0::numeric)::bigint
           FROM applications
          WHERE applications.payment_status <> 'paid'::text
            AND applications.status NOT IN ('rejected'::text, 'withdrawn'::text)
            AND NOT applications.is_test)) AS outstanding_naira;

comment on view admin_stats is
  'Dashboard figures. Revenue from applications.amount_due_kobo (0032); test rows excluded (0034).';