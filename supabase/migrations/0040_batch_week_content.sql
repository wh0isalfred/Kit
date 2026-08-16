-- 0040 · Per-batch weekly content
-- ───────────────────────────────────────────────────────────────
-- Closes the gap confirmed directly against the current admin screen:
-- week title and "note to students" were cohort-wide (one row per
-- week, shared by every batch in the cohort) — two batches in the same
-- week number could not show different material. Instructor, meet
-- link, and the live toggle were ALREADY batch-scoped on
-- summer_batch_sessions (per that screen's own caption) — this
-- migration does not touch that table, and assumes no column overlap
-- with it (title/note_to_students are new concepts, not renames of
-- existing summer_batch_sessions columns). Verify against the actual
-- summer_batch_sessions DDL before relying on that assumption, per
-- this project's own standing rule to check the source, not a doc.
--
-- Needed for 12-week first, summer second (Alfred's call) — built once,
-- shared by both, since the underlying gap is identical in both
-- programmes: batches.course_slug → courses.type tells you which
-- programme a batch belongs to, so this table needs no programme
-- column of its own.

create table batch_week_content (
  id                uuid primary key default gen_random_uuid(),
  batch_id          uuid not null references batches(id) on delete cascade,
  week_number       int  not null,
  title             text,
  note_to_students  text,
  published         boolean not null default false,
  updated_at        timestamptz not null default now(),
  updated_by        uuid references auth.users(id),
  unique (batch_id, week_number)
);

comment on table batch_week_content is
  'Per-batch week title/note, replacing what was cohort-wide content. '
  'The unique(batch_id, week_number) constraint makes two conflicting '
  'rows for the same batch/week structurally impossible, rather than '
  'relying on future code to never insert a duplicate — same shape of '
  'protection the CSS-duplication incident (doc 07 Bug 5) argues for '
  'in a different layer.';
comment on column batch_week_content.published is
  'False = the portal shows "materials coming soon", same fallback '
  'logic that already existed for the cohort-wide version — this '
  'migration changes WHICH table backs that check, not the UX contract.';
comment on column batch_week_content.updated_by is
  'Now genuinely ambiguous who can write here (admin AND, from 0041, '
  'the assigned teacher) — audit trail is cheap now, expensive to '
  'reconstruct later if a "who published this" question ever comes up.';

-- Keep updated_at honest on every write, rather than trusting every
-- call site to set it manually.
create or replace function touch_batch_week_content()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger batch_week_content_touch
  before update on batch_week_content
  for each row
  execute function touch_batch_week_content();


-- ── Row Level Security ────────────────────────────────────────
-- Filled in per ADR 011's checklist: select/insert/update answered
-- explicitly for both admin and teacher. DELETE is deliberately absent
-- for teachers — unpublish via the `published` flag, never delete a
-- week's row. Mirrors the existing students-can-INSERT-not-DELETE
-- pattern already established for summer submissions (doc 02 §VI).

alter table batch_week_content enable row level security;

create policy "admins full access to batch_week_content"
  on batch_week_content for all
  using (is_admin());

create policy "teachers read their own batch's week content"
  on batch_week_content for select
  using (is_teacher_for_batch(batch_id));

create policy "teachers insert their own batch's week content"
  on batch_week_content for insert
  with check (is_teacher_for_batch(batch_id));

create policy "teachers update their own batch's week content"
  on batch_week_content for update
  using (is_teacher_for_batch(batch_id))
  with check (is_teacher_for_batch(batch_id));

-- No DELETE policy for teachers, intentionally — see comment above.


-- ── Student-facing read ───────────────────────────────────────
-- SECURITY DEFINER RPC, never a raw table read from student-facing
-- code — the exact pattern doc 02 §II.A and doc 05 §III insist on,
-- for the exact reason those docs give: a raw .from(table).select()
-- gated by RLS that only grants admin/teacher access would compile
-- fine, run fine, and silently return nothing for every summer
-- student, the same failure shape that caused two of the three
-- documented full outages in this project.
--
-- Deliberately no `active` filter on the student side, matching
-- get_my_summer_student's own documented precedent (doc 02 §V) — the
-- caller already holds a verified session; trust the id it's given.

create or replace function get_my_batch_week_content(
  p_summer_student_id uuid,
  p_week_number        int
)
returns table (
  title             text,
  note_to_students  text,
  published         boolean
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select bwc.title, bwc.note_to_students, bwc.published
  from batch_week_content bwc
  join summer_students ss on ss.batch_id = bwc.batch_id
  where ss.id = p_summer_student_id
    and bwc.week_number = p_week_number
    and bwc.published = true;
$$;

comment on function get_my_batch_week_content is
  'Student-facing read for "Today''s class". Unpublished or nonexistent '
  '= zero rows, which the portal already treats as "materials coming '
  'soon" — that fallback logic does not change, only which table backs '
  'it (0040). Caller must already hold a verified session cookie, same '
  'trust model as every other summer RPC (doc 02 §V).';

revoke all on function get_my_batch_week_content(uuid, int) from public;
grant execute on function get_my_batch_week_content(uuid, int) to anon, authenticated;
