-- 0030 · Students can upload their own homework submissions
-- ───────────────────────────────────────────────────────────────
-- Third instance of the same gap (see 0029, and doc 07 Bugs 2/3):
-- the `summer` bucket's only write policy is is_admin()-gated, which
-- no summer student can ever satisfy (cookie auth, not Supabase Auth).
-- Reads were fixed in 0029; writes were never reachable until the
-- Server Action body-size limit was raised, so this only surfaced now.
--
-- Scoped to the submissions/ prefix ONLY — students must never be able
-- to write into {year}/week{n}/ where admin lesson materials live.

CREATE POLICY "summer submissions writable by anyone"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'summer'
  AND (storage.foldername(name))[1] = 'submissions'
);