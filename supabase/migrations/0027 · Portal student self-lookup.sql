-- 0027 · Portal student self-lookup
-- ───────────────────────────────────────────────────────────────
-- summer_students has exactly one RLS policy (summer_students_admin,
-- ALL commands, is_admin() only) — correct for a table holding
-- children's names, ages, and parent contact info, but it silently
-- blocked every summer student from ever reading their OWN row.
-- /smportal/page.tsx was doing a raw .from("summer_students").select()
-- with no Supabase Auth session behind it (ADR 002 — cookie only), so
-- is_admin() was always false and the query always returned nothing,
-- for every student, unconditionally. Same trust model as every
-- other summer-facing RPC: the verified cookie's id is the only
-- thing ever trusted.

create or replace function get_my_summer_student(
  p_summer_student_id uuid
)
returns table (
  name        text,
  cohort_year int,
  batch_id    uuid
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select ss.name, ss.cohort_year, ss.batch_id
      from summer_students ss
     where ss.id = p_summer_student_id;
end;
$$;

comment on function get_my_summer_student is
  'Student-facing self-lookup for /smportal. Deliberately no "active" filter, matching the raw query it replaces exactly — not the moment to change behaviour. Caller must already hold a verified session cookie; this trusts whatever id it is given, same as turn_in_homework and its siblings.';