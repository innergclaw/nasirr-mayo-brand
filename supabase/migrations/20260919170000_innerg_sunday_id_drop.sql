-- Five verified INNERG ID claims open each Sunday at midnight in New York.
-- The first public drop starts on 2026-09-20.

alter table public.innerg_memberships
  drop constraint if exists innerg_memberships_access_source_check;

alter table public.innerg_memberships
  add constraint innerg_memberships_access_source_check
  check (access_source in ('grandfathered', 'stripe', 'sunday_free'));

alter table public.innerg_memberships
  drop constraint if exists innerg_memberships_payment_rule_check;

alter table public.innerg_memberships
  add constraint innerg_memberships_payment_rule_check check (
    (access_source = 'grandfathered' and monthly_amount_cents = 0)
    or
    (access_source = 'sunday_free' and monthly_amount_cents = 0 and one_time_amount_cents = 0 and payment_verified = false and access_expires_at = '1970-01-01 00:00:00+00'::timestamptz)
    or
    (access_source = 'stripe' and payment_verified and (
      (billing_plan = 'monthly' and monthly_amount_cents = 1000 and one_time_amount_cents = 0)
      or
      (billing_plan = 'yearly' and monthly_amount_cents = 0 and one_time_amount_cents = 10000 and access_expires_at is not null)
    ))
  );

create table public.innerg_sunday_drops (
  id uuid primary key default gen_random_uuid(),
  drop_date date not null unique,
  capacity integer not null default 5 check (capacity = 5),
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (closes_at > opens_at)
);

create table public.innerg_sunday_claims (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references public.innerg_sunday_drops(id) on delete restrict,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  confirmed_at timestamptz not null,
  claimed_at timestamptz not null default now(),
  unique (drop_id, user_id)
);

alter table public.innerg_sunday_drops enable row level security;
alter table public.innerg_sunday_claims enable row level security;
revoke all on public.innerg_sunday_drops, public.innerg_sunday_claims from public, anon, authenticated;
grant all on public.innerg_sunday_drops, public.innerg_sunday_claims to service_role;

