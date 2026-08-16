-- 0041 · Link teachers.user_id on invite acceptance
-- ───────────────────────────────────────────────────────────────
-- teachers.user_id was designed (0038) to be NULL until a teacher
-- accepts their invite, with "has a user_id" standing in for
-- "accepted." That was never actually wired up — createTeacher()
-- calls generateLink({ type: 'invite' }), which creates the
-- auth.users row IMMEDIATELY, before the person has clicked
-- anything. Nothing then linked teachers.user_id to it, so the
-- column stays NULL forever regardless of whether the invite was
-- ever accepted — not the bug it looks like, just an unfinished half
-- of the feature.
--
-- Deliberately NOT a second boolean column (e.g. invite_accepted)
-- alongside user_id — that would just create two places for the same
-- fact to live and risk disagreeing, the exact thing 0039 already
-- rejected a redundant programme column for and 0040 already rejected
-- a redundant updated_by derivation for. user_id IS NOT NULL already
-- means "accepted" if — and only if — it's set at the right moment,
-- which is what this migration actually fixes.
--
-- "Accepted" means auth.users.email_confirmed_at going from NULL to
-- NOT NULL, which is Supabase Auth's own signal that the invite flow
-- completed (password set via the invite link, or any other
-- confirmation path) — not "the auth.users row exists" (true from the
-- moment of invite, tells you nothing) and not something we can
-- reliably learn from the browser calling back to our own code, since
-- Supabase Auth's UI/flow runs outside anything a Server Action here
-- controls. A trigger on auth.users is the only point that's
-- guaranteed to fire exactly once, regardless of which path the
-- teacher took to confirm.

create or replace function link_teacher_on_invite_accept()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Only act on the null -> not-null transition, not every row
  -- update auth.users receives (last sign-in time, etc. change far
  -- more often than this and would fire this needlessly).
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    update teachers
       set user_id = new.id
     where lower(email) = lower(new.email)
       and user_id is null;
  end if;

  return new;
end;
$$;

comment on function link_teacher_on_invite_accept is
  'Fires on auth.users confirmation. Links teachers.user_id the '
  'moment a teacher actually accepts their invite (sets a password), '
  'not at invite-send time. "and user_id is null" makes this safe to '
  're-fire — a second confirmation event for an already-linked row is '
  'a no-op, not an overwrite.';

-- auth.users is a Supabase-managed table; triggers on it are
-- supported and this is the standard place to hook post-confirmation
-- logic (the same category of hook Supabase's own docs describe for
-- "sync auth.users to a public profile table").
drop trigger if exists on_teacher_invite_accepted on auth.users;

create trigger on_teacher_invite_accepted
  after update on auth.users
  for each row
  execute function link_teacher_on_invite_accept();


-- ── Backfill ───────────────────────────────────────────────────
-- Any teacher invited before this migration who has ALREADY accepted
-- (auth.users row exists, email confirmed) but was never linked,
-- because nothing was listening for the event until now. Matches on
-- email the same way the trigger does. Safe to run more than once —
-- only touches rows where user_id is still null.

update teachers t
   set user_id = u.id
  from auth.users u
 where lower(t.email) = lower(u.email)
   and u.email_confirmed_at is not null
   and t.user_id is null;
