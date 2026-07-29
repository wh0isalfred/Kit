-- ============================================================
-- 0026 — the grading queue.
--
-- get_homework_roster answers "for THIS assignment, where is
-- everyone?" — a lookup, one assignment at a time.
--
-- This answers the different question an admin actually opens in
-- the morning: "what is waiting on me, across everything?" Every
-- submission turned in and not yet returned, oldest first, so the
-- queue drains from the top and nobody's work sits for a week.
--
-- status = 'turned_in' is the whole filter. 'returned' rows are
-- done. Students with no row at all are 'assigned' — they belong in
-- the Missing list on the roster view, not in a grading queue,
-- because there is nothing to grade and return_homework needs a
-- submission id.
--
-- Run db-tests/smoke_test.sql after.
-- ============================================================

CREATE OR REPLACE FUNCTION get_grading_queue(
  p_batch_id uuid DEFAULT NULL
) RETURNS TABLE (
  submission_id uuid,
  summer_student_id uuid,
  student_name text,
  summer_id text,
  batch_id uuid,
  resource_id uuid,
  resource_title text,
  week integer,
  day_number integer,
  submission_type text,
  url text,
  storage_path text,
  submitted_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only an admin can view the grading queue.';
  END IF;

  RETURN QUERY
    SELECT
      sub.id,
      s.id,
      s.name,
      s.summer_id,
      s.batch_id,
      r.id,
      r.title,
      r.week,
      r.day_number,
      r.submission_type,
      sub.url,
      sub.storage_path,
      sub.submitted_at
    FROM summer_submissions sub
    JOIN summer_students  s ON s.id = sub.summer_student_id
    JOIN summer_resources r ON r.id = sub.resource_id
    WHERE sub.status = 'turned_in'
      AND (p_batch_id IS NULL OR s.batch_id = p_batch_id)
    -- Oldest first: the queue is FIFO, so the kid who turned in on
    -- Monday gets looked at before the kid who turned in an hour ago.
    ORDER BY sub.submitted_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_grading_queue(uuid) TO authenticated;

-- ============================================================
-- p_batch_id NULL returns the whole cohort. That is deliberate and
-- useful: the batch cards on /admin/summer can call this ONCE with
-- no argument and group by batch_id client-side to render "7 to
-- grade" on each card — rather than one round trip per batch, or a
-- second counts-only RPC that can drift out of sync with this one.
-- ============================================================
