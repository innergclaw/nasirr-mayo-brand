-- INNERG PULSE free newsletter.
-- The public API key cannot read or write these tables.
-- This file creates the first list tables. 20261021173000_pulse_auth_otp.sql
-- hands the 8-digit code to Supabase Auth. Run this file first on a new database,
-- then that file. Do not run this file again on project zkyhhoxcrjkhywblzehr.

create table public.pulse_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'unsubscribed')),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  last_code_issued_at timestamptz,
  unsubscribe_token text not null,
  otp_hash text,
  otp_expires_at timestamptz,
  otp_attempts integer not null default 0,
  constraint pulse_subscribers_email_unique unique (email),
  constraint pulse_subscribers_token_unique unique (unsubscribe_token),
  constraint pulse_subscribers_email_format check (
    email = lower(email)
    and char_length(email) between 6 and 254
    and email ~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$'
  ),
  constraint pulse_subscribers_token_format check (unsubscribe_token ~ '^[a-f0-9]{64}$'),
  constraint pulse_subscribers_otp_hash_format check (otp_hash is null or otp_hash ~ '^[a-f0-9]{64}$'),
  constraint pulse_subscribers_attempts_range check (otp_attempts between 0 and 5),
  constraint pulse_subscribers_status_times check (
    (status = 'pending' and unsubscribed_at is null)
    or (status = 'active' and confirmed_at is not null and unsubscribed_at is null)
    or (status = 'unsubscribed' and unsubscribed_at is not null)
  )
);

create index pulse_subscribers_active_idx
  on public.pulse_subscribers (email)
  where status = 'active';

create table public.pulse_rate_events (
  id bigint generated always as identity primary key,
  bucket text not null check (bucket in (
    'subscribe_email', 'subscribe_ip', 'confirm_email', 'confirm_ip', 'unsubscribe_ip'
  )),
  subject_hash text not null check (subject_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default pg_catalog.now()
);

create index pulse_rate_events_lookup_idx
  on public.pulse_rate_events (bucket, subject_hash, created_at desc);

create index pulse_rate_events_created_idx
  on public.pulse_rate_events (created_at);

alter table public.pulse_subscribers enable row level security;
alter table public.pulse_rate_events enable row level security;
alter table public.pulse_subscribers force row level security;
alter table public.pulse_rate_events force row level security;

revoke all on public.pulse_subscribers from public, anon, authenticated;
revoke all on public.pulse_rate_events from public, anon, authenticated;
grant select, insert, update, delete on public.pulse_subscribers to service_role;
grant select, insert, update, delete on public.pulse_rate_events to service_role;

create policy pulse_subscribers_deny_public
  on public.pulse_subscribers
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy pulse_rate_events_deny_public
  on public.pulse_rate_events
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

comment on table public.pulse_subscribers is
  'INNERG PULSE subscribers. Service role only. The public API key has no read or write grant.';

comment on table public.pulse_rate_events is
  'Hashed INNERG PULSE rate-limit events. No email or IP is stored in clear text.';

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'pulse_otp_pepper') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'pulse_otp_pepper',
      'HMAC pepper for INNERG PULSE one-time codes and rate-limit hashes.'
    );
  end if;
end $$;

create function public.pulse_pepper()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'pulse_otp_pepper'
  limit 1;
$$;

