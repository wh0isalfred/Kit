-- ============================================================
-- Summer: batches, per-batch sessions, homework submissions,
-- attendance.
--
-- Rename this file to match your actual next migration number —
-- I don't have visibility into what's been added since 0019 in
-- the handoff doc, so this is deliberately unnumbered rather than
-- guessing "0020" and risking a collision.
--
-- PURELY ADDITIVE. Nothing existing is dropped, altered, or
-- renamed in this pass — see the note at the bottom about why
-- summer_cohorts.is_live is left alone for now, not removed.
--
-- Run your smoke test (db-tests/smoke_test.sql) after this, same
-- as your own convention for any migration touching a constraint.
-- ============================================================

-- ── 1. Summer students belong to a batch ──────────────────────
-- Reuses the EXISTING `batches` table (already generic — keyed by
-- course_slug, not term-program-specific) rather than a parallel
-- summer-only batches table. Nullable for now: existing enrolled
-- students from before batches existed have no batch to backfill
-- to, and forcing NOT NULL here would break them. Enforce NOT NULL
-- at the application layer for new enrolments instead.
ALTER TABLE summer_students
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES batches(id);

CREATE INDEX IF NOT EXISTS idx_summer_students_batch
  ON summer_students(batch_id);

-- ── 2. Per-batch, per-week session details ────────────────────
-- summer_content stays cohort-wide — the curriculum itself (what's
-- being taught) is shared across every batch. This table holds what
-- ACTUALLY VARIES per batch: who's teaching, the meet link, the
-- schedule, and whether that specific batch's class is live right
-- now. is_live lives HERE, not on summer_cohorts, because two
-- batches are never live at the same moment.
CREATE TABLE IF NOT EXISTS summer_batch_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  week int NOT NULL CHECK (week BETWEEN 1 AND 3),
  instructor text,
  meet_link text,
  next_class_at timestamptz,
  is_live boolean NOT NULL DEFAULT false,
  live_started_at timestamptz,
  UNIQUE (batch_id, week)
);

-- Admin-only writes, same posture as summer_cohorts/summer_content.
ALTER TABLE summer_batch_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY summer_batch_sessions_admin_write
  ON summer_batch_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- No public/anon SELECT policy here deliberately — summer students
-- have no session (ADR 002), so they read this exclusively through
-- a SECURITY DEFINER function (Phase 2), same pattern as every other
-- summer read path.

-- ── 3. Homework: does this task want a link or a file? ────────
-- Admin decides per-task, not left to the student to choose. Only
-- meaningful when kind = 'homework' — NULL for every other kind.
ALTER TABLE summer_resources
  ADD COLUMN IF NOT EXISTS submission_type text
    CHECK (submission_type IN ('link', 'file') OR submission_type IS NULL);

-- ── 4. Submissions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS summer_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  summer_student_id uuid NOT NULL REFERENCES summer_students(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES summer_resources(id) ON DELETE CASCADE,
  url text,
  storage_path text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  -- One submission per student per task — a resubmission should
  -- UPDATE this row, not create a second one.
  UNIQUE (summer_student_id, resource_id)
);

ALTER TABLE summer_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY summer_submissions_admin_read
  ON summer_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- No anon/student policy — writes go through a SECURITY DEFINER
-- function (Phase 2) the same way applications/summer enrolment do,
-- since summer students have no auth session to scope RLS to.

-- ── 5. Attendance — self-check-in, not admin roll call ─────────
-- One row per student per week, written when they hit "Join class."
-- UNIQUE on (student, week) makes check-in idempotent — clicking
-- Join twice in one session doesn't double-record.
CREATE TABLE IF NOT EXISTS summer_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  summer_student_id uuid NOT NULL REFERENCES summer_students(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES batches(id),
  week int NOT NULL CHECK (week BETWEEN 1 AND 3),
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (summer_student_id, week)
);

ALTER TABLE summer_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY summer_attendance_admin_read
  ON summer_attendance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ============================================================
-- DELIBERATELY NOT DONE IN THIS MIGRATION:
--
-- summer_cohorts.is_live / live_started_at are NOT dropped here.
-- Dropping them now, before set_summer_live() and
-- get_summer_portal() are updated to read from
-- summer_batch_sessions instead, would break the live app between
-- this migration and the Phase 2 RPC updates. Once Phase 2 ships
-- and is confirmed working, a follow-up migration should drop
-- those two columns — don't let them linger as confusing dead
-- columns indefinitely, but don't drop them yet either.
--
-- I also don't know summer_cohorts' full current column list for
-- certain (working from the handoff doc, not a live schema dump),
-- so I'm not touching that table at all in this pass.
-- ============================================================
