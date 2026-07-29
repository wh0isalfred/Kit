-- ============================================================
-- 0025 — batch-scoped supplementary resources.
--
-- Adds an OPTIONAL batch_id to summer_resources:
--
--   batch_id IS NULL  -> shared curriculum, every batch sees it
--   batch_id = <uuid> -> supplement, only that batch sees it
--
-- Nullable on purpose. The core Week 2 lesson stays in exactly one
-- row, so fixing a typo fixes it for everyone — while a teacher who
-- went off on a tangent can still drop an extra worksheet for their
-- batch alone. Hard per-batch duplication was considered and
-- rejected: three copies of the same worksheet drift, and nobody
-- notices until a parent emails.
--
-- get_summer_resources IS PATCHED IN THIS SAME FILE, deliberately.
-- That function currently filters on cohort_year alone. The moment
-- the column exists without the predicate, every batch-scoped
-- resource is visible to every student in the cohort — a silent
-- data leak, not a crash. The column and the filter must land in
-- one transaction.
--
-- Run db-tests/smoke_test.sql after.
-- ============================================================

-- ── 1. The column ─────────────────────────────────────────────
ALTER TABLE summer_resources
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES batches(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_summer_resources_batch
  ON summer_resources(batch_id);

-- ON DELETE CASCADE, not SET NULL: if a batch is deleted, its
-- supplements should die with it. Silently promoting them to shared
-- curriculum — which SET NULL would do — is the wrong default and
-- would be very hard to spot.

-- Every existing row keeps batch_id = NULL, i.e. shared. That is
-- already the correct state for all current content. No backfill.

-- ============================================================
-- 2. get_summer_resources — now batch-aware.
--
-- CREATE OR REPLACE is safe here: the return shape is unchanged,
-- only the WHERE clause moves. Grants persist, no DROP needed.
--
-- Batch resolution mirrors get_summer_portal exactly — look the
-- batch up from the student id rather than taking it as a param,
-- so no call site has to change.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_summer_resources(
  p_cohort_year integer DEFAULT NULL::integer,
  p_summer_student_id uuid DEFAULT NULL::uuid
)
 RETURNS TABLE(
   id uuid, week integer, day_number integer, title text, description text, kind text,
   url text, storage_path text, code_body text, code_language text,
   sort_order integer, created_at timestamp with time zone,
   submission_type text,
   submitted_at timestamp with time zone,
   submission_url text,
   submission_storage_path text
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_year int;
  v_week int;
  v_batch_id uuid;
begin
  select sc.year, sc.current_week into v_year, v_week
    from summer_cohorts sc
   where sc.active
     and (p_cohort_year is null or sc.year = p_cohort_year)
   limit 1;

  if v_year is null then
    return;
  end if;

  if p_summer_student_id is not null then
    select s.batch_id into v_batch_id
      from summer_students s
     where s.id = p_summer_student_id;
  end if;

  return query
    select r.id, r.week, r.day_number, r.title, r.description, r.kind,
           r.url, r.storage_path, r.code_body, r.code_language,
           r.sort_order, r.created_at,
           r.submission_type,
           sub.submitted_at, sub.url, sub.storage_path
      from summer_resources r
      left join summer_submissions sub
        on sub.resource_id = r.id
       and sub.summer_student_id = p_summer_student_id
     where r.cohort_year = v_year
       -- THE LEAK FIX. Shared rows always show. Batch rows only
       -- show to that batch. A student with no batch assigned
       -- (v_batch_id null) sees shared content only, because
       -- `r.batch_id = null` evaluates to NULL, not true — which is
       -- the safe direction to fail.
       and (r.batch_id is null or r.batch_id = v_batch_id)
       and r.week <= v_week
       and r.published
       and (r.available_from is null or r.available_from <= now())
     order by r.week desc, r.day_number nulls first, r.sort_order, r.created_at;
end;
$function$;

GRANT EXECUTE ON FUNCTION public.get_summer_resources(integer, uuid) TO anon, authenticated;

-- ============================================================
-- NOT CHANGED, and why:
--
-- get_summer_portal reads summer_content, not summer_resources —
-- the cohort-wide class_title / homework / announcements blob. It
-- has no exposure to batch_id and is left alone.
--
-- get_homework_roster already takes p_batch_id explicitly, so it
-- needs no change either. It filters students by batch, and an
-- assignment scoped to Batch 1 will simply return Batch 2's roster
-- as all-'assigned' if someone asks for the wrong pairing. The UI
-- should not offer that pairing; the DB doesn't need to forbid it.
--
-- The admin resource upload UI now needs a batch selector
-- (Shared / Batch 1 / Batch 2 ...). Until that ships, every new
-- resource is created with batch_id NULL — i.e. shared — which is
-- the correct default and matches today's behaviour exactly.
-- ============================================================
