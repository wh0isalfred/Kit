-- ═══════════════════════════════════════════════════════════════
-- 0012 · Storage buckets
-- ═══════════════════════════════════════════════════════════════
-- Doc 2 §1: Supabase Storage holds resources, certificates, and
-- recordings.
--
-- The bucket layout is not cosmetic — it is what makes the storage
-- policies expressible. Every private path starts with the batch or
-- student UUID so a policy can parse ownership out of the path
-- itself:
--
--   batch-resources/{batch_id}/{filename}
--   submissions/{student_id}/{assignment_id}/{filename}
--   certificates/{student_id}/{serial}.pdf
--   summer/{cohort_year}/{filename}
--   public/{filename}
--
-- A flat bucket would force every download through a signed-URL
-- endpoint in application code, which is the same "trust the app
-- layer" mistake ADR 003 rejects for tables.

insert into storage.buckets (id, name, public)
values
  ('public-assets',   'public-assets',   true),
  ('batch-resources', 'batch-resources', false),
  ('submissions',     'submissions',     false),
  ('certificates',    'certificates',    false),
  ('summer',          'summer',          false)
on conflict (id) do nothing;


-- ───────────────────────────────────────────────────────────────
-- public-assets — marketing images, open
-- ───────────────────────────────────────────────────────────────

create policy "public assets readable by anyone"
  on storage.objects for select
  using (bucket_id = 'public-assets');

create policy "public assets writable by admin"
  on storage.objects for all
  using (bucket_id = 'public-assets' and is_admin())
  with check (bucket_id = 'public-assets' and is_admin());


-- ───────────────────────────────────────────────────────────────
-- batch-resources
-- ───────────────────────────────────────────────────────────────
-- Mirrors the resources table policy, including the lock. A student
-- who guesses a filename still cannot download a locked resource,
-- because the lock is checked here too rather than only on the row.

create policy "batch resources readable by batch members"
  on storage.objects for select
  using (
    bucket_id = 'batch-resources'
    and (
      is_admin()
      or (
        app_role() = 'teacher'
        and in_my_batch((storage.foldername(name))[1]::uuid)
      )
      or (
        app_role() = 'student'
        and in_my_batch((storage.foldername(name))[1]::uuid)
        and exists (
          select 1 from resources r
           where r.storage_path = storage.objects.name
             and r.locked = false
        )
      )
    )
  );

create policy "batch resources writable by batch teacher"
  on storage.objects for all
  using (
    bucket_id = 'batch-resources'
    and (is_admin()
         or (app_role() = 'teacher'
             and in_my_batch((storage.foldername(name))[1]::uuid)))
  )
  with check (
    bucket_id = 'batch-resources'
    and (is_admin()
         or (app_role() = 'teacher'
             and in_my_batch((storage.foldername(name))[1]::uuid)))
  );


-- ───────────────────────────────────────────────────────────────
-- submissions
-- ───────────────────────────────────────────────────────────────
-- A student uploads and reads only their own work. Teachers read
-- their batch's. Deliberately tighter than batch scope on the read
-- side: classmates see each other's points, never each other's work.

create policy "students manage their own submissions"
  on storage.objects for all
  using (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1]::uuid = app_student_id()
  )
  with check (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1]::uuid = app_student_id()
  );

create policy "teachers read their batch's submissions"
  on storage.objects for select
  using (
    bucket_id = 'submissions'
    and (
      is_admin()
      or (app_role() = 'teacher' and exists (
            select 1 from students s
             where s.id = (storage.foldername(name))[1]::uuid
               and in_my_batch(s.batch_id)))
    )
  );


-- ───────────────────────────────────────────────────────────────
-- certificates
-- ───────────────────────────────────────────────────────────────

create policy "students read their own certificates"
  on storage.objects for select
  using (
    bucket_id = 'certificates'
    and (is_admin()
         or (storage.foldername(name))[1]::uuid = app_student_id())
  );

create policy "certificates written by admin"
  on storage.objects for all
  using (bucket_id = 'certificates' and is_admin())
  with check (bucket_id = 'certificates' and is_admin());


-- ───────────────────────────────────────────────────────────────
-- summer
-- ───────────────────────────────────────────────────────────────
-- Summer students have no auth session (ADR 002), so no policy here
-- can serve them. Files are delivered as short-lived signed URLs
-- minted by the Server Action after the cookie check — the same
-- pattern as get_summer_portal().
--
-- Note the tradeoff, stated honestly: a signed URL, once minted, is
-- forwardable. For slides and homework PDFs that is acceptable. Do
-- not put anything genuinely sensitive in this bucket.

create policy "summer files written by admin"
  on storage.objects for all
  using (bucket_id = 'summer' and is_admin())
  with check (bucket_id = 'summer' and is_admin());
