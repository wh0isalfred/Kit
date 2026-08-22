-- 0047 · Per-batch week status (Summer v2, Step 2)
-- ───────────────────────────────────────────────────────────────
-- Part of the Summer Architecture v2 plan (doc 09). This step ONLY
-- adds the status column, the one-current-per-batch invariant, and
-- backfills existing state from summer_cohorts.current_week — it does
-- NOT change any student-facing read, does NOT create
-- summer_class_sessions (Step 3, not yet run), does NOT touch
-- attendance, and does NOT remove summer_cohorts.current_week. Every
-- one of those stays exactly as-is; nothing reads `status` or
-- `live_class_max_minutes` yet, so this migration changes zero
-- visible behaviour in the live app.
--
-- No new RLS needed — batch_week_content's existing policies (0040:
-- admin ALL; teacher select/insert/update own batch, no delete) are
-- row-scoped, not column-scoped, so they already cover the new
-- column without modification.

alter table batch_week_content
  add column if not exists status text not null default 'upcoming'
    check (status in ('upcoming', 'current', 'complete'));

comment on column batch_week_content.status is
  'upcoming | current | complete. Purely a display/filter label in '
  'v1 -- ''complete'' has no locking or automatic side effect '
  '(Alfred''s call, Summer v2 plan doc 09 §2). At most one ''current'' '
  'row per batch_id, enforced by an index below, not merely assumed.';

-- ── At most one 'current' week per batch ──────────────────────
-- Partial unique index, same technique already used for
-- summer_cohorts_one_active -- created BEFORE the backfill runs, so
-- if the backfill logic ever tried to mark two rows current for the
-- same batch (analysis below says it structurally can't), the UPDATE
-- fails loudly instead of silently leaving bad data in place.
create unique index if not exists batch_week_content_one_current_per_batch
  on batch_week_content (batch_id)
  where status = 'current';

comment on index batch_week_content_one_current_per_batch is
  'Enforces at most one status=''current'' row per batch_id. Mirrors '
  'the summer_cohorts_one_active technique (partial unique index), '
  'scoped per-batch instead of table-wide.';

-- ── Backfill: every batch's own 'current' week, from the cohort ──
-- Scoped deliberately narrow:
--   · courses.type = 'summer' only -- batch_week_content is shared
--     with the 12-week programme (0040's own comment), which has no
--     UI and no cohort-wide current_week concept to backfill FROM. A
--     12-week batch, if any exist, gets nothing touched here.
--   · sc.year = b.year -- matches the batch's OWN cohort year, not
--     blindly "whichever cohort happens to be active" the way
--     getBatchOverview()'s live read does today. More correct than
--     bug-for-bug replication; identical result in the common case
--     of one cohort running at a time.
--   · sc.active -- only the currently-active cohort's current_week is
--     treated as authoritative, matching every live read path today.
--   · Only EXISTING rows get touched. No new batch_week_content row
--     is created here. A batch with no saved content for the
--     cohort's current week gets nothing marked current -- not an
--     error, just no row qualifies. See the preview queries (shared
--     separately, run before this file) for exactly which batches
--     that affects.
update batch_week_content bwc
   set status = 'current'
  from batches b
  join courses c on c.slug = b.course_slug
  join summer_cohorts sc on sc.year = b.year
 where bwc.batch_id = b.id
   and c.type = 'summer'
   and sc.active = true
   and bwc.week_number = sc.current_week;


-- ── Configurable live-class expiry, per batch ─────────────────
-- The column Step 3's computed liveness check will read
-- (started_at + this interval) once summer_class_sessions exists --
-- not read by anything yet. Lives on batches, not a cohort-level
-- setting, consistent with "batch is the operational boundary"
-- (Alfred's call, Summer v2 plan doc 09 §2).

alter table batches
  add column if not exists live_class_max_minutes int not null default 180
    check (live_class_max_minutes between 30 and 360);

comment on column batches.live_class_max_minutes is
  'Hard safety ceiling for a live class session (Summer v2 plan doc '
  '09 §2). Effective live state = started_at + this interval, NEVER '
  'scheduled_end_at, which stays informational only. Not yet read by '
  'anything -- summer_class_sessions (Step 3) is what will use it.';
