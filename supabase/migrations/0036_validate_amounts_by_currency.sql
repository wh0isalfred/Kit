-- 0036 · Amount validation must respect currency
-- ───────────────────────────────────────────────────────────────
-- validate_application_amounts() compared every submitted amount
-- against courses.price_kobo, so the first GBP application was
-- rejected: "expected 1500000/1500000 kobo, got 2000/2000". The
-- trigger was right to reject it — it had no way to know 2000 was
-- £20.00 in pence rather than ₦20 in kobo.
--
-- This is a SECURITY control, not a formality: it's what stops a
-- tampered client submitting a ₦1 application. It is extended here,
-- never weakened — every path still rejects a mismatch.
--
-- applications.amount_due_kobo holds the MINOR UNIT of
-- applications.currency: kobo for NGN, pence for GBP. The column name
-- is imperfect for non-NGN rows; the currency column is the
-- discriminator.

create or replace function public.validate_application_amounts()
returns trigger
language plpgsql
as $function$
declare
  c record;
  v_currency       text;
  v_price          bigint;   -- one-time price, minor unit of v_currency
  v_price_monthly  bigint;   -- monthly price, minor unit of v_currency
  v_unit           text;     -- for readable error messages
  v_expected_due   bigint;
  v_expected_total bigint;
begin
  select * into c from courses where slug = new.course_slug;

  if c.status <> 'live' then
    raise exception 'Course % is not open for applications (status: %).',
      new.course_slug, c.status
      using errcode = 'check_violation';
  end if;

  -- Pick the price columns matching the row's currency. Rows written
  -- before currency existed have NULL, which is treated as NGN.
  v_currency := coalesce(new.currency, 'NGN');

  if v_currency = 'GBP' then
    v_price         := c.price_gbp_pence;
    v_price_monthly := c.price_monthly_gbp_pence;
    v_unit          := 'pence';

    if v_price is null then
      raise exception 'Course % is not priced for GBP applicants.', new.course_slug
        using errcode = 'check_violation';
    end if;

  elsif v_currency = 'NGN' then
    v_price         := c.price_kobo;
    v_price_monthly := c.price_monthly_kobo;
    v_unit          := 'kobo';

  else
    raise exception 'Unsupported currency: %', v_currency
      using errcode = 'check_violation';
  end if;

  if c.type = 'summer' then
    if new.plan is not null then
      raise exception 'Summer programmes have no payment plan.'
        using errcode = 'check_violation';
    end if;
    v_expected_due   := v_price;
    v_expected_total := v_price;

  else
    if new.plan is null then
      raise exception 'A payment plan is required for term programmes.'
        using errcode = 'check_violation';
    end if;

    if new.plan = 'upfront' then
      v_expected_due   := v_price;
      v_expected_total := v_price;
    else
      if v_price_monthly is null then
        raise exception 'Course % has no monthly plan in %.', new.course_slug, v_currency
          using errcode = 'check_violation';
      end if;
      v_expected_due   := v_price_monthly;
      v_expected_total := v_price_monthly * c.instalments;
    end if;
  end if;

  if new.amount_due_kobo <> v_expected_due
     or new.amount_total_kobo <> v_expected_total then
    raise exception
      'Amount mismatch for % (%) in %: expected %/% %, got %/%.',
      new.course_slug, coalesce(new.plan, 'one-time'), v_currency,
      v_expected_due, v_expected_total, v_unit,
      new.amount_due_kobo, new.amount_total_kobo
      using errcode = 'check_violation';
  end if;

  return new;
end;
$function$;