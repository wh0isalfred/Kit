-- 0037 · Track the Student ID email per summer student
-- ───────────────────────────────────────────────────────────────
-- Mirrors students.login_email_sent_at. The Summer ID is a student's
-- ONLY credential, so "did this family actually receive it?" needs to
-- be answerable without digging through Resend's dashboard.
--
-- NAMING NOTE: this records when the email was successfully handed to
-- Resend (scheduled), not when it landed in an inbox — we don't get
-- delivery confirmation back. Treat it as "we did our part", the same
-- way login_email_sent_at does.

alter table summer_students
  add column if not exists id_email_sent_at timestamptz;

comment on column summer_students.id_email_sent_at is
  'When the Student ID / portal email was successfully scheduled with Resend. NULL = never sent; that student cannot log in.';