create function public.pulse_normalize_email(p_email text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  email text := lower(pg_catalog.btrim(coalesce(p_email, '')));
begin
  if char_length(email) < 6 or char_length(email) > 254 then
    return null;
  end if;
  if email !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' then
    return null;
  end if;
  return email;
end;
$$;

create function public.pulse_rate_allow(p_bucket text, p_subject text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  pepper text;
  hashed text;
  limit_n integer;
  hits integer;
begin
  pepper := public.pulse_pepper();
  if pepper is null or pepper = '' then
    raise exception 'pulse pepper missing';
  end if;

  limit_n := case p_bucket
    when 'subscribe_email' then 5
    when 'subscribe_ip' then 20
    when 'confirm_email' then 10
    when 'confirm_ip' then 30
    when 'unsubscribe_ip' then 30
    else 0
  end;
  if limit_n = 0 then
    return false;
  end if;

  delete from public.pulse_rate_events
  where created_at < pg_catalog.now() - interval '2 days';

  hashed := encode(
    extensions.hmac(p_bucket || ':' || left(coalesce(nullif(pg_catalog.btrim(p_subject), ''), 'unknown'), 80), pepper, 'sha256'),
    'hex'
  );

  select count(*) into hits
  from public.pulse_rate_events
  where bucket = p_bucket
    and subject_hash = hashed
    and created_at > pg_catalog.now() - interval '1 hour';

  if hits >= limit_n then
    return false;
  end if;

  insert into public.pulse_rate_events (bucket, subject_hash)
  values (p_bucket, hashed);
  return true;
end;
$$;

create function public.pulse_prepare_code(p_email text, p_ip text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_email text;
  pepper text;
  raw bytea;
  otp_code text;
  otp_hash text;
  saved_token text;
begin
  clean_email := public.pulse_normalize_email(p_email);
  if clean_email is null then
    return jsonb_build_object('status', 'invalid_email');
  end if;

  if not public.pulse_rate_allow('subscribe_email', clean_email)
     or not public.pulse_rate_allow('subscribe_ip', p_ip) then
    return jsonb_build_object('status', 'rate_limited');
  end if;

  pepper := public.pulse_pepper();
  if pepper is null or pepper = '' then
    raise exception 'pulse pepper missing';
  end if;

  raw := extensions.gen_random_bytes(4);
  otp_code := pg_catalog.lpad((
    (
      get_byte(raw, 0)::bigint * 16777216
      + get_byte(raw, 1)::bigint * 65536
      + get_byte(raw, 2)::bigint * 256
      + get_byte(raw, 3)::bigint
    ) % 1000000
  )::text, 6, '0');
  otp_hash := encode(extensions.hmac(clean_email || ':' || otp_code, pepper, 'sha256'), 'hex');

  insert into public.pulse_subscribers (
    email, status, unsubscribe_token, otp_hash, otp_expires_at, otp_attempts, last_code_issued_at
  )
  values (
    clean_email,
    'pending',
    encode(extensions.gen_random_bytes(32), 'hex'),
    otp_hash,
    pg_catalog.now() + interval '15 minutes',
    0,
    pg_catalog.now()
  )
  on conflict (email) do update set
    status = case
      when public.pulse_subscribers.status = 'unsubscribed' then 'pending'
      else public.pulse_subscribers.status
    end,
    unsubscribed_at = case
      when public.pulse_subscribers.status = 'unsubscribed' then null
      else public.pulse_subscribers.unsubscribed_at
    end,
    otp_hash = excluded.otp_hash,
    otp_expires_at = excluded.otp_expires_at,
    otp_attempts = 0,
    last_code_issued_at = pg_catalog.now(),
    updated_at = pg_catalog.now()
  returning unsubscribe_token into saved_token;

  return jsonb_build_object(
    'status', 'code_ready',
    'email', clean_email,
    'code', otp_code,
    'unsubscribe_token', saved_token
  );
end;
$$;

create function public.pulse_clear_code(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_email text := public.pulse_normalize_email(p_email);
begin
  if clean_email is null then
    return;
  end if;
  update public.pulse_subscribers
  set otp_hash = null,
      otp_expires_at = null,
      otp_attempts = 0,
      updated_at = pg_catalog.now()
  where email = clean_email;
end;
$$;

create function public.pulse_confirm_code(p_email text, p_code text, p_ip text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_email text;
  pepper text;
  submitted text := pg_catalog.btrim(coalesce(p_code, ''));
  sub public.pulse_subscribers%rowtype;
  expected text;
  next_attempts integer;
begin
  clean_email := public.pulse_normalize_email(p_email);
  if not public.pulse_rate_allow('confirm_ip', p_ip) then
    return jsonb_build_object('status', 'rate_limited');
  end if;
  if clean_email is null or submitted !~ '^[0-9]{8}$' then
    return jsonb_build_object('status', 'invalid_code');
  end if;
  if not public.pulse_rate_allow('confirm_email', clean_email) then
    return jsonb_build_object('status', 'rate_limited');
  end if;

  pepper := public.pulse_pepper();
  if pepper is null or pepper = '' then
    raise exception 'pulse pepper missing';
  end if;

  select * into sub
  from public.pulse_subscribers
  where email = clean_email
  for update;

  if not found
     or sub.otp_hash is null
     or sub.otp_expires_at is null
     or sub.otp_expires_at <= pg_catalog.now()
     or sub.otp_attempts >= 5 then
    perform extensions.hmac('missing:' || submitted, pepper, 'sha256');
    update public.pulse_subscribers
    set otp_hash = null,
        otp_expires_at = null,
        otp_attempts = 0,
        updated_at = pg_catalog.now()
    where email = clean_email;
    return jsonb_build_object('status', 'invalid_code');
  end if;

  expected := encode(extensions.hmac(clean_email || ':' || submitted, pepper, 'sha256'), 'hex');
  if expected = sub.otp_hash then
    update public.pulse_subscribers
    set status = 'active',
        confirmed_at = pg_catalog.now(),
        unsubscribed_at = null,
        otp_hash = null,
        otp_expires_at = null,
        otp_attempts = 0,
        updated_at = pg_catalog.now()
    where email = clean_email;
    return jsonb_build_object('status', 'confirmed');
  end if;

  next_attempts := sub.otp_attempts + 1;
  update public.pulse_subscribers
  set otp_attempts = next_attempts,
      otp_hash = case when next_attempts >= 5 then null else otp_hash end,
      otp_expires_at = case when next_attempts >= 5 then null else otp_expires_at end,
      updated_at = pg_catalog.now()
  where email = clean_email;
  return jsonb_build_object('status', 'invalid_code');
end;
$$;

create function public.pulse_unsubscribe(p_token text, p_ip text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text := lower(pg_catalog.btrim(coalesce(p_token, '')));
  sub public.pulse_subscribers%rowtype;
begin
  if not public.pulse_rate_allow('unsubscribe_ip', p_ip) then
    return jsonb_build_object('status', 'rate_limited');
  end if;
  if token !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('status', 'invalid_token');
  end if;

  select * into sub
  from public.pulse_subscribers
  where unsubscribe_token = token
  for update;

  if not found then
    return jsonb_build_object('status', 'invalid_token');
  end if;

  update public.pulse_subscribers
  set status = 'unsubscribed',
      unsubscribed_at = coalesce(unsubscribed_at, pg_catalog.now()),
      otp_hash = null,
      otp_expires_at = null,
      otp_attempts = 0,
      updated_at = pg_catalog.now()
  where id = sub.id;

  return jsonb_build_object('status', 'unsubscribed');
end;
$$;

revoke all on function public.pulse_pepper() from public, anon, authenticated;
revoke all on function public.pulse_normalize_email(text) from public, anon, authenticated;
revoke all on function public.pulse_rate_allow(text, text) from public, anon, authenticated;
revoke all on function public.pulse_prepare_code(text, text) from public, anon, authenticated;
revoke all on function public.pulse_clear_code(text) from public, anon, authenticated;
revoke all on function public.pulse_confirm_code(text, text, text) from public, anon, authenticated;
revoke all on function public.pulse_unsubscribe(text, text) from public, anon, authenticated;

grant execute on function public.pulse_pepper() to postgres, service_role;
grant execute on function public.pulse_normalize_email(text) to postgres, service_role;
grant execute on function public.pulse_rate_allow(text, text) to postgres, service_role;
grant execute on function public.pulse_prepare_code(text, text) to postgres, service_role;
grant execute on function public.pulse_clear_code(text) to postgres, service_role;
grant execute on function public.pulse_confirm_code(text, text, text) to postgres, service_role;
grant execute on function public.pulse_unsubscribe(text, text) to postgres, service_role;
