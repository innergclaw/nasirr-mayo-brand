-- INNERG TECH list choice on the existing pulse_subscribers table.
-- Existing rows stay Pulse only (wants_pulse true, wants_tech false).
-- Adds tech_send_log / tech_send_recipients so TECH issue_id dedupe is separate from PULSE.
-- Row level security stays on; anon and authenticated get no grants. Reverse notes at the bottom.

alter table public.pulse_subscribers
  add column if not exists wants_pulse boolean not null default true,
  add column if not exists wants_tech boolean not null default false;

create table if not exists public.tech_send_log (
  issue_id text primary key,
  recipient_count integer not null default 0,
  sent_at timestamptz not null default now(),
  status text not null
);
create table if not exists public.tech_send_recipients (
  issue_id text not null,
  subscriber_id uuid not null references public.pulse_subscribers (id) on delete cascade,
  status text not null,
  error text,
  updated_at timestamptz not null default now(),
  unique (issue_id, subscriber_id)
);
alter table public.tech_send_log enable row level security;
alter table public.tech_send_recipients enable row level security;
revoke all on public.tech_send_log, public.tech_send_recipients from anon, authenticated;

-- Activate after Auth accepted the code, and save the verified list choice.
create or replace function public.pulse_activate_lists(p_email text, p_auth_user_id uuid, p_pulse boolean, p_tech boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_email text;
  want_pulse boolean := coalesce(p_pulse, false);
  want_tech boolean := coalesce(p_tech, false);
begin
  clean_email := public.pulse_normalize_email(p_email);
  if clean_email is null then
    return jsonb_build_object('status', 'invalid_email');
  end if;
  if not want_pulse and not want_tech then
    want_pulse := true;
  end if;

  insert into public.pulse_subscribers (
    email, status, unsubscribe_token, confirmed_at, auth_user_id, wants_pulse, wants_tech
  )
  values (
    clean_email, 'active', encode(extensions.gen_random_bytes(32), 'hex'),
    pg_catalog.now(), p_auth_user_id, want_pulse, want_tech
  )
  on conflict (email) do update set
    status = 'active',
    confirmed_at = coalesce(public.pulse_subscribers.confirmed_at, pg_catalog.now()),
    unsubscribed_at = null,
    auth_user_id = coalesce(p_auth_user_id, public.pulse_subscribers.auth_user_id),
    wants_pulse = want_pulse,
    wants_tech = want_tech,
    updated_at = pg_catalog.now();

  return jsonb_build_object('status', 'confirmed');
end;
$$;

-- Leave one list ('pulse' or 'tech') or both ('all'). Leaving the last list marks the row unsubscribed.
create or replace function public.pulse_unsubscribe_list(p_token text, p_ip text, p_list text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text := lower(pg_catalog.btrim(coalesce(p_token, '')));
  list text := lower(coalesce(p_list, 'all'));
  sub public.pulse_subscribers%rowtype;
  keep_pulse boolean;
  keep_tech boolean;
begin
  if not public.pulse_rate_allow('unsubscribe_ip', p_ip) then
    return jsonb_build_object('status', 'rate_limited');
  end if;
  if token !~ '^[a-f0-9]{64}$' or list not in ('pulse', 'tech', 'all') then
    return jsonb_build_object('status', 'invalid_token');
  end if;

  select * into sub from public.pulse_subscribers where unsubscribe_token = token for update;
  if not found then
    return jsonb_build_object('status', 'invalid_token');
  end if;

  keep_pulse := sub.wants_pulse and list = 'tech';
  keep_tech := sub.wants_tech and list = 'pulse';

  update public.pulse_subscribers
  set wants_pulse = keep_pulse,
      wants_tech = keep_tech,
      status = case when keep_pulse or keep_tech then status else 'unsubscribed' end,
      unsubscribed_at = case when keep_pulse or keep_tech then unsubscribed_at else coalesce(unsubscribed_at, pg_catalog.now()) end,
      updated_at = pg_catalog.now()
  where id = sub.id;

  return jsonb_build_object('status', 'unsubscribed', 'list', list);
end;
$$;

revoke all on function public.pulse_activate_lists(text, uuid, boolean, boolean) from public, anon, authenticated;
revoke all on function public.pulse_unsubscribe_list(text, text, text) from public, anon, authenticated;
grant execute on function public.pulse_activate_lists(text, uuid, boolean, boolean) to postgres, service_role;
grant execute on function public.pulse_unsubscribe_list(text, text, text) to postgres, service_role;

-- Reverse:
-- drop function if exists public.pulse_unsubscribe_list(text, text, text);
-- drop function if exists public.pulse_activate_lists(text, uuid, boolean, boolean);
-- drop table if exists public.tech_send_recipients;
-- drop table if exists public.tech_send_log;
-- alter table public.pulse_subscribers drop column if exists wants_tech, drop column if exists wants_pulse;
