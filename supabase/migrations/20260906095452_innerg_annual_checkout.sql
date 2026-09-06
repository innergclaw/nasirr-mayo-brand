alter table public.innerg_memberships
 add column billing_plan text not null default 'monthly' check (billing_plan in ('monthly','yearly')),
 add column access_expires_at timestamptz,
 add column one_time_amount_cents integer not null default 0;
alter table public.innerg_memberships drop constraint innerg_memberships_payment_rule_check;
alter table public.innerg_memberships add constraint innerg_memberships_payment_rule_check check (
(access_source='grandfathered' and monthly_amount_cents=0)
or (access_source='stripe' and payment_verified and (
(billing_plan='monthly' and monthly_amount_cents=1000 and one_time_amount_cents=0)
or (billing_plan='yearly' and monthly_amount_cents=0 and one_time_amount_cents=10000 and access_expires_at is not null))));
create table public.innerg_checkout_attempts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 attempt_id uuid not null default gen_random_uuid(),
 plan text not null check(plan in ('monthly','yearly')),
 stripe_session_id text,
 created_at timestamptz not null default now()
);
alter table public.innerg_checkout_attempts enable row level security;
revoke all on public.innerg_checkout_attempts from public,anon,authenticated;
grant all on public.innerg_checkout_attempts to service_role;
comment on table public.innerg_checkout_attempts is 'Service-only checkout idempotency reservations. Contains no payment credentials.';
alter table public.innerg_memberships add column last_stripe_event_at timestamptz;
create or replace function public.fulfill_innerg_checkout(
 p_user_id uuid, p_session text, p_customer text, p_subscription text,
 p_plan text, p_paid_at timestamptz, p_period_end timestamptz
) returns void language plpgsql security invoker set search_path='' as $$
begin
 if p_plan not in ('monthly','yearly') or p_paid_at is null or p_period_end is null or p_period_end <= p_paid_at then
  raise exception 'Invalid membership period';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 if exists(select 1 from public.innerg_memberships where user_id=p_user_id and
  (access_source='grandfathered' or stripe_checkout_session_id=p_session or last_stripe_event_at > p_paid_at)) then return; end if;
 insert into public.innerg_memberships(user_id,status,membership_type,monthly_amount_cents,access_source,payment_verified,
 stripe_checkout_session_id,stripe_customer_id,stripe_subscription_id,billing_plan,one_time_amount_cents,access_expires_at,last_stripe_event_at)
 values(p_user_id,'active','founding',case when p_plan='monthly' then 1000 else 0 end,'stripe',true,
 p_session,p_customer,p_subscription,p_plan,case when p_plan='yearly' then 10000 else 0 end,p_period_end,p_paid_at)
 on conflict(user_id) do update set status='active',monthly_amount_cents=excluded.monthly_amount_cents,
 payment_verified=true,access_source='stripe',stripe_checkout_session_id=p_session,stripe_customer_id=p_customer,
 stripe_subscription_id=p_subscription,billing_plan=p_plan,one_time_amount_cents=excluded.one_time_amount_cents,
 access_expires_at=p_period_end,last_stripe_event_at=p_paid_at,updated_at=now();
 insert into public.watchlist_memberships(user_id,status,access_source,stripe_checkout_session_id,stripe_customer_id,stripe_subscription_id,paid_at,access_granted_at)
 values(p_user_id,'active','innerg_membership',p_session,p_customer,p_subscription,p_paid_at,p_paid_at)
 on conflict(user_id) do update set status='active',access_source='innerg_membership',
 stripe_checkout_session_id=p_session,stripe_customer_id=p_customer,stripe_subscription_id=p_subscription,updated_at=now();
end $$;
revoke all on function public.fulfill_innerg_checkout(uuid,text,text,text,text,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.fulfill_innerg_checkout(uuid,text,text,text,text,timestamptz,timestamptz) to service_role;
create or replace function public.sync_innerg_subscription(p_subscription text,p_status text,p_end timestamptz,p_event_at timestamptz)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if p_status not in ('active','past_due','canceled') or (p_status='active' and p_end is null) then raise exception 'Invalid subscription status'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_subscription,0));
 update public.innerg_memberships set status=p_status,access_expires_at=coalesce(p_end,access_expires_at),
 last_stripe_event_at=p_event_at,updated_at=now()
 where stripe_subscription_id=p_subscription and access_source='stripe' and billing_plan='monthly'
 and (last_stripe_event_at is null or last_stripe_event_at<=p_event_at);
 update public.watchlist_memberships set status=p_status,updated_at=now()
 where stripe_subscription_id=p_subscription and access_source='stripe';
 update public.watchlist_memberships w set status=m.status,updated_at=now()
 from public.innerg_memberships m where w.user_id=m.user_id and w.access_source='innerg_membership'
 and m.stripe_subscription_id=p_subscription;
end $$;
revoke all on function public.sync_innerg_subscription(text,text,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.sync_innerg_subscription(text,text,timestamptz,timestamptz) to service_role;
