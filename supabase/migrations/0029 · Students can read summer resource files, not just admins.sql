-- 0029 · Students can read summer resource files, not just admins
-- ───────────────────────────────────────────────────────────────
-- The ONLY policy on the `summer` bucket was "summer files written
-- by admin" (ALL, requires is_admin()). Since ALL includes SELECT,
-- that meant no summer student — who has no real Supabase Auth
-- session at all (ADR 002, cookie-only) — could ever generate a
-- signed URL for a resource file. Confirmed live: works on an admin
-- browser, fails for every student, on the same file, same code.
--
-- Scoped deliberately to exclude submissions/ — the same bucket also
-- holds students' own submitted homework, and that must stay
-- restricted to admin only, not made bucket-wide public.

CREATE POLICY "summer resources readable by anyone"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'summer'
  AND (storage.foldername(name))[1] <> 'submissions'
);