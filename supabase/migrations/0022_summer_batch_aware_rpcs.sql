-- ============================================================
-- Phase 2 (continued): batch-aware reads and writes.
--
-- Run summer-batches-phase2-new-rpcs.sql FIRST if you haven't
-- already (check_in_attendance / submit_homework).
-- ============================================================

-- ── enrol_summer_student — now requires a batch ────────────────
-- Only ADDS a trailing parameter with a default, so this is a safe
-- in-place CREATE OR REPLACE — no signature-shape change, existing
-- grants persist automatically.
--
-- IMPORTANT DEPLOYMENT NOTE: after this runs, any existing call to
-- enrolSummerStudent() that doesn't pass a batch will start FAILING
-- with "A batch is required..." — that's intentional (better a loud
-- error than a silently un-batched student), but it means the admin
-- UI's batch picker (Phase 3) needs to ship before/alongside this,
-- or the Enrol button breaks in production until it does.
CREATE OR REPLACE FUNCTION public.enrol_summer_student(
  p_application_id uuid DEFAULT NULL::uuid,
  p_name text DEFAULT NULL::text,
  p_cohort_year integer DEFAULT NULL::integer,
  p_parent_email text DEFAULT NULL::text,
  p_parent_phone text DEFAULT NULL::text,
  p_batch_id uuid DEFAULT NULL::uuid
)
 RETURNS TABLE(summer_student_id uuid, summer_id text, name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  a       record;
  v_year  int;
  v_name  text;
  v_email citext;
  v_phone text;
  v_sid   text;
  v_id    uuid;
begin
  if p_batch_id is null then
    raise exception 'A batch is required to enrol a summer student.';
  end if;

  -- Defensive server-side batch check, mirroring the same
  -- capacity/eligibility logic the 12-week frontend already applies
  -- when filtering which batches show in its picker — "trust but
  -- verify at the DB", not just at the Server Action.
  if not exists (
    select 1 from batches b
     where b.id = p_batch_id
       and b.status not in ('completed', 'cancelled')
  ) then
    raise exception 'That batch is not open for enrolment.';
  end if;

  if (
    select count(*) from summer_students s where s.batch_id = p_batch_id
  ) >= (
    select capacity from batches where id = p_batch_id
  ) then
    raise exception 'That batch is full.';
  end if;

  -- Two entry paths: from a paid application, or typed in by admin
  -- (CSV roster import, walk-in). The record `a` only exists on the
  -- first path, so every read of it is guarded.
  if p_application_id is not null then
    select * into a from applications where id = p_application_id;
    if not found then
      raise exception 'Application % not found.', p_application_id;
    end if;
    if a.payment_status <> 'paid' then
      raise exception 'Application % is not paid.', p_application_id;
    end if;
    if a.status = 'approved' then
      raise exception 'Application % is already enrolled.', p_application_id
        using errcode = 'unique_violation';
    end if;
    v_name  := a.student_name;
    v_email := coalesce(p_parent_email, a.parent_email);
    v_phone := coalesce(p_parent_phone, a.parent_phone);
  else
    v_name  := p_name;
    v_email := p_parent_email;
    v_phone := p_parent_phone;
  end if;

  if v_name is null then
    raise exception 'A student name is required.';
  end if;

  v_year := coalesce(
    p_cohort_year,
    (select year from summer_cohorts where active limit 1),
    extract(year from now())::int
  );

  v_sid := generate_summer_id(v_year);

  insert into summer_students
    (summer_id, name, cohort_year, parent_email, parent_phone, application_id, batch_id)
  values
    (v_sid, v_name, v_year, v_email, v_phone, p_application_id, p_batch_id)
  returning id into v_id;

  if p_application_id is not null then
    update applications
       set status            = 'approved',
           summer_student_id = v_id,
           reviewed_at       = now(),
           reviewed_by       = auth.uid()
     where id = p_application_id and status = 'pending';
  end if;

  perform write_audit(
    'enrol_summer', 'summer_students', v_id,
    format('Enrolled %s as %s (batch %s)', v_name, v_sid, p_batch_id), null
  );

  return query select v_id, v_sid, v_name;
end;
$function$;

-- ── get_summer_portal — batch-scoped instructor/meet_link/is_live ──
-- Return shape changes (new output columns), so this has to be
-- dropped and recreated, not CREATE OR REPLACE'd.
DROP FUNCTION IF EXISTS public.get_summer_portal(integer);

CREATE FUNCTION public.get_summer_portal(
  p_cohort_year integer DEFAULT NULL::integer,
  p_summer_student_id uuid DEFAULT NULL::uuid
)
 RETURNS TABLE(
   cohort_year integer, week integer, published boolean,
   class_title text, class_note text,
   instructor text, meet_link text, next_class_at timestamp with time zone,
   is_live boolean,
   homework jsonb, announcements jsonb, schedule jsonb, recordings jsonb, resources jsonb,
   updated_at timestamp with time zone
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
    return;   -- no active cohort: the portal shows its holding state
  end if;

  if p_summer_student_id is not null then
    select s.batch_id into v_batch_id
      from summer_students s
     where s.id = p_summer_student_id;
  end if;

  -- v_batch_id may be null (student not yet batch-assigned, or none
  -- passed) — the left join then yields null instructor/meet_link
  -- and false is_live, same "say nothing rather than guess" posture
  -- as everywhere else in this app, not an error.
  return query
    select c.cohort_year, c.week, c.published,
           c.class_title, c.class_note,
           bs.instructor, bs.meet_link, bs.next_class_at,
           coalesce(bs.is_live, false),
           c.homework, c.announcements, c.schedule, c.recordings, c.resources,
           c.updated_at
      from summer_content c
      left join summer_batch_sessions bs
        on bs.batch_id = v_batch_id and bs.week = c.week
     where c.cohort_year = v_year
       and c.week = v_week
       and c.published;
end;
$function$;

-- Dropping loses existing grants — reapply. Matches the same
-- anon/authenticated assumption flagged in the previous file; verify
-- against your real grants rather than trusting this blind.
GRANT EXECUTE ON FUNCTION public.get_summer_portal(integer, uuid) TO anon, authenticated;

-- ── get_summer_resources — adds this student's submission status ──
DROP FUNCTION IF EXISTS public.get_summer_resources(integer);

CREATE FUNCTION public.get_summer_resources(
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
begin
  select sc.year, sc.current_week into v_year, v_week
    from summer_cohorts sc
   where sc.active
     and (p_cohort_year is null or sc.year = p_cohort_year)
   limit 1;

  if v_year is null then
    return;
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
       and r.week <= v_week
       and r.published
       and (r.available_from is null or r.available_from <= now())
     order by r.week desc, r.day_number nulls first, r.sort_order, r.created_at;
end;
$function$;

GRANT EXECUTE ON FUNCTION public.get_summer_resources(integer, uuid) TO anon, authenticated;

-- ── set_batch_live — replaces set_summer_live ──────────────────
-- New function, new name — deliberately not overloading/replacing
-- set_summer_live, since the OLD one still exists and still works
-- against summer_cohorts.is_live until the admin UI (Phase 3) fully
-- switches over. Once that's confirmed working, set_summer_live and
-- summer_cohorts.is_live/live_started_at should be dropped in a
-- follow-up migration — not yet.
CREATE OR REPLACE FUNCTION public.set_batch_live(
  p_batch_id uuid,
  p_week integer,
  p_live boolean
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_session_id uuid;
begin
  if not is_admin() then
    raise exception 'Only an admin can start or end a live class.';
  end if;

  insert into summer_batch_sessions (batch_id, week, is_live, live_started_at)
  values (p_batch_id, p_week, p_live, case when p_live then now() else null end)
  on conflict (batch_id, week)
  do update set
    is_live = excluded.is_live,
    live_started_at = excluded.live_started_at
  returning id into v_session_id;

  perform write_audit(
    case when p_live then 'summer_batch_go_live' else 'summer_batch_end_live' end,
    'summer_batch_sessions',
    v_session_id,
    format('%s for batch %s, week %s',
           case when p_live then 'Live class started' else 'Live class ended' end,
           p_batch_id, p_week),
    jsonb_build_object('batch_id', p_batch_id, 'week', p_week)
  );
end;
$function$;

GRANT EXECUTE ON FUNCTION public.set_batch_live(uuid, integer, boolean) TO authenticated;
