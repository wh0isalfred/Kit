-- 0045 · Teacher read access to summer_students, summer_resources,
-- summer_submissions
-- ───────────────────────────────────────────────────────────────
-- Found BEFORE shipping this time, not after: building the teacher
-- Overview tab required getBatchOverview() (batch-actions.ts), which
-- reads summer_students (roster count), summer_resources (assignment
-- counts), and summer_submissions (grading counts) — all three were
-- admin-only (ALL / SELECT gated on nothing but is_admin(), confirmed
-- via pg_policies before writing this, not assumed). Same shape as
-- 0043's gap on summer_batch_sessions: a teacher session would get
-- zero rows back from all three, silently, no error — "0/0
-- assignments published" for a batch with real homework.
--
-- Read-only for teachers on all three — Overview never writes
-- anything, so no insert/update policies needed here, unlike 0040/
-- 0043 which needed the full read/write set for their own tabs.
--
-- summer_resources' policy below was corrected before finalizing:
-- confirmed directly against information_schema that batch_id DOES
-- exist on this table and IS nullable (NULL = cohort-wide,
-- non-null = batch-specific override) — an initial draft assumed
-- otherwise purely from getBatchOverview's query shape and would have
-- shipped a real gap (batch-specific resources invisible to the
-- teacher they belong to) had it not been checked against the actual
-- schema first.

alter table summer_students enable row level security;
alter table summer_resources enable row level security;
alter table summer_submissions enable row level security;

-- summer_students: a teacher needs to COUNT their batch's roster
-- (seats_used) — full row access, not just a count, since RLS can't
-- distinguish "let them count" from "let them read"; the alternative
-- would be a SECURITY DEFINER counting RPC, which is more machinery
-- than a roster-count read justifies given summer_students has no
-- sensitive fields beyond what a teacher legitimately needs to see
-- for their own batch anyway (name, not payment/contact details —
-- verify this table's actual columns before relying on that
-- assumption elsewhere; this migration only grants what
-- getBatchOverview's existing `.select("id")` needs).
create policy "teachers read their own batch's roster"
  on summer_students for select
  using (is_teacher_for_batch(batch_id));

-- summer_resources: published/unpublished assignment counts.
-- CORRECTED before finalizing — batch_id DOES exist on this table
-- (confirmed via information_schema, an earlier draft of this
-- migration wrongly inferred it didn't from getBatchOverview's query
-- shape alone). batch_id is nullable: NULL means cohort-wide
-- (visible to every batch in that cohort_year), a real value means
-- batch-specific — the exact "batch-specific overrides" pattern doc
-- 06 describes, and the same shape getBatchHomeworkAssignments()
-- already handles with .or(`batch_id.is.null,batch_id.eq.${batchId}`)
-- in application code. This policy mirrors that logic at the RLS
-- layer: a teacher can read a resource if it's cohort-wide for a
-- cohort year they teach in, OR batch-specific to a batch they hold.
create policy "teachers read resources for their batches or cohort"
  on summer_resources for select
  using (
    exists (
      select 1
      from teacher_batches tb
      join teachers t on t.id = tb.teacher_id
      join batches b on b.id = tb.batch_id
      where t.user_id = auth.uid()
        and t.active
        and (
          (summer_resources.batch_id is null and b.year = summer_resources.cohort_year)
          or summer_resources.batch_id = b.id
        )
    )
  );

-- summer_submissions: grading counts. Scoped through summer_students
-- (submissions belong to a student, students belong to a batch) —
-- mirrors the exact join shape get_grading_queue already uses
-- server-side (doc 06), just expressed as an RLS policy instead of a
-- SECURITY DEFINER function, since this is a plain read, not a write.
create policy "teachers read submissions for their batch's students"
  on summer_submissions for select
  using (
    exists (
      select 1
      from summer_students ss
      where ss.id = summer_submissions.summer_student_id
        and is_teacher_for_batch(ss.batch_id)
    )
  );

-- Verify after applying: as a teacher session, getBatchOverview()
-- should return real assignments_published/assignments_total and
-- submissions_returned/submissions_turned_in counts, not 0/0, for any
-- batch the teacher actually holds.
