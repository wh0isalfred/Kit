-- ═══════════════════════════════════════════════════════════════
-- 0004 · Applications and payments
-- ═══════════════════════════════════════════════════════════════
-- Doc 1 §10.4 / Doc 2 §4.1: the old applications table could not
-- store what the application form actually collects. Eight fields
-- had nowhere to go, there was no amount column, and `age` was
-- stored instead of date of birth.
--
-- This is the corrected version.


-- ───────────────────────────────────────────────────────────────
-- applications
-- ───────────────────────────────────────────────────────────────

create table applications (
  id uuid primary key default gen_random_uuid(),

  -- ── student ────────────────────────────────────────────────
  student_name   text not null,
  student_dob    date not null,
  student_gender text,
  student_school text,

  -- Frozen at submission. Age changes; what we assessed does not.
  age_at_application int,

  -- ── parent / guardian ──────────────────────────────────────
  parent_name         text not null,
  parent_email        citext not null,
  parent_phone        text not null,
  parent_relationship text,

  -- ── programme ──────────────────────────────────────────────
  course_slug text not null references courses(slug) on update cascade,
  plan        text,

  -- ── money ──────────────────────────────────────────────────
  -- Two columns, deliberately. amount_due_kobo is what Paystack was
  -- asked to charge NOW (₦27,000 on a monthly plan). amount_total_kobo
  -- is what the whole programme costs (₦81,000). With only one, a
  -- monthly first payment is indistinguishable from a partial upfront
  -- payment and reconciliation becomes guesswork.
  amount_due_kobo   bigint not null,
  amount_total_kobo bigint not null,
  currency          text not null default 'NGN',

  -- ── payment state ──────────────────────────────────────────
  payment_ref    text unique,
  payment_status text not null default 'pending_payment',
  paid_at        timestamptz,

  -- ── admissions state ───────────────────────────────────────
  -- Separate from payment_status on purpose. They answer different
  -- questions: "has money arrived" and "has a human approved this".
  -- One combined column produces states like paid_but_pending that
  -- multiply combinatorially.
  status           text not null default 'pending',
  reviewed_at      timestamptz,
  reviewed_by      uuid references auth.users(id) on delete set null,
  rejection_reason text,
  student_id       uuid references students(id) on delete set null,

  -- ── context ────────────────────────────────────────────────
  referral_source text,
  notes           text,

  -- ── consent ────────────────────────────────────────────────
  -- Doc 2 §9.4: for a service to minors, capturing "they ticked the
  -- box" is not enough. Store WHICH text they agreed to, so a dispute
  -- two years from now can be answered.
  consent_given   bool not null default false,
  consent_at      timestamptz,
  consent_version text,

  -- ── provenance ─────────────────────────────────────────────
  -- Doc 1 §11.5: the 50 Google Forms sign-ups need somewhere to land
  -- that distinguishes them from real submissions through the site.
  source     text not null default 'website',
  ip_address inet,
  user_agent text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint applications_plan_valid
    check (plan is null or plan in ('monthly', 'upfront')),

  constraint applications_payment_status_valid
    check (payment_status in
      ('pending_payment', 'paid', 'failed', 'abandoned', 'refunded')),

  constraint applications_status_valid
    check (status in ('pending', 'approved', 'rejected', 'withdrawn')),

  constraint applications_source_valid
    check (source in ('website', 'google_form', 'manual', 'import')),

  constraint applications_amounts_positive
    check (amount_due_kobo > 0 and amount_total_kobo > 0),

  constraint applications_due_not_over_total
    check (amount_due_kobo <= amount_total_kobo),

  constraint applications_gender_valid
    check (student_gender is null
           or student_gender in ('Male', 'Female', 'Prefer not to say')),

  constraint applications_relationship_valid
    check (parent_relationship is null
           or parent_relationship in ('Mother', 'Father', 'Guardian', 'Other')),

  -- paid_at must exist iff payment_status is paid
  constraint applications_paid_at_consistent
    check ((payment_status = 'paid') = (paid_at is not null)),

  -- An approved application must point at the student it created
  constraint applications_approved_has_student
    check (status <> 'approved' or student_id is not null),

  -- A rejection should say why
  constraint applications_rejected_has_reason
    check (status <> 'rejected' or rejection_reason is not null)
);

-- Admin default view: pending applications with verified payment.
create index applications_review_idx
  on applications (status, payment_status, created_at desc);

create index applications_parent_email_idx on applications (parent_email);
create index applications_course_idx       on applications (course_slug);
create index applications_payment_ref_idx  on applications (payment_ref);

create trigger applications_updated_at
  before update on applications
  for each row execute function set_updated_at();

-- Close the loop left open in 0003.
alter table students
  add constraint students_application_fk
  foreign key (application_id) references applications(id) on delete set null;


comment on table applications is
  'Admissions record. Immutable history of what a family submitted — student rows hold current truth.';

comment on column applications.payment_status is
  'Flipped to paid ONLY by the verified Paystack webhook. Doc 2 §6.2: the redirect proves nothing.';

comment on column applications.source is
  'google_form = one of the ~50 pre-existing sign-ups (Doc 1 §11.5).';


-- ───────────────────────────────────────────────────────────────
-- Age eligibility + derived age
-- ───────────────────────────────────────────────────────────────
-- Cannot be a CHECK constraint: age depends on current_date and is
-- therefore not immutable. Trigger instead.
--
-- BLOCKED — Doc 1 §10.1: the advertised range is 10–16 but the
-- curriculum tracks are 10–12 and 13–15, so a 16-year-old can be
-- accepted here with nowhere to place them. This trigger enforces
-- what the form currently claims. Narrow the upper bound or add a
-- third track; do not leave both as they are.

