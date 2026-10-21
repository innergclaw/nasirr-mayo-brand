-- INNERG PULSE now asks Supabase Auth to send and check the 6-digit code.
-- Safe to run more than once. Reverse notes are at the bottom.
-- Does not read or write innerg_memberships, and does not delete auth.users.

alter table public.pulse_subscribers
  add column if not exists auth_user_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'pulse_subscribers_auth_user_id_fkey'
  ) then
    alter table public.pulse_subscribers
      add constraint pulse_subscribers_auth_user_id_fkey
      foreign key (auth_user_id) references auth.users (id) on delete set null;
  end if;
end $$;

comment on column public.pulse_subscribers.auth_user_id is
  'Auth user created or reused when the email code was verified. This does not grant INNERG ID membership.';

create or replace function public.pulse_subscribe_gate(p_email text, p_ip text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_email text;
begin
  clean_email := public.pulse_normalize_email(p_email);
  if clean_email is null then
    return jsonb_build_object('status', 'invalid_email');
  end if;

  if not public.pulse_rate_allow('subscribe_email', clean_email)
     or not public.pulse_rate_allow('subscribe_ip', p_ip) then
    return jsonb_build_object('status', 'rate_limited');
  end if;

  return jsonb_build_object('status', 'ok');
end;
$$;

create or replace function public.pulse_mark_pending(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_email text;
begin
  clean_email := public.pulse_normalize_email(p_email);
  if clean_email is null then
    return jsonb_build_object('status', 'invalid_email');
  end if;

  insert into public.pulse_subscribers (email, status, unsubscribe_token, last_code_issued_at)
  values (
    clean_email,
    'pending',
    encode(extensions.gen_random_bytes(32), 'hex'),
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
    last_code_issued_at = pg_catalog.now(),
    updated_at = pg_catalog.now();

  return jsonb_build_object('status', 'pending');
end;
$$;

create or replace function public.pulse_confirm_gate(p_email text, p_code text, p_ip text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_email text;
  submitted text := pg_catalog.btrim(coalesce(p_code, ''));
begin
  if not public.pulse_rate_allow('confirm_ip', p_ip) then
    return jsonb_build_object('status', 'rate_limited');
  end if;

  clean_email := public.pulse_normalize_email(p_email);
  if clean_email is null or submitted !~ '^[0-9]{6}$' then
    return jsonb_build_object('status', 'invalid_code');
  end if;

  if not public.pulse_rate_allow('confirm_email', clean_email) then
    return jsonb_build_object('status', 'rate_limited');
  end if;

  return jsonb_build_object('status', 'ok');
end;
$$;

create or replace function public.pulse_activate(p_email text, p_auth_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_email text;
begin
  clean_email := public.pulse_normalize_email(p_email);
  if clean_email is null then
    return jsonb_build_object('status', 'invalid_email');
  end if;

  insert into public.pulse_subscribers (
    email, status, unsubscribe_token, confirmed_at, auth_user_id
  )
  values (
    clean_email,
    'active',
    encode(extensions.gen_random_bytes(32), 'hex'),
    pg_catalog.now(),
    p_auth_user_id
  )
  on conflict (email) do update set
    status = 'active',
    confirmed_at = coalesce(public.pulse_subscribers.confirmed_at, pg_catalog.now()),
    unsubscribed_at = null,
    auth_user_id = coalesce(p_auth_user_id, public.pulse_subscribers.auth_user_id),
    updated_at = pg_catalog.now();

  return jsonb_build_object('status', 'confirmed');
end;
$$;

create or replace function public.pulse_unsubscribe(p_token text, p_ip text)
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
      updated_at = pg_catalog.now()
  where id = sub.id;

  return jsonb_build_object('status', 'unsubscribed');
end;
$$;

drop function if exists public.pulse_prepare_code(text, text);
drop function if exists public.pulse_clear_code(text);
drop function if exists public.pulse_confirm_code(text, text, text);

alter table public.pulse_subscribers drop constraint if exists pulse_subscribers_otp_hash_format;
alter table public.pulse_subscribers drop constraint if exists pulse_subscribers_attempts_range;
alter table public.pulse_subscribers drop column if exists otp_hash;
alter table public.pulse_subscribers drop column if exists otp_expires_at;
alter table public.pulse_subscribers drop column if exists otp_attempts;

revoke all on function public.pulse_subscribe_gate(text, text) from public, anon, authenticated;
revoke all on function public.pulse_mark_pending(text) from public, anon, authenticated;
revoke all on function public.pulse_confirm_gate(text, text, text) from public, anon, authenticated;
revoke all on function public.pulse_activate(text, uuid) from public, anon, authenticated;
revoke all on function public.pulse_unsubscribe(text, text) from public, anon, authenticated;

grant execute on function public.pulse_subscribe_gate(text, text) to postgres, service_role;
grant execute on function public.pulse_mark_pending(text) to postgres, service_role;
grant execute on function public.pulse_confirm_gate(text, text, text) to postgres, service_role;
grant execute on function public.pulse_activate(text, uuid) to postgres, service_role;
grant execute on function public.pulse_unsubscribe(text, text) to postgres, service_role;

-- Reverse, if you need the old code columns back. Old code hashes are not restored.
-- alter table public.pulse_subscribers
--   add column if not exists otp_hash text,
--   add column if not exists otp_expires_at timestamptz,
--   add column if not exists otp_attempts integer not null default 0;
-- alter table public.pulse_subscribers drop constraint if exists pulse_subscribers_auth_user_id_fkey;
-- alter table public.pulse_subscribers drop column if exists auth_user_id;
