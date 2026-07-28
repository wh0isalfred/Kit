-- ============================================================
-- 0024 — student read path for their own submissions.
--
-- 0023's summer_submissions RLS only grants admin SELECT, so a
-- student reading their own submission via a direct .from() query
-- comes back empty — the detail page would always show "Assigned"
-- even right after turning in. This function is the read side of the
-- same trust model: the calling Server Action passes the cookie's
-- sid, and only that student's rows come back.
--
-- Save as 0024_summer_my_submissions.sql (or your real next number).
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_submission(
  p_summer_student_id uuid,
  p_resource_id uuid
) RETURNS TABLE (
  status text,
  url text,
  storage_path text,
  submitted_at timestamptz,
  feedback text,
  returned_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT s.status, s.url, s.storage_path, s.submitted_at, s.feedback, s.returned_at
      FROM summer_submissions s
     WHERE s.summer_student_id = p_summer_student_id
       AND s.resource_id = p_resource_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_submission(uuid, uuid) TO anon, authenticated;

-- ── All of a student's submissions at once, for the homework list ──
-- Returns one row per resource_id the student has acted on, so the
-- list page can show status per assignment without N queries.
CREATE OR REPLACE FUNCTION get_my_submissions(
  p_summer_student_id uuid
) RETURNS TABLE (
  resource_id uuid,
  status text,
  submitted_at timestamptz,
  returned_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT s.resource_id, s.status, s.submitted_at, s.returned_at
      FROM summer_submissions s
     WHERE s.summer_student_id = p_summer_student_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_submissions(uuid) TO anon, authenticated;
