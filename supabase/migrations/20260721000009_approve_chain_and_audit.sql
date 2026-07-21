-- ═══════════════════════════════════════════════════════════════
-- 0009 · The approve chain, and the audit log
-- ═══════════════════════════════════════════════════════════════
-- Doc 3 §6.3: "Approve" is one click for admin but five operations
-- behind it, and the wireframe is explicit — "do not leave a
-- half-created student. Approval should be atomic or clearly
-- recoverable."
--
-- The split taken here:
--
--   ATOMIC (this function, one transaction):
--     create student → assign batch → generate KIT ID → link
--     application → schedule instalments → write audit row
--
--   RECOVERABLE (the Server Action, afterwards):
--     create the auth user, send login email
--
-- Email deliberately sits OUTSIDE the transaction. Making it atomic
-- would mean a failed send rolls back a perfectly good student
-- record; instead login_email_sent_at stays null and the send is
-- retryable without re-running admissions. That is a better failure
-- mode than atomicity here.


-- ───────────────────────────────────────────────────────────────
-- audit_log
-- ───────────────────────────────────────────────────────────────
-- Doc 2 §4.4 and §9.4: admin approvals, rejections, grade overrides
-- and points adjustments left no trace anywhere. For a system
-- holding children's records and money, the first dispute with a
-- parent is the wrong time to discover this.

