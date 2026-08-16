-- 0042 · Fix: accepted teachers had no profiles.role, so they were
-- always denied at /teacher/login
-- ───────────────────────────────────────────────────────────────
-- Real bug, found live: a teacher created via createTeacher(),
-- invited, and who correctly set a password via /teacher/set-password
-- still got redirected to /teacher/login?denied=1 on every sign-in
-- attempt afterward — signInWithPassword succeeded (real session,
-- real cookie, confirmed via the session cookie itself), but
-- (protected)/layout.tsx's role check
-- (profile?.role !== 'teacher') failed, because NOTHING ever wrote a
-- profiles row for this teacher at all. createTeacher() (see
-- teachers/actions.ts) only ever inserts into `teachers` and sends
-- the invite — profiles.role was assumed to get set somewhere, but no
-- code anywhere actually did it.
--
-- The right MOMENT to write profiles.role = 'teacher' is the same
-- moment 0041's trigger already links teachers.user_id — that's
-- exactly when a real auth.users id first becomes available to
-- attach a profiles row to (createTeacher time is too early; the
-- auth.users row from generateLink({type:'invite'}) exists then, but
-- there's no reason to grant role access before the person has
-- actually confirmed they're reachable at that email — see 0041's own
-- reasoning for using confirmation, not invite-send, as the trigger
-- point). This migration extends that SAME trigger rather than adding
-- a second one, so there's one place — not two — responsible for
-- "what happens when a teacher accepts."

create or replace function link_teacher_on_invite_accept()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    update teachers
       set user_id = new.id
     where lower(email) = lower(new.email)
       and user_id is null;

    -- THE FIX: also grant profiles.role = 'teacher' at the same
    -- moment, but only if this auth.users id actually corresponds to
    -- a teacher we just linked above — not for every confirmed
    -- signup in the system (12-week students also confirm email and
    -- must NOT be granted teacher access by this trigger).
    insert into profiles (user_id, role)
    select new.id, 'teacher'
    where exists (
      select 1 from teachers t
      where t.user_id = new.id
    )
    on conflict (user_id) do update
      set role = 'teacher'
      -- Never downgrade an existing admin by accident — if this
      -- user_id somehow already has role='admin' (shouldn't happen
      -- given teachers and admins are created through separate flows,
      -- but this is exactly the kind of assumption worth guarding
      -- rather than trusting), leave it alone.
      where profiles.role is distinct from 'admin';
  end if;

  return new;
end;
$$;

comment on function link_teacher_on_invite_accept is
  'Fires on auth.users confirmation. Links teachers.user_id AND grants '
  'profiles.role = ''teacher'' at the same moment (0042 fix — the '
  'original 0041 version only did the first half, which meant every '
  'teacher who ever accepted an invite before this migration was '
  'stuck permanently denied at login despite a fully valid session). '
  'Scoped to only auth.users ids that are actually linked to a '
  'teachers row, so this never grants teacher access to a 12-week '
  'student or any other confirming account. Never overwrites an '
  'existing admin role.';


-- ── Backfill ───────────────────────────────────────────────────
-- Any teacher who ALREADY has user_id set (already went through
-- 0041's half of this) but still has no profiles row, or a profiles
-- row with the wrong role, because the fix above didn't exist yet
-- when they accepted. This is the exact situation the account you're
-- reading this for right now is in.

insert into profiles (user_id, role)
select t.user_id, 'teacher'
from teachers t
where t.user_id is not null
on conflict (user_id) do update
  set role = 'teacher'
  where profiles.role is distinct from 'admin';
