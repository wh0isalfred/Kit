-- ============================================================
-- check_in_attendance — self-check-in, called when a student
-- clicks "Join class". Idempotent via the UNIQUE(summer_student_id,
-- week) constraint from the migration: a second click in the same
-- week no-ops instead of erroring or double-recording.
--
-- Trusts the caller the same way every other post-gate summer
-- action does (getSummerFileUrl, get_summer_portal, etc.) —
-- verify_summer_id() is the actual security boundary (ADR 002); once
-- a Server Action holds a valid session cookie, its sid is trusted.
-- This RPC does not re-verify who's calling it.
-- ============================================================
CREATE OR REPLACE FUNCTION check_in_attendance(
  p_summer_student_id uuid,
  p_batch_id uuid,
  p_week int
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  INSERT INTO summer_attendance (summer_student_id, batch_id, week)
  VALUES (p_summer_student_id, p_batch_id, p_week)
  ON CONFLICT (summer_student_id, week) DO NOTHING;
END;
$$;

-- ASSUMPTION, unverified: granting to anon since get_summer_portal
-- and friends are called via the plain createClient() (not a
-- service-role client) per page.tsx — meaning anon must already have
-- EXECUTE on those. Mirroring that here. Check this actually matches
-- your existing grants before relying on it.
GRANT EXECUTE ON FUNCTION check_in_attendance(uuid, uuid, int) TO anon, authenticated;

-- ============================================================
-- submit_homework — insert or update (resubmission) a student's
-- homework. Upserts on the UNIQUE(summer_student_id, resource_id)
-- constraint, so resubmitting the same task updates the existing
-- row rather than erroring or creating a duplicate.
--
-- Deliberately does NOT validate url/storage_path against the
-- resource's submission_type here — that's a UI-layer concern (show
-- the right input for the task), not something worth a hard DB
-- rejection.
-- ============================================================
CREATE OR REPLACE FUNCTION submit_homework(
  p_summer_student_id uuid,
  p_resource_id uuid,
  p_url text DEFAULT NULL,
  p_storage_path text DEFAULT NULL
) RETURNS TABLE (id uuid, submitted_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO summer_submissions (summer_student_id, resource_id, url, storage_path, submitted_at)
  VALUES (p_summer_student_id, p_resource_id, p_url, p_storage_path, now())
  ON CONFLICT (summer_student_id, resource_id)
  DO UPDATE SET
    url = EXCLUDED.url,
    storage_path = EXCLUDED.storage_path,
    submitted_at = now()
  RETURNING summer_submissions.id, summer_submissions.submitted_at;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_homework(uuid, uuid, text, text) TO anon, authenticated;
