-- 0032 · Revenue and outstanding from applications, not payments
-- ───────────────────────────────────────────────────────────────
-- admin_stats computed revenue_naira and outstanding_naira from the
-- `payments` table, which NOTHING in the application ever writes to —
-- confirmed by a full codebase search: the only matches for "payments"
-- are admin nav labels. Both figures were therefore permanently zero.
--
-- Real source of truth is `applications`:
--   - amount_due_kobo is captured at submission time from the course
--     price, so historical rows keep whatever was actually charged even
--     after a course price changes. (This is why a hardcoded price
--     array would be wrong — it would retroactively restate old revenue.)
--   - payment_status = 'paid' is set by BOTH payment routes: the
--     Paystack webhook and the manual markApplicationPaid admin action.
--     So manual bank transfers count exactly the same as card payments.
--
-- KNOWN LIMITATION, deliberate: for the 12-week monthly plan,
-- amount_due_kobo is only the FIRST instalment. Months 2 and 3 are
-- invoiced separately and nothing records them yet. So revenue_naira
-- means "money confirmed received", not "total contract value" — which
-- is the honest figure. Revisit when instalment tracking exists.
--
-- Rejected/withdrawn applications are excluded from outstanding: they
-- are not money anyone is still waiting on.

create or replace view admin_stats as
 SELECT ( SELECT count(*) AS count
           FROM applications
          WHERE applications.status = 'pending'::text) AS applications_pending,
    ( SELECT count(*) AS count
           FROM applications
          WHERE applications.status = 'pending'::text AND applications.payment_status = 'paid'::text) AS applications_approvable,
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
             JOIN summer_cohorts sc ON sc.year = ss.cohort_year AND sc.active) AS summer_students,
    ( SELECT summer_cohorts.current_week
           FROM summer_cohorts
          WHERE summer_cohorts.active
         LIMIT 1) AS summer_week,
    kobo_to_naira(( SELECT COALESCE(sum(applications.amount_due_kobo), 0::numeric)::bigint AS "coalesce"
           FROM applications
          WHERE applications.payment_status = 'paid'::text)) AS revenue_naira,
    kobo_to_naira(( SELECT COALESCE(sum(applications.amount_due_kobo), 0::numeric)::bigint AS "coalesce"
           FROM applications
          WHERE applications.payment_status <> 'paid'::text
            AND applications.status NOT IN ('rejected'::text, 'withdrawn'::text))) AS outstanding_naira;

comment on view admin_stats is
  'Dashboard figures. Revenue and outstanding come from applications.amount_due_kobo (0032) — the payments table exists but is never written to.';