create or replace function public.get_innerg_sunday_drop_status()
returns table (
  drop_date date,
  opens_at timestamptz,
  closes_at timestamptz,
  capacity integer,
  claimed_count integer,
  remaining integer,
  is_open boolean
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
  v_claimed integer := 0;
begin
  if v_local_date < date '2026-09-20' then
    v_drop_date := date '2026-09-20';
  else
    v_drop_date := v_local_date - extract(dow from v_local_date)::integer;
  end if;

  insert into public.innerg_sunday_drops (drop_date, opens_at, closes_at)
  values (
    v_drop_date,
    v_drop_date::timestamp at time zone 'America/New_York',
    (v_drop_date + 7)::timestamp at time zone 'America/New_York'
  )
  on conflict (drop_date) do nothing;

  select * into v_drop
  from public.innerg_sunday_drops
  where innerg_sunday_drops.drop_date = v_drop_date;

  select count(*)::integer into v_claimed
  from public.innerg_sunday_claims
  where drop_id = v_drop.id;

  return query select
    v_drop.drop_date,
    v_drop.opens_at,
    v_drop.closes_at,
    v_drop.capacity,
    v_claimed,
    greatest(v_drop.capacity - v_claimed, 0),
    v_now >= v_drop.opens_at and v_now < v_drop.closes_at and v_claimed < v_drop.capacity;
end;
$$;

create or replace function public.claim_innerg_sunday_id()
returns table (
  claim_status text,
  drop_date date,
  membership_number text,
  claimed_count integer,
  capacity integer,
  next_drop_at timestamptz
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
  v_user_id uuid := (select auth.uid());
  v_confirmed_at timestamptz;
  v_membership_number text;
  v_claimed integer := 0;
begin
  if v_user_id is null then
    return query select 'sign_in_required'::text, null::date, null::text, 0, 5, null::timestamptz;
    return;
  end if;

  select email_confirmed_at into v_confirmed_at
  from auth.users
  where id = v_user_id and is_anonymous is not true;

  if v_confirmed_at is null then
    return query select 'email_unverified'::text, null::date, null::text, 0, 5, null::timestamptz;
    return;
  end if;

  select m.membership_number into v_membership_number
  from public.innerg_memberships as m
  where m.user_id = v_user_id;

  if v_membership_number is not null then
    return query select 'already_has_id'::text, null::date, v_membership_number, 0, 5, null::timestamptz;
    return;
  end if;

  if v_local_date < date '2026-09-20' then
    return query select
      'not_open'::text,
      date '2026-09-20',
      null::text,
      0,
      5,
      date '2026-09-20'::timestamp at time zone 'America/New_York';
    return;
  end if;

  v_drop_date := v_local_date - extract(dow from v_local_date)::integer;

  insert into public.innerg_sunday_drops (drop_date, opens_at, closes_at)
  values (
    v_drop_date,
    v_drop_date::timestamp at time zone 'America/New_York',
    (v_drop_date + 7)::timestamp at time zone 'America/New_York'
  )
  on conflict (drop_date) do nothing;

  select * into v_drop
  from public.innerg_sunday_drops
  where innerg_sunday_drops.drop_date = v_drop_date
  for update;

  select count(*)::integer into v_claimed
  from public.innerg_sunday_claims
  where drop_id = v_drop.id;

  if v_now < v_drop.opens_at then
    return query select 'not_open'::text, v_drop.drop_date, null::text, v_claimed, v_drop.capacity, v_drop.opens_at;
    return;
  end if;

  if v_now >= v_drop.closes_at or v_claimed >= v_drop.capacity then
    return query select 'full'::text, v_drop.drop_date, null::text, v_claimed, v_drop.capacity, v_drop.closes_at;
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
    'monthly',
    0,
    '1970-01-01 00:00:00+00'::timestamptz,
    v_now,
    v_now
  )
  returning innerg_memberships.membership_number into v_membership_number;

  insert into public.innerg_sunday_claims (drop_id, user_id, confirmed_at)
  values (v_drop.id, v_user_id, v_confirmed_at);

  v_claimed := v_claimed + 1;
  return query select 'claimed'::text, v_drop.drop_date, v_membership_number, v_claimed, v_drop.capacity, v_drop.closes_at;
end;
$$;

create or replace function public.get_free_innerg_id_record()
returns table (
  membership_number text,
  joined_at timestamptz,
  first_name text,
  last_name text,
  access_source text,
  membership_status text
)
language sql
security definer
set search_path = ''
as $$
  select
    m.membership_number,
    m.joined_at,
    r.first_name,
    r.last_name,
    m.access_source,
    m.status
  from public.innerg_memberships as m
  join private.member_registry as r on r.user_id = m.user_id
  where m.user_id = (select auth.uid())
    and m.access_source = 'sunday_free'
  limit 1;
$$;

create or replace function public.update_free_innerg_id_name(p_first_name text, p_last_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_first_name text := trim(regexp_replace(coalesce(p_first_name, ''), '\\s+', ' ', 'g'));
  v_last_name text := trim(regexp_replace(coalesce(p_last_name, ''), '\\s+', ' ', 'g'));
begin
  if (select auth.uid()) is null then raise exception 'Sign in required'; end if;
  if v_first_name = '' or v_last_name = '' or length(v_first_name) > 60 or length(v_last_name) > 60 then
    raise exception 'Enter a valid first and last name';
  end if;
  if v_first_name ~ '[[:cntrl:]]' or v_last_name ~ '[[:cntrl:]]' then
    raise exception 'Enter a valid first and last name';
  end if;

  update private.member_registry as r
  set first_name = v_first_name, last_name = v_last_name
  from public.innerg_memberships as m
  where r.user_id = (select auth.uid())
    and m.user_id = r.user_id
    and m.access_source = 'sunday_free';

  if not found then raise exception 'Free INNERG ID not found'; end if;
end;
$$;

revoke all on function public.get_innerg_sunday_drop_status() from public;
revoke all on function public.claim_innerg_sunday_id() from public;
revoke all on function public.get_free_innerg_id_record() from public;
revoke all on function public.update_free_innerg_id_name(text, text) from public;
grant execute on function public.get_innerg_sunday_drop_status() to anon, authenticated;
grant execute on function public.claim_innerg_sunday_id() to authenticated;
grant execute on function public.get_free_innerg_id_record() to authenticated;
grant execute on function public.update_free_innerg_id_name(text, text) to authenticated;

comment on table public.innerg_sunday_claims is 'One lifetime free INNERG ID claim per verified user. No raw verification tokens are stored.';
comment on function public.claim_innerg_sunday_id() is 'Atomically awards one of five weekly free INNERG IDs after Supabase email verification.';
