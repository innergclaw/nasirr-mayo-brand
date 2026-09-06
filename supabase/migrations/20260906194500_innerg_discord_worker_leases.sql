alter table public.innerg_discord_links add column lease_token uuid;
create or replace function public.innerg_discord_claim(p_user uuid default null)
returns setof public.innerg_discord_links language sql security invoker set search_path = '' as $$
  update public.innerg_discord_links set lease_until=now()+interval '90 seconds',lease_token=gen_random_uuid()
  where user_id in (select user_id from public.innerg_discord_links
    where (p_user is null or user_id=p_user) and next_sync_at<=now()
    and (lease_until is null or lease_until<now()) order by next_sync_at limit 5 for update skip locked)
  returning *;
$$;
