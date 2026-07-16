# Database Schema

Postgres, via Supabase. RLS enabled on every table that holds per-student or per-batch data.

```sql
-- ── Admissions ──────────────────────────────────────
applications (
  id, parent_name, parent_email, student_name, age,
  course_choice, payment_ref, status, created_at
)

-- ── 12-week program ─────────────────────────────────
profiles (
  user_id references auth.users, role text, batch_id uuid
)

students (
  id, kit_id text unique,      -- e.g. WD2601-0042, see ADR 004
  name, email, batch_id, kit_points int default 0, enrolled_at
)

teachers (
  id, name, email, batch_id
)

batches (
  id, course, cohort_label, capacity int default 15, teacher_id
)

courses (
  id, title, type text,        -- 'summer' | 'term'
  track text,                  -- '10-12' | '13-15' | null
  description, status text     -- 'live' | 'coming_soon'
)

resources (
  id, batch_id, title, url, locked bool default true, unlocked_at
)

assignments (
  id, batch_id, title, description, due_at
)

submissions (
  id, assignment_id, student_id, content, grade, graded_at
)

kit_points_ledger (
  id, student_id, points int, reason text, created_at
)

announcements (
  id, batch_id, message, created_at
)

-- ── Summer program ──────────────────────────────────
summer_students (
  id, summer_id text unique,   -- e.g. SM25023, see ADR 005
  name, cohort_year int
)

summer_content (
  id, cohort_year int, week int,
  meet_link, homework, announcements,
  schedule, recordings, resources jsonb
)
```

`summer_content` is effectively a singleton per cohort year — admin writes, every summer student reads the same row.