create or replace function validate_application_age()
returns trigger
language plpgsql
as $$
declare
  v_age  int;
  v_type text;
  v_min  int;
  v_max  int;
begin
  v_age := age_years(new.student_dob);
  new.age_at_application := v_age;

  select type, coalesce(age_min, 10), coalesce(age_max, 16)
    into v_type, v_min, v_max
    from courses where slug = new.course_slug;

  if v_type is null then
    raise exception 'Unknown course: %', new.course_slug
      using errcode = 'foreign_key_violation';
  end if;

  if v_age < v_min or v_age > v_max then
    raise exception
      'Student is % years old; % accepts ages %–%.',
      v_age, new.course_slug, v_min, v_max
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger applications_validate_age
  before insert on applications
  for each row execute function validate_application_age();


-- ───────────────────────────────────────────────────────────────
-- Plan / price coherence
-- ───────────────────────────────────────────────────────────────
-- Doc 2 §9.4: "a client-side price is a suggestion, not a fact."
-- The amount charged is recomputed here from the courses table and
-- compared against what was submitted. A tampered form body that
-- asks to pay ₦100 for a ₦75,000 programme is rejected by the
-- database, not merely by the Server Action.

create or replace function validate_application_amounts()
returns trigger
language plpgsql
as $$
declare
  c record;
  v_expected_due   bigint;
  v_expected_total bigint;
begin
  select * into c from courses where slug = new.course_slug;

  if c.status <> 'live' then
    raise exception 'Course % is not open for applications (status: %).',
      new.course_slug, c.status
      using errcode = 'check_violation';
  end if;

  if c.type = 'summer' then
    if new.plan is not null then
      raise exception 'Summer programmes have no payment plan.'
        using errcode = 'check_violation';
    end if;
    v_expected_due   := c.price_kobo;
    v_expected_total := c.price_kobo;

  else
    if new.plan is null then
      raise exception 'A payment plan is required for term programmes.'
        using errcode = 'check_violation';
    end if;

    if new.plan = 'upfront' then
      v_expected_due   := c.price_kobo;
      v_expected_total := c.price_kobo;
    else
      if c.price_monthly_kobo is null then
        raise exception 'Course % has no monthly plan.', new.course_slug
          using errcode = 'check_violation';
      end if;
      v_expected_due   := c.price_monthly_kobo;
      v_expected_total := c.price_monthly_kobo * c.instalments;
    end if;
  end if;

  if new.amount_due_kobo <> v_expected_due
     or new.amount_total_kobo <> v_expected_total then
    raise exception
      'Amount mismatch for % (%): expected %/% kobo, got %/%.',
      new.course_slug, coalesce(new.plan, 'one-time'),
      v_expected_due, v_expected_total,
      new.amount_due_kobo, new.amount_total_kobo
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger applications_validate_amounts
  before insert on applications
  for each row execute function validate_application_amounts();


-- ───────────────────────────────────────────────────────────────
-- payments
-- ───────────────────────────────────────────────────────────────
-- Doc 1 §9.4 decided NOT to build Paystack subscriptions — cards
-- only, no bank transfer, and a recurring-billing state machine is
-- not worth it at 15–30 students.
--
-- Recording payments is a different thing from automating them.
-- Without this table, months 2 and 3 of a monthly plan live in a
-- spreadsheet, the admin panel cannot show who owes what, and
-- "has this family paid?" has no answer inside the system.
--
-- One table. No recurring billing. Manual bank transfers get
-- recorded here by admin exactly like Paystack charges.

create table payments (
  id uuid primary key default gen_random_uuid(),

  application_id uuid references applications(id) on delete set null,
  student_id     uuid references students(id)     on delete set null,

  amount_kobo bigint not null,
  currency    text   not null default 'NGN',

  -- 1 of 3, 2 of 3, 3 of 3. NULL for one-time payments.
  instalment_number int,
  instalment_of     int,

  method text not null default 'paystack',
  status text not null default 'pending',

  paystack_ref       text unique,
  paystack_raw       jsonb,
  recorded_by        uuid references auth.users(id) on delete set null,
  recorded_manually  bool not null default false,

  due_on  date,
  paid_at timestamptz,
  note    text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint payments_method_valid
    check (method in ('paystack', 'bank_transfer', 'cash', 'waived')),

  constraint payments_status_valid
    check (status in ('pending', 'paid', 'failed', 'refunded', 'cancelled')),

  constraint payments_amount_positive
    check (amount_kobo > 0),

  constraint payments_instalment_sane
    check (instalment_number is null
           or (instalment_of is not null
               and instalment_number between 1 and instalment_of)),

  constraint payments_paid_at_consistent
    check ((status = 'paid') = (paid_at is not null)),

  constraint payments_has_a_subject
    check (application_id is not null or student_id is not null)
);

create index payments_application_idx on payments (application_id);
create index payments_student_idx     on payments (student_id);
create index payments_status_idx      on payments (status, due_on);

-- The query that replaces the spreadsheet: who owes money, oldest first.
create index payments_outstanding_idx
  on payments (due_on)
  where status = 'pending';

create trigger payments_updated_at
  before update on payments
  for each row execute function set_updated_at();

comment on table payments is
  'Payment LEDGER, not a billing engine. Doc 1 §9.4: no Paystack subscriptions. Manual bank transfers are recorded here by admin identically to card charges.';
