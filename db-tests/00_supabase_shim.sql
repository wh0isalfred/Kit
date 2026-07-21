-- Local-only shim reproducing the Supabase-provided pieces the
-- migrations depend on. NOT part of the migration set — this file
-- exists purely so the real migrations can be syntax- and
-- semantics-checked against a plain Postgres before they touch a
-- live project.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role;
  end if;
end $$;

create schema if not exists auth;
create schema if not exists storage;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text
);

-- Overridable stand-in for the JWT claim.
create table auth._current (uid uuid);
insert into auth._current values (null);

create or replace function auth.uid() returns uuid
language sql stable as $$ select uid from auth._current limit 1 $$;

create table storage.buckets (
  id text primary key,
  name text not null,
  public bool not null default false
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text not null,
  owner uuid
);

alter table storage.objects enable row level security;

create or replace function storage.foldername(name text)
returns text[]
language sql immutable as $$
  select string_to_array(regexp_replace(name, '/[^/]*$', ''), '/');
$$;
