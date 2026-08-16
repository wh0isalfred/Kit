-- 0043 · Teacher access to summer_batch_sessions
-- ───────────────────────────────────────────────────────────────
-- summer_batch_sessions (instructor, meet link, live toggle,
-- next_class_at) has existed since well before teachers were a real
-- role — its RLS was written for admin only. Building the teacher
-- Class tab surfaced the gap directly: is_teacher_for_batch() (0039)
-- exists and batch_week_content (0040) already follows this exact
-- pattern, but nobody had extended it to this table yet. Per doc 02
-- §II.A's own standing rule — an admin-only policy grants nothing to
-- any other role, silently, no error — this needed its own explicit
-- policy before the teacher Class tab could read or write anything
-- here, not an assumption that it already worked.
--
-- Same shape as 0040: select/insert/update for an active, assigned
-- teacher, no delete (a session row is corrected via update, never
-- removed — mirrors "unpublish via the flag, never delete the row").

alter table summer_batch_sessions enable row level security;

-- If an admin-only policy already exists on this table (likely,
-- given it predates teachers entirely), this does not replace it —
-- it adds beside it. RLS policies are additive; verify with
-- pg_policies after this migration that an admin ALL policy is still
-- present, per this project's own standing verification habit.

create policy "teachers read their own batch's sessions"
  on summer_batch_sessions for select
  using (is_teacher_for_batch(batch_id));

create policy "teachers insert their own batch's sessions"
  on summer_batch_sessions for insert
  with check (is_teacher_for_batch(batch_id));

create policy "teachers update their own batch's sessions"
  on summer_batch_sessions for update
  using (is_teacher_for_batch(batch_id))
  with check (is_teacher_for_batch(batch_id));

-- No delete policy for teachers, intentionally — same reasoning as
-- batch_week_content (0040).
