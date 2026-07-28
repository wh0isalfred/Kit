-- ============================================================
-- 0023 — homework submission lifecycle (Google-Classroom style)
--
-- Builds on 0020's summer_submissions table. Adds the state a
-- submission moves through — Assigned (no row) -> Turned in ->
-- Returned (with feedback) — plus the RPCs for turn-in, unsubmit,
-- and the teacher's return-with-feedback.
--
-- No due-date / grade columns, per scope: text feedback only, no
-- numeric grades, no "late" concept (3-week camp).
--
-- Save as 0023_homework_submission_lifecycle.sql (or your real next
-- number). Run your smoke test after.
-- ============================================================

-- ── New columns on the existing submissions table ─────────────
-- status: only two real states persist as rows here. "assigned"
-- (not yet turned in) is represented by the ABSENCE of a row, same
-- as Google Classroom — so the column only ever holds turned_in or
-- returned.
ALTER TABLE summer_submissions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'turned_in'
    CHECK (status IN ('turned_in', 'returned')),
  ADD COLUMN IF NOT EXISTS feedback text,
  ADD COLUMN IF NOT EXISTS returned_at timestamptz;

-- ============================================================
-- turn_in_homework — student attaches work and turns it in.
-- Replaces the old submit_homework (which only ever set url).
-- Upserts on the UNIQUE(summer_student_id, resource_id) from 0020,
-- so re-turning-in after an unsubmit reuses the same row.
--
-- Trust boundary is the calling Server Action (reads the session
-- cookie), exactly as before — this RPC trusts the id it's given.
-- ============================================================
CREATE OR REPLACE FUNCTION turn_in_homework(
  p_summer_student_id uuid,
  p_resource_id uuid,
  p_url text DEFAULT NULL,
  p_storage_path text DEFAULT NULL
) RETURNS TABLE (id uuid, status text, submitted_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Guard: the resource must actually be a homework task that
  -- accepts submissions. Stops a link/video row being "turned in"
  -- against.
  IF NOT EXISTS (
    SELECT 1 FROM summer_resources r
    WHERE r.id = p_resource_id
      AND r.kind = 'homework'
      AND r.submission_type IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'That task does not accept submissions.';
  END IF;

  RETURN QUERY
  INSERT INTO summer_submissions
    (summer_student_id, resource_id, url, storage_path, status, submitted_at, feedback, returned_at)
  VALUES
    (p_summer_student_id, p_resource_id, p_url, p_storage_path, 'turned_in', now(), NULL, NULL)
  ON CONFLICT (summer_student_id, resource_id)
  DO UPDATE SET
    url = EXCLUDED.url,
    storage_path = EXCLUDED.storage_path,
    status = 'turned_in',
    submitted_at = now(),
    -- Re-submitting clears any prior feedback/returned state — it's
    -- new work, the old review no longer applies.
    feedback = NULL,
    returned_at = NULL
  RETURNING summer_submissions.id, summer_submissions.status, summer_submissions.submitted_at;
END;
$$;

GRANT EXECUTE ON FUNCTION turn_in_homework(uuid, uuid, text, text) TO anon, authenticated;

-- ============================================================
-- unsubmit_homework — student pulls their work back to edit it.
-- Deletes the row entirely, returning the task to the "assigned"
-- (no row) state. Only allowed while turned_in — once a teacher has
-- returned it, unsubmitting would silently discard their feedback,
-- so that's blocked.
-- ============================================================
CREATE OR REPLACE FUNCTION unsubmit_homework(
  p_summer_student_id uuid,
  p_resource_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  DELETE FROM summer_submissions
   WHERE summer_student_id = p_summer_student_id
     AND resource_id = p_resource_id
     AND status = 'turned_in';   -- not 'returned'
END;
$$;

GRANT EXECUTE ON FUNCTION unsubmit_homework(uuid, uuid) TO anon, authenticated;

-- ============================================================
-- return_homework — TEACHER returns a submission with feedback.
-- Admin-gated (is_admin()), unlike the two above. Flips status to
-- 'returned' and stamps feedback + returned_at.
-- ============================================================
CREATE OR REPLACE FUNCTION return_homework(
  p_submission_id uuid,
  p_feedback text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only an admin can return homework.';
  END IF;

  UPDATE summer_submissions
     SET status = 'returned',
         feedback = p_feedback,
         returned_at = now()
   WHERE id = p_submission_id;
END;
$$;

GRANT EXECUTE ON FUNCTION return_homework(uuid, text) TO authenticated;

-- ============================================================
-- get_homework_roster — TEACHER view: for one assignment, every
-- student in the relevant batch(es) and their submission state.
-- The LEFT JOIN is the point — students with no submission row show
-- up as "assigned" (not turned in), which is exactly who a teacher
-- is chasing.
--
-- p_batch_id optional: null = every student on the cohort for that
-- assignment; set = just that batch's roster.
-- ============================================================
CREATE OR REPLACE FUNCTION get_homework_roster(
  p_resource_id uuid,
  p_batch_id uuid DEFAULT NULL
) RETURNS TABLE (
  summer_student_id uuid,
  student_name text,
  summer_id text,
  batch_id uuid,
  submission_id uuid,
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
DECLARE
  v_cohort_year int;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only an admin can view the homework roster.';
  END IF;

  SELECT r.cohort_year INTO v_cohort_year
    FROM summer_resources r WHERE r.id = p_resource_id;

  RETURN QUERY
    SELECT
      s.id, s.name, s.summer_id, s.batch_id,
      sub.id, coalesce(sub.status, 'assigned'),
      sub.url, sub.storage_path, sub.submitted_at,
      sub.feedback, sub.returned_at
    FROM summer_students s
    LEFT JOIN summer_submissions sub
      ON sub.summer_student_id = s.id
     AND sub.resource_id = p_resource_id
    WHERE s.cohort_year = v_cohort_year
      AND (p_batch_id IS NULL OR s.batch_id = p_batch_id)
    ORDER BY
      -- Not-yet-turned-in first: that's the actionable list.
      (sub.id IS NOT NULL),
      s.name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_homework_roster(uuid, uuid) TO authenticated;

-- ============================================================
-- NOTE: the old submit_homework(uuid, uuid, text, text) from 0021
-- is now superseded by turn_in_homework. It still works (still
-- upserts a row), but it doesn't set status meaningfully and the UI
-- will stop calling it. Drop it in a later cleanup migration once
-- the new flow is confirmed — not dropping it here so nothing breaks
-- mid-deploy.
-- ============================================================
