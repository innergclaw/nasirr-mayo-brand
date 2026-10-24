-- Backup of live function definitions before 20261024220000_innerg_close_new_trials (read from project zkyhhoxcrjkhywblzehr, Oct 24 2026)
-- ===== innerg_entitlement_decide
CREATE OR REPLACE FUNCTION public.innerg_entitlement_decide(p_status text, p_access_source text, p_payment_verified boolean, p_expires_at timestamp with time zone, p_now timestamp with time zone DEFAULT now())
 RETURNS TABLE(is_member boolean, tier text, reason text)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select
    case
      when p_access_source is null then false
      when p_access_source = 'grandfathered' then p_status = 'active'
      when p_access_source = 'sunday_free' then
        p_status = 'active' and p_expires_at is not null and p_expires_at > p_now
      when p_access_source = 'stripe' then
        coalesce(p_payment_verified, false)
        and p_status in ('active', 'trialing')
        -- null expiry with an active Stripe status counts as active (fixes the old Discord mismatch)
        and (p_expires_at is null or p_expires_at > p_now)
      else false
    end,
    case
      when p_access_source is null then 'none'
      when p_access_source = 'grandfathered' then 'grandfathered'
      when p_access_source = 'sunday_free' then 'trial'
      when p_access_source = 'stripe' then 'stripe'
      else 'other'
    end,
    case
      when p_access_source is null then 'no_membership'
      when p_access_source not in ('grandfathered', 'sunday_free', 'stripe') then 'unknown_source'
      when p_access_source = 'grandfathered' then
        case when p_status = 'active' then 'grandfathered' else 'status_' || coalesce(p_status, 'null') end
      when p_access_source = 'sunday_free' then
        case
          when p_status is distinct from 'active' then 'status_' || coalesce(p_status, 'null')
          when p_expires_at is null then 'trial_missing_expiry'
          when p_expires_at <= p_now then 'trial_expired'
          else 'trial_active'
        end
      else
        case
          when not coalesce(p_payment_verified, false) then 'payment_unverified'
          when p_status not in ('active', 'trialing') or p_status is null then 'status_' || coalesce(p_status, 'null')
          when p_expires_at is not null and p_expires_at <= p_now then 'stripe_expired'
          else 'stripe_active'
        end
    end;
$function$
;
-- ===== innerg_entitlement
CREATE OR REPLACE FUNCTION public.innerg_entitlement(p_user uuid DEFAULT auth.uid())
 RETURNS TABLE(user_id uuid, is_member boolean, tier text, access_source text, status text, payment_verified boolean, expires_at timestamp with time zone, membership_number text, reason text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_role text := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
  v_member public.innerg_memberships%rowtype;
begin
  if v_role = 'anon' then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if v_role = 'authenticated' and p_user is distinct from (select auth.uid()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_user is null then
    return query select null::uuid, false, 'none'::text, null::text, null::text, null::boolean,
      null::timestamptz, null::text, 'sign_in_required'::text;
    return;
  end if;

  select m.* into v_member from public.innerg_memberships m where m.user_id = p_user;

  return query
  select p_user, d.is_member, d.tier, v_member.access_source, v_member.status, v_member.payment_verified,
         v_member.access_expires_at, v_member.membership_number, d.reason
  from public.innerg_entitlement_decide(v_member.status, v_member.access_source,
         v_member.payment_verified, v_member.access_expires_at, now()) d;
end;
$function$
;
-- ===== handle_new_portal_user
CREATE OR REPLACE FUNCTION public.handle_new_portal_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.portal_profiles (id, email, full_name, business_name)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120),
    left(coalesce(new.raw_user_meta_data ->> 'business_name', ''), 160)
  )
  on conflict (id) do nothing;
  return new;
end;
$function$
;
-- ===== capture_member_signup
CREATE OR REPLACE FUNCTION private.capture_member_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into private.member_registry (
    user_id,
    signup_method,
    joined_at,
    first_name,
    last_name
  )
  values (
    new.id,
    case
      when new.raw_app_meta_data->>'provider' = 'google' then 'google'
      when new.raw_app_meta_data->>'provider' = 'email' or new.raw_app_meta_data->>'provider' is null then 'email'
      else 'other'
    end,
    new.created_at,
    nullif(left(trim(coalesce(
      new.raw_user_meta_data ->> 'first_name',
      new.raw_user_meta_data ->> 'given_name',
      split_part(coalesce(new.raw_user_meta_data ->> 'full_name', ''), ' ', 1)
    )), 60), ''),
    nullif(left(trim(coalesce(
      new.raw_user_meta_data ->> 'last_name',
      new.raw_user_meta_data ->> 'family_name',
      regexp_replace(coalesce(new.raw_user_meta_data ->> 'full_name', ''), '^\S+\s*', '')
    )), 60), '')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$function$
;
-- ===== create_watchlist_membership
CREATE OR REPLACE FUNCTION private.create_watchlist_membership()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.is_anonymous is not true then
    insert into public.watchlist_memberships (user_id, status, access_source)
    values (new.id, 'payment_required', 'signup')
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$function$
;
-- ===== get_innerg_sunday_drop_status
CREATE OR REPLACE FUNCTION public.get_innerg_sunday_drop_status()
 RETURNS TABLE(drop_date date, opens_at timestamp with time zone, closes_at timestamp with time zone, capacity integer, claimed_count integer, remaining integer, is_open boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  on conflict on constraint innerg_sunday_drops_drop_date_key do nothing;

  select d.* into v_drop
  from public.innerg_sunday_drops as d
  where d.drop_date = v_drop_date;

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
$function$
;
-- ===== get_free_innerg_id_record
CREATE OR REPLACE FUNCTION public.get_free_innerg_id_record()
 RETURNS TABLE(membership_number text, joined_at timestamp with time zone, first_name text, last_name text, access_source text, membership_status text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
-- ===== update_free_innerg_id_name
CREATE OR REPLACE FUNCTION public.update_free_innerg_id_name(p_first_name text, p_last_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
-- ===== claim_innerg_sunday_id
CREATE OR REPLACE FUNCTION public.claim_innerg_sunday_id()
 RETURNS TABLE(claim_status text, drop_date date, membership_number text, claimed_count integer, capacity integer, next_drop_at timestamp with time zone, trial_started_at timestamp with time zone, trial_expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
