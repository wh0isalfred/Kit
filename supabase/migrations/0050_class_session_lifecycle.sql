-- 0050 · Session lifecycle: start_class_session, end_class_session
-- (Summer v2, Step 4)
-- ───────────────────────────────────────────────────────────────
-- Replaces set_batch_live's role for the NEW summer_class_sessions
-- model. set_batch_live() itself is left completely alone -- not
-- dropped, not altered -- same posture 0022 already took toward
-- set_summer_live ("new function, new name -- deliberately not
-- overloading/replacing, since the OLD one still exists and still
-- works... until the UI fully switches over"). Nothing calls these
-- new functions yet; that's Steps 6/7 (admin/teacher UI), not this
-- migration.
--
-- HONEST SCOPE NOTE: these functions ARE teacher-inclusive from day
-- one (is_admin() OR is_teacher_for_batch()), which is the actual fix
-- for PSF-2 (teachers currently can't go live). But PSF-2 is not
-- FULLY closed from a real product standpoint until Steps 6/7 point
-- the UI at these functions instead of the old admin-only
-- set_batch_live -- until then, the live app is unaffected by this
-- migration, exactly as intended.
--
-- Scope mirrors set_batch_live's own precedent exactly: session
-- DETAILS (title, meet link, teacher, scheduled time) were always a
-- plain table write in the old model (saveBatchSession -- no RPC, no
-- audit trail) -- only the live/not-live TOGGLE was ever an RPC with
-- an audit write. Teachers and admins already have INSERT/UPDATE on
-- summer_class_sessions via 0048's RLS, so no new "save session
-- details" function is needed here -- only the two state-transition
-- functions, matching set_batch_live's own scope precisely.

-- ══════════════════════════════════════════════════════════════
-- Computed liveness -- the actual "started_at + live_class_max_minutes,
-- never scheduled_end_at" check from doc 09 §2. Built now because
-- Step 5 (get_summer_portal) needs this exact logic; kept as its own
-- small, reusable piece rather than duplicated inline later.
-- ══════════════════════════════════════════════════════════════

create or replace function is_class_effectively_live(
  p_started_at timestamptz,
  p_max_minutes int
)
returns boolean
language sql
stable
as $$
  select p_started_at is not null
     and p_started_at > now() - (p_max_minutes || ' minutes')::interval;
$$;

comment on function is_class_effectively_live is
  'The computed safety ceiling from Summer v2 plan doc 09 §2: a class '
  'is only ever considered live if status=''live'' AND it started '
  'within the batch''s own live_class_max_minutes window. Deliberately '
  'ignores scheduled_end_at, which stays informational-only. A '
  'forgotten "End class" click cannot show LIVE hours later even if '
  'no cleanup job has ever run -- this check is the real safety net, '
  'not a scheduled job (doc 09 §3''s own reasoning).';


-- ══════════════════════════════════════════════════════════════
-- start_class_session — scheduled -> live
-- ══════════════════════════════════════════════════════════════

create or replace function start_class_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id    uuid;
  v_week_number int;
  v_status      text;
begin
  select batch_id, week_number, status
    into v_batch_id, v_week_number, v_status
    from summer_class_sessions
   where id = p_session_id;

  if v_batch_id is null then
    raise exception 'Session not found.';
  end if;

  if not is_admin() and not is_teacher_for_batch(v_batch_id) then
    raise exception 'Not authorised for this batch.';
  end if;

  if v_status <> 'scheduled' then
    raise exception 'Only a scheduled session can be started (current status: %).', v_status;
  end if;

  -- The unique index (0048, summer_class_sessions_one_live_per_batch)
  -- would catch this too, but a clear application-level error beats a
  -- raw constraint-violation message reaching a teacher's screen.
  if exists (
    select 1 from summer_class_sessions
     where batch_id = v_batch_id
       and status = 'live'
       and id <> p_session_id
  ) then
    raise exception 'Another session for this batch is already live. End it first.';
  end if;

  update summer_class_sessions
     set status = 'live', started_at = now()
   where id = p_session_id;

  perform write_audit(
    'summer_class_session_start',
    'summer_class_sessions',
    p_session_id,
    format('Live class started for batch %s, week %s', v_batch_id, v_week_number),
    jsonb_build_object('batch_id', v_batch_id, 'week_number', v_week_number)
  );
end;
$$;

grant execute on function start_class_session(uuid) to authenticated;

comment on function start_class_session is
  'Teacher-inclusive replacement for set_batch_live''s "go live" half. '
  'Operates on ONE specific session (by id), not an upsert on '
  '(batch, week) -- this is what makes multiple sessions per week '
  'actually representable. Writes audit_log exactly as set_batch_live '
  'did, same action-naming convention, updated entity name.';


-- ══════════════════════════════════════════════════════════════
-- end_class_session — live -> ended
-- ══════════════════════════════════════════════════════════════

create or replace function end_class_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id    uuid;
  v_week_number int;
  v_status      text;
begin
  select batch_id, week_number, status
    into v_batch_id, v_week_number, v_status
    from summer_class_sessions
   where id = p_session_id;

  if v_batch_id is null then
    raise exception 'Session not found.';
  end if;

  if not is_admin() and not is_teacher_for_batch(v_batch_id) then
    raise exception 'Not authorised for this batch.';
  end if;

  if v_status <> 'live' then
    raise exception 'Only a live session can be ended (current status: %).', v_status;
  end if;

  update summer_class_sessions
     set status = 'ended', ended_at = now()
   where id = p_session_id;

  perform write_audit(
    'summer_class_session_end',
    'summer_class_sessions',
    p_session_id,
    format('Live class ended for batch %s, week %s', v_batch_id, v_week_number),
    jsonb_build_object('batch_id', v_batch_id, 'week_number', v_week_number)
  );
end;
$$;

grant execute on function end_class_session(uuid) to authenticated;

comment on function end_class_session is
  'Teacher-inclusive replacement for set_batch_live''s "end class" '
  'half. ended_at is set to now() -- NEVER derived from '
  'scheduled_end_at, which stays purely informational per doc 09 §2.';