create table audit_log (
  id         bigserial primary key,
  actor_id   uuid references auth.users(id) on delete set null,
  actor_role text,
  action     text not null,
  entity     text not null,
  entity_id  uuid,
  summary    text,
  detail     jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_entity_idx on audit_log (entity, entity_id, created_at desc);
create index audit_log_actor_idx  on audit_log (actor_id, created_at desc);
create index audit_log_action_idx on audit_log (action, created_at desc);

create or replace function write_audit(
  p_action  text,
  p_entity  text,
  p_entity_id uuid,
  p_summary text default null,
  p_detail  jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_log (actor_id, actor_role, action, entity, entity_id, summary, detail)
  values (
    auth.uid(),
    (select role from profiles where user_id = auth.uid()),
    p_action, p_entity, p_entity_id, p_summary, p_detail
  );
end;
$$;


-- Track whether the login email actually went out.
alter table students
  add column login_email_sent_at timestamptz,
  add column login_email_attempts int not null default 0;

comment on column students.login_email_sent_at is
  'NULL means the student exists but has not been told. This is the recoverable half of the approve chain — retry the send without re-running admissions.';


-- ───────────────────────────────────────────────────────────────
-- approve_application
-- ───────────────────────────────────────────────────────────────

create or replace function approve_application(
  p_application_id uuid,
  p_batch_id       uuid
)
returns table (
  student_id  uuid,
  kit_id      text,
  batch_label text,
  email       text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  a       record;
  b       record;
  v_kit   text;
  v_sid   uuid;
  v_i     int;
  v_month int;
begin
  -- ── guards ────────────────────────────────────────────────
  select * into a from applications where id = p_application_id for update;
  if not found then
    raise exception 'Application % not found.', p_application_id
      using errcode = 'no_data_found';
  end if;

  if a.status = 'approved' then
    raise exception 'Application % is already approved (student %).',
      p_application_id, a.student_id
      using errcode = 'unique_violation';
  end if;

  if a.status <> 'pending' then
    raise exception 'Application % is %, not pending.', p_application_id, a.status
      using errcode = 'check_violation';
  end if;

  -- Doc 3 §6.3: "don't let one be approved until payment is verified."
  if a.payment_status <> 'paid' then
    raise exception
      'Application % has payment status "%". Approve only after Paystack confirms.',
      p_application_id, a.payment_status
      using errcode = 'check_violation';
  end if;

  select * into b from batches where id = p_batch_id;
  if not found then
    raise exception 'Batch % not found.', p_batch_id
      using errcode = 'foreign_key_violation';
  end if;

  if b.course_slug <> a.course_slug then
    raise exception
      'Batch % teaches %, but the application is for %.',
      p_batch_id, b.course_slug, a.course_slug
      using errcode = 'check_violation';
  end if;

  if b.status = 'completed' or b.status = 'cancelled' then
    raise exception 'Batch % is %.', p_batch_id, b.status
      using errcode = 'check_violation';
  end if;

  -- ── 1. KIT ID ─────────────────────────────────────────────
  v_kit := generate_kit_id(p_batch_id);

  -- ── 2. student ────────────────────────────────────────────
  -- Batch capacity is enforced by the trigger from 0003; if the batch
  -- filled up between admin loading the page and clicking approve,
  -- this raises and the whole transaction unwinds, including the
  -- consumed KIT ID number.
  insert into students (
    kit_id, name, email, dob, gender, school,
    parent_name, parent_email, parent_phone, parent_relationship,
    batch_id, application_id, status
  ) values (
    v_kit, a.student_name, a.parent_email, a.student_dob,
    a.student_gender, a.student_school,
    a.parent_name, a.parent_email, a.parent_phone, a.parent_relationship,
    p_batch_id, a.id, 'active'
  )
  returning id into v_sid;

  -- ── 3. instalment schedule ────────────────────────────────
  -- The first payment already happened (payment_status = paid).
  -- Rows for months 2..n are created as pending so the admin panel
  -- can answer "who owes what" without a spreadsheet. Doc 1 §9.4:
  -- recording payments is not the same as automating them.
  insert into payments (
    application_id, student_id, amount_kobo,
    instalment_number, instalment_of,
    method, status, paystack_ref, paid_at
  ) values (
    a.id, v_sid, a.amount_due_kobo,
    case when a.plan = 'monthly' then 1 else null end,
    case when a.plan = 'monthly'
         then (a.amount_total_kobo / a.amount_due_kobo)::int else null end,
    'paystack', 'paid', a.payment_ref, a.paid_at
  );

  if a.plan = 'monthly' then
    v_month := (a.amount_total_kobo / a.amount_due_kobo)::int;
    for v_i in 2..v_month loop
      insert into payments (
        application_id, student_id, amount_kobo,
        instalment_number, instalment_of,
        method, status, due_on
      ) values (
        a.id, v_sid, a.amount_due_kobo,
        v_i, v_month,
        'paystack', 'pending',
        (coalesce(a.paid_at, now()) + make_interval(months => v_i - 1))::date
      );
    end loop;
  end if;

  -- ── 4. close the application ──────────────────────────────
  update applications
     set status      = 'approved',
         student_id  = v_sid,
         reviewed_at = now(),
         reviewed_by = auth.uid()
   where id = p_application_id;

  -- ── 5. audit ──────────────────────────────────────────────
  perform write_audit(
    'approve', 'applications', p_application_id,
    format('Approved %s → %s in %s', a.student_name, v_kit, b.cohort_label),
    jsonb_build_object(
      'student_id', v_sid, 'kit_id', v_kit,
      'batch_id', p_batch_id, 'plan', a.plan
    )
  );

  return query
    select v_sid, v_kit, b.cohort_label, a.parent_email::text;
end;
$$;

comment on function approve_application is
  'The atomic half of the approve chain. Auth user creation and the login email happen afterwards in the Server Action and are retryable via students.login_email_sent_at.';


-- ───────────────────────────────────────────────────────────────
-- reject_application
-- ───────────────────────────────────────────────────────────────
-- Doc 3 §6.3: confirm before rejecting — it is a real family on the
-- other end. The reason is mandatory (also a table constraint), and
-- if money was taken it flags the refund rather than silently
-- leaving a paid rejected application.

create or replace function reject_application(
  p_application_id uuid,
  p_reason         text
)
returns table (refund_due bool, refund_kobo bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
  v_refund bool;
begin
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'A rejection reason is required.'
      using errcode = 'check_violation';
  end if;

  select * into a from applications where id = p_application_id for update;
  if not found then
    raise exception 'Application % not found.', p_application_id;
  end if;

  if a.status <> 'pending' then
    raise exception 'Application % is %, not pending.', p_application_id, a.status;
  end if;

  v_refund := (a.payment_status = 'paid');

  update applications
     set status           = 'rejected',
         rejection_reason = p_reason,
         reviewed_at      = now(),
         reviewed_by      = auth.uid()
   where id = p_application_id;

  perform write_audit(
    'reject', 'applications', p_application_id,
    format('Rejected %s: %s', a.student_name, p_reason),
    jsonb_build_object('refund_due', v_refund, 'amount_kobo', a.amount_due_kobo)
  );

  return query select v_refund, case when v_refund then a.amount_due_kobo else 0::bigint end;
end;
$$;

comment on function reject_application is
  'Returns refund exposure. Doc 1 §11.3: there is still no written refund POLICY — this function surfaces the obligation, it does not decide it.';


-- ───────────────────────────────────────────────────────────────
-- record_payment — the manual-chase path
-- ───────────────────────────────────────────────────────────────
-- Marks a pending instalment paid. Used both by the Paystack webhook
-- and by admin recording a bank transfer, which is the common case
-- for months 2 and 3 (Doc 1 §9.4 — no subscriptions, and bank
-- transfer is what many Nigerian parents prefer anyway).

create or replace function record_payment(
  p_payment_id   uuid,
  p_method       text default 'bank_transfer',
  p_paystack_ref text default null,
  p_note         text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  p record;
begin
  select * into p from payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment % not found.', p_payment_id;
  end if;

  if p.status = 'paid' then
    return;   -- idempotent: a retried webhook must not double-record
  end if;

  update payments
     set status            = 'paid',
         paid_at           = now(),
         method            = p_method,
         paystack_ref      = coalesce(p_paystack_ref, paystack_ref),
         recorded_by       = auth.uid(),
         recorded_manually = (p_method <> 'paystack'),
         note              = coalesce(p_note, note)
   where id = p_payment_id;

  perform write_audit(
    'payment_recorded', 'payments', p_payment_id,
    format('Instalment %s of %s recorded via %s',
           coalesce(p.instalment_number, 1), coalesce(p.instalment_of, 1), p_method),
    jsonb_build_object('amount_kobo', p.amount_kobo, 'student_id', p.student_id)
  );
end;
$$;


-- ───────────────────────────────────────────────────────────────
-- enrol_summer_student
-- ───────────────────────────────────────────────────────────────

create or replace function enrol_summer_student(
  p_application_id uuid default null,
  p_name           text default null,
  p_cohort_year    int  default null,
  p_parent_email   text default null,
  p_parent_phone   text default null
)
returns table (summer_student_id uuid, summer_id text, name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  a       record;
  v_year  int;
  v_name  text;
  v_email citext;
  v_phone text;
  v_sid   text;
  v_id    uuid;
begin
  -- Two entry paths: from a paid application, or typed in by admin
  -- (CSV roster import, walk-in). The record `a` only exists on the
  -- first path, so every read of it is guarded.
  if p_application_id is not null then
    select * into a from applications where id = p_application_id;
    if not found then
      raise exception 'Application % not found.', p_application_id;
    end if;
    if a.payment_status <> 'paid' then
      raise exception 'Application % is not paid.', p_application_id;
    end if;
    v_name  := a.student_name;
    v_email := coalesce(p_parent_email, a.parent_email);
    v_phone := coalesce(p_parent_phone, a.parent_phone);
  else
    v_name  := p_name;
    v_email := p_parent_email;
    v_phone := p_parent_phone;
  end if;

  if v_name is null then
    raise exception 'A student name is required.';
  end if;

  v_year := coalesce(
    p_cohort_year,
    (select year from summer_cohorts where active limit 1),
    extract(year from now())::int
  );

  v_sid := generate_summer_id(v_year);

  insert into summer_students
    (summer_id, name, cohort_year, parent_email, parent_phone, application_id)
  values
    (v_sid, v_name, v_year, v_email, v_phone, p_application_id)
  returning id into v_id;

  if p_application_id is not null then
    update applications
       set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
     where id = p_application_id and status = 'pending';
  end if;

  perform write_audit(
    'enrol_summer', 'summer_students', v_id,
    format('Enrolled %s as %s', v_name, v_sid), null
  );

  return query select v_id, v_sid, v_name;
end;
$$;
