-- Discord identities are private. Only the authenticated Edge Function uses these tables.
create table public.innerg_discord_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  discord_user_id text not null unique check (discord_user_id ~ '^[0-9]{17,20}$'),
  discord_name text not null,
  sync_status text not null default 'pending',
  next_sync_at timestamptz not null default now(),
  lease_until timestamptz,
  synced_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.innerg_discord_states (
  state_hash text primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);
create table public.innerg_discord_config (id boolean primary key default true check(id), worker_hash text not null);
alter table public.innerg_discord_links enable row level security;
alter table public.innerg_discord_states enable row level security;
alter table public.innerg_discord_config enable row level security;
revoke all on public.innerg_discord_links, public.innerg_discord_states, public.innerg_discord_config from anon, authenticated;
grant all on public.innerg_discord_links, public.innerg_discord_states, public.innerg_discord_config to service_role;

create function public.innerg_discord_consume_state(p_hash text, p_user uuid)
returns boolean language sql security invoker set search_path = '' as $$
  with consumed as (delete from public.innerg_discord_states where state_hash=p_hash and user_id=p_user and expires_at>now() returning 1)
  select exists(select 1 from consumed);
$$;
create function public.innerg_discord_claim(p_user uuid default null)
returns setof public.innerg_discord_links language sql security invoker set search_path = '' as $$
  update public.innerg_discord_links set lease_until=now()+interval '90 seconds'
  where user_id in (select user_id from public.innerg_discord_links
    where (p_user is null or user_id=p_user) and next_sync_at<=now()
    and (lease_until is null or lease_until<now()) order by next_sync_at limit 15 for update skip locked)
  returning *;
$$;
create function public.innerg_discord_membership_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.innerg_discord_links set next_sync_at=now() where user_id=new.user_id;
  return new;
end;
$$;
create trigger innerg_discord_membership_changed after insert or update on public.innerg_memberships
for each row execute function public.innerg_discord_membership_changed();
revoke all on function public.innerg_discord_consume_state(text,uuid), public.innerg_discord_claim(uuid), public.innerg_discord_membership_changed() from public, anon, authenticated;
grant execute on function public.innerg_discord_consume_state(text,uuid), public.innerg_discord_claim(uuid) to service_role;

-- The scheduler secret is generated inside Postgres and never returned to a browser.
do $$ declare secret text := encode(extensions.gen_random_bytes(32),'hex'); begin
  perform vault.create_secret(secret,'innerg_discord_worker','Discord role reconciliation only');
  insert into public.innerg_discord_config(id,worker_hash) values(true,encode(extensions.digest(secret,'sha256'),'hex'));
end $$;
