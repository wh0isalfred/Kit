-- 0044 · Fix app_batch_ids() to use teacher_batches, not batches.teacher_id
-- ───────────────────────────────────────────────────────────────
-- Found live, not in review: a teacher granted real batches (via
-- teacher_batches, confirmed correctly written and RLS-readable on
-- that table specifically) still saw "No batches yet" on /teacher.
-- Root cause traced through the actual chain, not assumed:
--
--   getMyBatches() reads teacher_batches (correct, RLS lets this
--   through) to get a list of batch_ids, then queries `batches`
--   directly for cohort_label/capacity/course_slug for those ids.
--   `batches` RLS (batches_read policy, predates this feature) is
--   gated by in_my_batch(id), which delegates to app_batch_ids().
--
--   app_batch_ids()'s 'teacher' branch joined batches.teacher_id —
--   the OLD single-teacher-per-batch column, which predates
--   teacher_batches (0039) entirely and was never touched by any
--   migration in this feature. It has no knowledge teacher_batches
--   exists. Every batch grant made through the new admin UI produces
--   an array app_batch_ids() can never see, so in_my_batch() always
--   returns false for every teacher, silently — no error, the query
--   just returns zero rows, textbook doc 02 §II.A shape, this time in
--   pre-existing infrastructure neither this session nor the original
--   batch-shell build (doc 06) knew was there.
--
-- Fix: point the 'teacher' branch at teacher_batches, the actual
-- source of truth chosen for this feature (doc 08 §7 — many-to-many
-- via join table, not a column on batches, specifically so one
-- teacher could hold many batches and co-teaching was possible).
-- batches.teacher_id itself is left untouched — not dropped, not
-- backfilled — it may still be used elsewhere for a "primary
-- instructor of record" concept distinct from "who can access this
-- batch," and conflating the two wasn't asked for and isn't obviously
-- correct; this migration only fixes the ACCESS check.

create or replace function app_batch_ids()
returns uuid[]
language sql
stable
security definer
set search_path to 'public'
as $function$
  select case (select role from profiles where user_id = auth.uid())
    when 'student' then
      array(select batch_id from students
             where user_id = auth.uid() and batch_id is not null)
    when 'teacher' then
      array(
        select tb.batch_id
        from teacher_batches tb
        join teachers t on t.id = tb.teacher_id
        where t.user_id = auth.uid()
          and t.active
      )
    else '{}'::uuid[]
  end;
$function$;

comment on function app_batch_ids is
  'Returns the batch ids the current session may access. Teacher '
  'branch reads teacher_batches (0039), not batches.teacher_id — the '
  'old single-teacher column this function originally joined against, '
  'which teacher_batches was deliberately built to replace as the '
  'access source of truth (doc 08 §7). Fixed 0044 after being found '
  'live: correctly-written teacher_batches grants were invisible to '
  'this function, so every teacher-facing batch read silently '
  'returned zero rows regardless of real grants.';

-- Verify after applying:
--   select app_batch_ids();  -- as the teacher's own session, via the
--   Supabase dashboard's "Run as user" if available, or by checking
--   the app directly — /teacher should now show real batch cards for
--   any teacher with existing teacher_batches rows, no new grants
--   needed, since the grants were always correct.
