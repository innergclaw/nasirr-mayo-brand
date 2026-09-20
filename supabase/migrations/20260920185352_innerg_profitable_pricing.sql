alter table public.innerg_memberships
  drop constraint if exists innerg_memberships_payment_rule_check;

alter table public.innerg_memberships
  add constraint innerg_memberships_payment_rule_check check (
    (access_source = 'grandfathered' and monthly_amount_cents = 0)
    or (
      access_source = 'sunday_free'
      and billing_plan = 'trial'
      and monthly_amount_cents = 0
      and one_time_amount_cents = 0
      and payment_verified = false
      and access_expires_at is not null
      and access_expires_at = joined_at + interval '7 days'
    )
    or (
      access_source = 'stripe'
      and payment_verified
      and (
        (billing_plan = 'monthly' and monthly_amount_cents in (1000, 1500) and one_time_amount_cents = 0)
        or (billing_plan = 'yearly' and monthly_amount_cents = 0 and one_time_amount_cents in (10000, 15000) and access_expires_at is not null)
      )
    )
  );

alter table public.innerg_video_access
  drop constraint if exists innerg_video_access_amount_paid_cents_check;

alter table public.innerg_video_access
  add constraint innerg_video_access_amount_paid_cents_check
  check (amount_paid_cents in (1000, 1900));

create table public.innerg_video_checkout_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  attempt_id uuid not null default gen_random_uuid(),
  product_key text not null check (product_key = 'end_of_year_frequency_2026'),
  amount_cents integer not null check (amount_cents = 1900),
  stripe_session_id text,
  created_at timestamptz not null default now()
);

alter table public.innerg_video_checkout_attempts enable row level security;
revoke all on public.innerg_video_checkout_attempts from public, anon, authenticated;
grant all on public.innerg_video_checkout_attempts to service_role;

comment on table public.innerg_video_checkout_attempts is
  'Service-only idempotency reservations for the 19 USD standalone INNERG briefing. Contains no payment credentials.';

create or replace function public.fulfill_innerg_checkout(
  p_user_id uuid,
  p_session text,
  p_customer text,
  p_subscription text,
  p_plan text,
  p_amount_cents integer,
  p_paid_at timestamptz,
  p_period_end timestamptz
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_plan not in ('monthly', 'yearly')
    or p_amount_cents not in (1000, 1500, 10000, 15000)
    or (p_plan = 'monthly' and p_amount_cents not in (1000, 1500))
    or (p_plan = 'yearly' and p_amount_cents not in (10000, 15000))
    or p_paid_at is null
    or p_period_end is null
    or p_period_end <= p_paid_at then
    raise exception 'Invalid membership purchase';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  if exists (
    select 1
    from public.innerg_memberships
    where user_id = p_user_id
      and (
        access_source = 'grandfathered'
        or stripe_checkout_session_id = p_session
        or last_stripe_event_at > p_paid_at
      )
  ) then
    return;
  end if;

  insert into public.innerg_memberships (
    user_id,
    status,
    membership_type,
    monthly_amount_cents,
    access_source,
    payment_verified,
    stripe_checkout_session_id,
    stripe_customer_id,
    stripe_subscription_id,
    billing_plan,
    one_time_amount_cents,
    access_expires_at,
    last_stripe_event_at
  ) values (
    p_user_id,
    'active',
    'member',
    case when p_plan = 'monthly' then p_amount_cents else 0 end,
    'stripe',
    true,
    p_session,
    p_customer,
    p_subscription,
    p_plan,
    case when p_plan = 'yearly' then p_amount_cents else 0 end,
    p_period_end,
    p_paid_at
  )
  on conflict (user_id) do update set
    status = 'active',
    membership_type = 'member',
    monthly_amount_cents = excluded.monthly_amount_cents,
    payment_verified = true,
    access_source = 'stripe',
    stripe_checkout_session_id = p_session,
    stripe_customer_id = p_customer,
    stripe_subscription_id = p_subscription,
    billing_plan = p_plan,
    one_time_amount_cents = excluded.one_time_amount_cents,
    access_expires_at = p_period_end,
    last_stripe_event_at = p_paid_at,
    updated_at = now();

  insert into public.watchlist_memberships (
    user_id,
    status,
    access_source,
    stripe_checkout_session_id,
    stripe_customer_id,
    stripe_subscription_id,
    paid_at,
    access_granted_at
  ) values (
    p_user_id,
    'active',
    'innerg_membership',
    p_session,
    p_customer,
    p_subscription,
    p_paid_at,
    p_paid_at
  )
  on conflict (user_id) do update set
    status = 'active',
    access_source = 'innerg_membership',
    stripe_checkout_session_id = p_session,
    stripe_customer_id = p_customer,
    stripe_subscription_id = p_subscription,
    updated_at = now();
end;
$$;

revoke all on function public.fulfill_innerg_checkout(uuid, text, text, text, text, integer, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.fulfill_innerg_checkout(uuid, text, text, text, text, integer, timestamptz, timestamptz)
  to service_role;
