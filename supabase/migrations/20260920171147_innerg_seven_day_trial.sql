alter table public.innerg_sunday_claims
  add column claimed_email_hash text,
  add column trial_started_at timestamptz,
  add column trial_expires_at timestamptz;

update public.innerg_sunday_claims as c
set
  claimed_email_hash = pg_catalog.encode(extensions.digest(pg_catalog.lower(pg_catalog.btrim(u.email)), 'sha256'), 'hex'),
  trial_started_at = c.claimed_at,
  trial_expires_at = c.claimed_at + interval '7 days'
from auth.users as u
where u.id = c.user_id;

alter table public.innerg_sunday_claims
  alter column claimed_email_hash set not null,
  alter column trial_started_at set not null,
  alter column trial_expires_at set not null,
  add constraint innerg_sunday_claims_email_hash_key unique (claimed_email_hash),
  add constraint innerg_sunday_claims_trial_period_check
    check (trial_expires_at = trial_started_at + interval '7 days');

alter table public.innerg_memberships
  drop constraint if exists innerg_memberships_billing_plan_check;

alter table public.innerg_memberships
  add constraint innerg_memberships_billing_plan_check
  check (billing_plan in ('monthly', 'yearly', 'trial'));

alter table public.innerg_memberships
  drop constraint if exists innerg_memberships_payment_rule_check;

update public.innerg_memberships as m
set
  billing_plan = 'trial',
  access_expires_at = c.trial_expires_at,
  updated_at = now()
from public.innerg_sunday_claims as c
where c.user_id = m.user_id
  and m.access_source = 'sunday_free';

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
        (billing_plan = 'monthly' and monthly_amount_cents = 1000 and one_time_amount_cents = 0)
        or (billing_plan = 'yearly' and monthly_amount_cents = 0 and one_time_amount_cents = 10000 and access_expires_at is not null)
      )
    )
  );

drop function if exists public.claim_innerg_sunday_id();

create function public.claim_innerg_sunday_id()
returns table (
  claim_status text,
  drop_date date,
  membership_number text,
  claimed_count integer,
  capacity integer,
  next_drop_at timestamptz,
  trial_started_at timestamptz,
  trial_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_local_date date := (v_now at time zone 'America/New_York')::date;
  v_drop_date date;
  v_drop public.innerg_sunday_drops%rowtype;
  v_existing_claim public.innerg_sunday_claims%rowtype;
  v_user_id uuid := (select auth.uid());
  v_email text;
  v_email_hash text;
  v_confirmed_at timestamptz;
  v_membership_number text;
  v_claimed integer := 0;
begin
  if v_user_id is null then
    return query select 'sign_in_required'::text, null::date, null::text, 0, 5, null::timestamptz, null::timestamptz, null::timestamptz;
    return;
  end if;

  select u.email, u.email_confirmed_at
  into v_email, v_confirmed_at
  from auth.users as u
  where u.id = v_user_id and u.is_anonymous is not true;

  if v_confirmed_at is null or v_email is null then
    return query select 'email_unverified'::text, null::date, null::text, 0, 5, null::timestamptz, null::timestamptz, null::timestamptz;
    return;
  end if;

  v_email_hash := pg_catalog.encode(extensions.digest(pg_catalog.lower(pg_catalog.btrim(v_email)), 'sha256'), 'hex');

  select c.* into v_existing_claim
  from public.innerg_sunday_claims as c
  where c.user_id = v_user_id or c.claimed_email_hash = v_email_hash
  limit 1;

  if v_existing_claim.id is not null then
    if v_existing_claim.user_id = v_user_id then
      select m.membership_number into v_membership_number
      from public.innerg_memberships as m
      where m.user_id = v_user_id;
    end if;
    return query select
      'trial_used'::text,
      (select d.drop_date from public.innerg_sunday_drops as d where d.id = v_existing_claim.drop_id),
      v_membership_number,
      0,
      5,
      null::timestamptz,
      v_existing_claim.trial_started_at,
      v_existing_claim.trial_expires_at;
    return;
  end if;

  select m.membership_number into v_membership_number
  from public.innerg_memberships as m
  where m.user_id = v_user_id;

  if v_membership_number is not null then
    return query select 'already_has_id'::text, null::date, v_membership_number, 0, 5, null::timestamptz, null::timestamptz, null::timestamptz;
    return;
  end if;

  if v_local_date < date '2026-09-20' then
    return query select
      'not_open'::text,
      date '2026-09-20',
      null::text,
      0,
      5,
      date '2026-09-20'::timestamp at time zone 'America/New_York',
      null::timestamptz,
      null::timestamptz;
    return;
  end if;

  v_drop_date := v_local_date - extract(dow from v_local_date)::integer;

  insert into public.innerg_sunday_drops (drop_date, opens_at, closes_at)
  values (
    v_drop_date,
    v_drop_date::timestamp at time zone 'America/New_York',
    (v_drop_date + 7)::timestamp at time zone 'America/New_York'
  )
  on conflict on constraint innerg_sunday_drops_drop_date_key do nothing;

  select d.* into v_drop
  from public.innerg_sunday_drops as d
  where d.drop_date = v_drop_date
  for update;

  select count(*)::integer into v_claimed
  from public.innerg_sunday_claims
  where drop_id = v_drop.id;

  if v_now < v_drop.opens_at then
    return query select 'not_open'::text, v_drop.drop_date, null::text, v_claimed, v_drop.capacity, v_drop.opens_at, null::timestamptz, null::timestamptz;
    return;
  end if;

  if v_now >= v_drop.closes_at or v_claimed >= v_drop.capacity then
    return query select 'full'::text, v_drop.drop_date, null::text, v_claimed, v_drop.capacity, v_drop.closes_at, null::timestamptz, null::timestamptz;
    return;
  end if;

  insert into public.innerg_memberships (
    user_id,
    status,
    membership_type,
    monthly_amount_cents,
    access_source,
    payment_verified,
    billing_plan,
    one_time_amount_cents,
    access_expires_at,
    joined_at,
    updated_at
  ) values (
    v_user_id,
    'active',
    'founding',
    0,
    'sunday_free',
    false,
    'trial',
    0,
    v_now + interval '7 days',
    v_now,
    v_now
  )
  returning innerg_memberships.membership_number into v_membership_number;

  insert into public.innerg_sunday_claims (
    drop_id,
    user_id,
    confirmed_at,
    claimed_email_hash,
    trial_started_at,
    trial_expires_at
  ) values (
    v_drop.id,
    v_user_id,
    v_confirmed_at,
    v_email_hash,
    v_now,
    v_now + interval '7 days'
  );

  v_claimed := v_claimed + 1;
  return query select
    'claimed'::text,
    v_drop.drop_date,
    v_membership_number,
    v_claimed,
    v_drop.capacity,
    v_drop.closes_at,
    v_now,
    v_now + interval '7 days';
end;
$$;

revoke all on function public.claim_innerg_sunday_id() from public, anon;
grant execute on function public.claim_innerg_sunday_id() to authenticated;

comment on table public.innerg_sunday_claims is 'Private ledger for one seven-day INNERG membership trial per verified user and normalized email hash. No raw email or verification token is stored.';
comment on function public.claim_innerg_sunday_id() is 'Atomically awards one of five weekly seven-day INNERG membership trials after Supabase email verification.';
