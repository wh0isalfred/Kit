-- ═══════════════════════════════════════════════════════════════
-- SEED · Course catalogue and active cohort
-- ═══════════════════════════════════════════════════════════════
-- Run AFTER all migrations. Idempotent — safe to re-run.
--
-- ┌───────────────────────────────────────────────────────────┐
-- │ ⚠ THIS FILE CONTAINS TWO UNRESOLVED DECISIONS.            │
-- │   Both are blockers, both are Ade's call, and both are    │
-- │   marked ⚠ BLOCKED below. Do not treat these values as    │
-- │   agreed just because they are written down here.         │
-- └───────────────────────────────────────────────────────────┘


-- ───────────────────────────────────────────────────────────────
-- Courses
-- ───────────────────────────────────────────────────────────────
--
-- ⚠ BLOCKED #1 — Doc 1 §10.2 · WHICH COURSES LAUNCH
--
--   The blueprint and Alfred's plan say launch is TWO courses:
--   Web Design and AI. The built site and the complete docs list
--   FOUR: Web Dev, Python, 3D Game Dev, AI Literacy. The apply
--   form as built offers Web Dev, Python, Game Dev and Summer —
--   and omits AI entirely, which the blueprint treats as a core
--   pillar. A parent who wants AI cannot select it today.
--
--   Seeded below: all four as 'live' matching the built site, plus
--   AI which the form is missing. If the real launch is Web Dev +
--   AI only, flip Python and Game Dev to 'coming_soon' — one
--   UPDATE, and the marketing site changes with no redeploy.
--
-- ⚠ BLOCKED #2 — Doc 2 §7.1 · KIT ID COURSE CODES
--
--   ADR 004 defines codes for WD (Web Design) and AI only. PY and
--   GD below are MY PLACEHOLDERS, not agreed values. They are
--   baked into every KIT ID a student in those tracks will ever
--   hold, printed on their certificate, and used to look them up
--   for three months. Changing one after the first student is
--   enrolled means reissuing IDs.
--
--   Confirm PY and GD before approving a single application in
--   those courses.
--
-- ⚠ ALSO — Doc 1 §10.1 · THE AGE BAND
--
--   age_max is set to 15 on the term courses, NOT the 16 the site
--   advertises, because the curriculum tracks are 10–12 and 13–15
--   and a 16-year-old has nowhere to be placed. The application
--   trigger enforces whatever is set here, so as written a
--   16-year-old will be REJECTED at insert with a clear message.
--
--   That is the honest state of things rather than a silent
--   acceptance into a track that does not exist. Resolve by either
--   extending the upper track to 13–16 (then set age_max = 16) or
--   changing the advertised range on the site. Check the ages of
--   the existing ~50 Google Forms sign-ups before deciding.

insert into courses (
  slug, code, title, type, track, status, sort_order,
  price_kobo, price_monthly_kobo, instalments,
  duration_label, age_min, age_max, summary
) values

  ('web-development', 'WD', 'Web Development', 'term', '13-15', 'live', 1,
   7500000, 2700000, 3,
   '12-Week Academy', 10, 15,
   'Structure, build and launch real websites — from first HTML tag to a live project.'),

  -- ⚠ Missing from the application form today. See BLOCKED #1.
  ('ai-literacy', 'AI', 'AI Literacy', 'term', '13-15', 'live', 2,
   7500000, 2700000, 3,
   '12-Week Academy', 10, 15,
   'Prompt engineering, AI study systems, and using AI responsibly and well.'),

  -- ⚠ Code 'PY' is a placeholder. See BLOCKED #2.
  ('python', 'PY', 'Python Programming', 'term', '13-15', 'live', 3,
   7500000, 2700000, 3,
   '12-Week Academy', 12, 15,
   'Real programming from first principles — logic, data, and building things that run.'),

  -- ⚠ Code 'GD' is a placeholder. See BLOCKED #2.
  ('game-development', 'GD', '3D Game Development', 'term', '13-15', 'live', 4,
   7500000, 2700000, 3,
   '12-Week Academy', 12, 15,
   'Design and build a playable 3D game, from mechanics to a finished level.'),

  ('summer', 'SM', 'Summer Tech Camp', 'summer', null, 'live', 5,
   1500000, null, null,
   '3-Week Camp', 10, 16,
   'Web development, AI literacy and graphic design in one build — with a ₦30,000 prize for the winning team.'),

  -- Advertised as "more on the way" pills. Rows with a status flag,
  -- which is the whole reason the site can advertise them safely.
  ('graphic-design', 'GX', 'Graphic Design', 'term', null, 'coming_soon', 6,
   null, null, null, '12-Week Academy', 10, 15, null),

  ('robotics', 'RB', 'Robotics & IoT', 'term', null, 'coming_soon', 7,
   null, null, null, '12-Week Academy', 12, 15, null),

  ('app-building', 'AB', 'App Building', 'term', null, 'coming_soon', 8,
   null, null, null, '12-Week Academy', 12, 15, null)

on conflict (slug) do update set
  title              = excluded.title,
  summary            = excluded.summary,
  price_kobo         = excluded.price_kobo,
  price_monthly_kobo = excluded.price_monthly_kobo,
  instalments        = excluded.instalments,
  age_min            = excluded.age_min,
  age_max            = excluded.age_max,
  sort_order         = excluded.sort_order;


-- ───────────────────────────────────────────────────────────────
-- Summer cohort
-- ───────────────────────────────────────────────────────────────
-- ⚠ Doc 1 §11.6: no real cohort dates have been decided. The
--   countdown on the marketing site is hardcoded in
--   SummerSection.tsx and this row is a placeholder to match.

insert into summer_cohorts (year, label, current_week, active, prize_kobo)
values (2026, 'Summer 2026', 1, true, 3000000)
on conflict (year) do nothing;


-- ───────────────────────────────────────────────────────────────
-- Pricing sanity check
-- ───────────────────────────────────────────────────────────────
-- Doc 1 §5.3 flags that the discount spread is probably too small
-- to change anyone's behaviour. The numbers, restated:
--
--   upfront          ₦75,000
--   monthly ×3       ₦27,000 → ₦81,000 total
--   saving            ₦6,000  =  7.4%
--
-- People anchor on the smaller number. A 7.4% saving is very
-- unlikely to move a parent from ₦27,000-today to ₦75,000-today,
-- which means most will choose monthly — more manual chasing, and
-- more revenue at risk from anyone who stops after month one.
--
-- If pushing upfront is the actual goal, either drop upfront to
-- ₦70,000 (13.6%) or raise monthly to ₦30,000 (16.7%). Both are a
-- single UPDATE here now that pricing is data:
--
--   update courses set price_monthly_kobo = 3000000
--    where type = 'term' and price_monthly_kobo is not null;
--
-- Not changed, because it has not been decided.


-- ───────────────────────────────────────────────────────────────
-- Verify
-- ───────────────────────────────────────────────────────────────

do $$
declare
  v_live int;
  v_no_price int;
begin
  select count(*) into v_live from courses where status = 'live';
  select count(*) into v_no_price
    from courses where status = 'live' and price_kobo is null;

  raise notice 'Seeded % live courses, % missing a price.', v_live, v_no_price;
  raise notice 'BLOCKED: confirm KIT ID codes for Python (PY) and Game Dev (GD) before approving applications — Doc 1 §10.2.';
  raise notice 'BLOCKED: age_max is 15 on term courses, not the 16 the site advertises — Doc 1 §10.1.';
end $$;
