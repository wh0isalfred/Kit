-- ═══════════════════════════════════════════════════════════════
-- 0016 · Summer resources
-- ═══════════════════════════════════════════════════════════════
-- summer_content.resources / .recordings are jsonb arrays on the
-- week row. That works for three links. It does not work for the
-- real usage pattern: several resources dropped most days across a
-- three-week camp, roughly 50–80 items.
--
-- What a jsonb array cannot do:
--   · identify an item, so editing or deleting one means rewriting
--     the whole array by index — and two concurrent edits silently
--     overwrite each other
--   · publish Monday's material while Wednesday's stays hidden
--   · carry a storage path the bucket policy can parse
--   · group by day without an unenforced convention inside the JSON
--
-- One row per resource instead.
--
-- summer_content keeps the week-level fields it is actually good at
-- (class title, note, Meet link, next class time). Its `resources`
-- and `recordings` columns are deprecated by this migration but NOT
-- dropped — dropping them would break get_summer_portal()'s return
-- signature. They are commented as dead below so nobody writes to
-- two places and wonders why the portal disagrees with itself.

create table summer_resources (
  id          uuid primary key default gen_random_uuid(),
  cohort_year int  not null,
  week        int  not null,

  -- Which day within the week. NULL means "whole week" — reading
  -- material, a rubric, something not tied to one session.
  day_number  int,

  title       text not null,
  description text,

  kind text not null default 'link',

  -- Exactly one of these three carries the payload. Which one is
  -- determined by `kind`, and the constraint below enforces that a
  -- resource actually points at something.
  url           text,   -- external: YouTube, Drive, CodePen, docs
  storage_path  text,   -- summer/{cohort_year}/week{n}/{filename}
  code_body     text,   -- inline snippet, rendered in the portal
  code_language text,

  -- Publishing. `published` is the main control — off means the
  -- portal never returns it, so half-prepared material is invisible.
  --
  -- available_from is optional scheduling on top: prepare Sunday
  -- night, publish it, and set the reveal for Monday 9am. NULL means
  -- visible as soon as it is published.
  published      bool not null default false,
  available_from timestamptz,

  sort_order int not null default 0,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint summer_resources_week_sane
    check (week between 1 and 12),

  constraint summer_resources_day_sane
    check (day_number is null or day_number between 1 and 7),

  constraint summer_resources_kind_valid
    check (kind in ('link', 'video', 'file', 'slides', 'code', 'recording', 'homework')),

  -- A resource with no payload is a broken card in a child's portal.
  constraint summer_resources_has_target
    check (url is not null or storage_path is not null or code_body is not null),

  -- Ties resources to a week that actually exists. summer_content
  -- already has a unique (cohort_year, week), so this FK is legal.
  constraint summer_resources_week_fk
    foreign key (cohort_year, week)
    references summer_content (cohort_year, week)
    on delete cascade
);

create index summer_resources_lookup_idx
  on summer_resources (cohort_year, week, day_number, sort_order);

-- The student-facing query: published material for a cohort.
create index summer_resources_published_idx
  on summer_resources (cohort_year, week, sort_order)
  where published;

create trigger summer_resources_updated_at
  before update on summer_resources
  for each row execute function set_updated_at();

comment on table summer_resources is
  'One row per resource. Replaces summer_content.resources / .recordings, '
  'which are jsonb arrays and cannot carry per-item identity, per-item '
  'publish state, or a storage path.';

comment on column summer_content.resources is
  'DEPRECATED — use the summer_resources table. Kept only because '
  'get_summer_portal() returns it. Do not write to this.';

comment on column summer_content.recordings is
  'DEPRECATED — use summer_resources with kind = ''recording''.';


-- ───────────────────────────────────────────────────────────────
-- RLS
-- ───────────────────────────────────────────────────────────────
-- ADR 002: summer students hold no auth session, so no policy here
-- can serve them. Admin writes; students read through the SECURITY
-- DEFINER function below, behind the signed cookie.

alter table summer_resources enable row level security;

create policy summer_resources_admin on summer_resources for all
  using (is_admin()) with check (is_admin());


-- ───────────────────────────────────────────────────────────────
-- get_summer_resources
-- ───────────────────────────────────────────────────────────────
-- Returns every published, available resource for the active cohort
-- up to and including the current week.
--
-- Weeks accumulate deliberately: week 1's material stays reachable
-- in week 3. A camp portal that empties itself each Monday throws
-- away the thing the child most wants to go back to.
--
-- Future weeks are never returned, regardless of publish state —
-- current_week on summer_cohorts is the gate, so admin can prepare
-- ahead without it leaking.

create or replace function get_summer_resources(p_cohort_year int default null)
returns table (
  id            uuid,
  week          int,
  day_number    int,
  title         text,
  description   text,
  kind          text,
  url           text,
  storage_path  text,
  code_body     text,
  code_language text,
  sort_order    int,
  created_at    timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
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
    return;   -- no active cohort: the portal shows its holding state
  end if;

  return query
    select r.id, r.week, r.day_number, r.title, r.description, r.kind,
           r.url, r.storage_path, r.code_body, r.code_language,
           r.sort_order, r.created_at
      from summer_resources r
     where r.cohort_year = v_year
       and r.week <= v_week
       and r.published
       and (r.available_from is null or r.available_from <= now())
     order by r.week desc, r.day_number nulls first, r.sort_order, r.created_at;
end;
$$;

comment on function get_summer_resources is
  'Student-facing resource read. Accumulates weeks up to current_week; '
  'future weeks never returned even when published, so material can be '
  'prepared ahead without leaking.';
