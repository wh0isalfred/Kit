-- ═══════════════════════════════════════════════════════════════
-- 0002 · Courses
-- ═══════════════════════════════════════════════════════════════
-- Doc 1 §4.3: courses are data, not code. The marketing site's
-- programme cards render from this table; flipping `status` here
-- changes the public site with no redeploy.
--
-- This table is referenced by batches, applications, and the
-- KIT ID generator, so it is created first.

create table courses (
  slug        text primary key,
  code        text unique not null,
  title       text not null,
  type        text not null,
  track       text,
  summary     text,
  description text,
  status      text not null default 'coming_soon',

  -- Pricing. Doc 1 §5.1. Nullable because a 'coming_soon' course
  -- legitimately has no price yet.
  price_kobo         bigint,
  price_monthly_kobo bigint,
  instalments        int,

  duration_label text,
  age_min        int,
  age_max        int,
  sort_order     int  not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint courses_type_valid
    check (type in ('term', 'summer')),

  constraint courses_track_valid
    check (track is null or track in ('10-12', '13-15')),

  constraint courses_status_valid
    check (status in ('live', 'coming_soon', 'archived')),

  -- A course you can apply to must have a price. Prevents the
  -- failure mode where a course is flipped live and the apply form
  -- tries to charge NULL kobo.
  constraint courses_live_needs_price
    check (status <> 'live' or price_kobo is not null),

  -- Course code becomes the KIT ID prefix (ADR 004). Two letters,
  -- uppercase, no exceptions — a 3-char code breaks ID parsing.
  constraint courses_code_shape
    check (code ~ '^[A-Z]{2}$'),

  constraint courses_price_positive
    check (price_kobo is null or price_kobo > 0),

  constraint courses_monthly_needs_instalments
    check (price_monthly_kobo is null or instalments is not null),

  constraint courses_age_band_sane
    check (age_min is null or age_max is null or age_min <= age_max)
);

create index courses_status_idx on courses (status, sort_order);
create index courses_type_idx   on courses (type);

create trigger courses_updated_at
  before update on courses
  for each row execute function set_updated_at();


comment on table courses is
  'Source of truth for programme offerings. Marketing site renders from here.';

comment on column courses.code is
  'Two-letter KIT ID prefix (ADR 004). BLOCKED: codes are agreed for WD and AI only — Python and Game Dev are placeholders. See Doc 1 §10.2.';

comment on column courses.price_monthly_kobo is
  'Per-instalment amount. NULL means upfront-only. Doc 1 §5.3 flags that the current ₦6,000 spread is probably too small to change behaviour.';

comment on column courses.track is
  'Age track per Doc 1 §4.1. NULL for summer (one shared curriculum, no tracks).';
