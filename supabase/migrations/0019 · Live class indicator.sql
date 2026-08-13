-- ═══════════════════════════════════════════════════════════════
-- 0019 · Live class indicator (cohort-level)
-- ═══════════════════════════════════════════════════════════════
-- A "live now" signal for the summer portal. Cohort-level, not
-- per-week: everyone in summer is in the same class at the same
-- time on one shared Meet link.
--
-- Deliberately an explicit admin toggle rather than a computed
-- "now is within the scheduled window". A computed badge lies when
-- a class runs long, starts late, or is cancelled -- and a kid
-- clicking "Join" into an empty Meet room is worse than no badge.
-- The trade is that admin must remember to flip it; the admin UI
-- nudges from next_class_at to soften that.

alter table summer_cohorts
  add column if not exists is_live      boolean not null default false,
  add column if not exists live_started_at timestamptz;

comment on column summer_cohorts.is_live is
  'Flipped on by admin when class starts, off when it ends. The '
  'portal LIVE badge and the lit Join button key off this, not off '
  'the clock -- an accurate badge matters more than an automatic one.';

comment on column summer_cohorts.live_started_at is
  'When the current live session was started. Lets the portal show '
  '"live for 25 min" and lets a future cron auto-clear a session '
  'someone forgot to end.';


-- The public read policy from 0015 already exposes the active
-- cohort row to anon, so is_live rides along -- no policy change.
-- But get_active_summer_cohort in the app reads specific columns,
-- so the app-side select must add is_live / live_started_at (done
-- in the lib change, not here).


-- ───────────────────────────────────────────────────────────────
-- Admin toggle -- one function, both directions, audited.
-- ───────────────────────────────────────────────────────────────
create or replace function set_summer_live(
  p_cohort_year int,
  p_live        boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Only an admin can start or end a live class.';
  end if;

  update summer_cohorts
     set is_live         = p_live,
         live_started_at = case when p_live then now() else null end
   where year = p_cohort_year;

  perform write_audit(
    case when p_live then 'summer_go_live' else 'summer_end_live' end,
    'summer_cohorts',
    (select id from summer_cohorts where year = p_cohort_year),
    case when p_live then 'Live class started' else 'Live class ended' end,
    null
  );
end;
$$;

comment on function set_summer_live is
  'Admin-only. Starts or ends the cohort live session and writes an '
  'audit row either way.';