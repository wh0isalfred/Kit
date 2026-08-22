-- 0049 · Migrate summer_batch_sessions data into summer_class_sessions
-- ───────────────────────────────────────────────────────────────
-- Follow-up to 0048 (schema only). Moves the 3 real, existing
-- summer_batch_sessions rows confirmed safe against live data (via
-- preview_0048_data_migration.sql) into the new table. The 4th row
-- (batch 4e26a933, week 1, instructor "Mr. Alfred Enyinna") is
-- deliberately excluded — no matching batch_week_content row exists
-- for it, and Alfred's call was to skip it rather than auto-create a
-- placeholder week-content row. That instructor name stays only in
-- the old, deprecated summer_batch_sessions table.
--
-- ONE-TIME migration, not idempotent by design — summer_class_sessions
-- has no unique constraint on (batch_id, week_number) since multiple
-- sessions per week is the entire point of the new model, so running
-- this a second time WOULD create duplicate rows. Run exactly once.
--
-- Column mapping, and why:
--   instructor (text)  -> instructor_name (no attempt to auto-match
--     "Mr. Alfred" / "Mr. Alfred Enyinna" to a real teachers.id row --
--     guessing a name match risks attaching the wrong teacher's
--     account to historical data; a real teacher_id can be set later,
--     by a human, if wanted)
--   next_class_at      -> scheduled_start_at (closest existing concept)
--   live_started_at    -> started_at (only meaningful for the row
--     that was actually live; NULL carries over as NULL otherwise)
--   is_live             -> status: 'live' if true, else 'scheduled'
--     (a conservative default -- nothing reads this column yet, so a
--     non-live row being labelled 'scheduled' rather than 'ended' has
--     zero live consequence; easily corrected by hand later once a
--     real UI exists to edit it)
--   scheduled_end_at, ended_at, title, teacher_id, created_by -- no
--     equivalent existed in the old table; left NULL

insert into summer_class_sessions (
  batch_id,
  week_number,
  instructor_name,
  meet_link,
  scheduled_start_at,
  started_at,
  status
)
select
  sbs.batch_id,
  sbs.week,
  sbs.instructor,
  sbs.meet_link,
  sbs.next_class_at,
  sbs.live_started_at,
  case when sbs.is_live then 'live' else 'scheduled' end
from summer_batch_sessions sbs
join batch_week_content bwc
  on bwc.batch_id = sbs.batch_id
 and bwc.week_number = sbs.week;
-- INNER JOIN, not LEFT -- this is what naturally excludes the
-- orphaned row (4e26a933, week 1) without any special-case logic.
