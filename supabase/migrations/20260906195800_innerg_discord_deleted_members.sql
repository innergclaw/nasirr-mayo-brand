-- Retain the Discord mapping long enough to revoke access if an account is deleted.
-- Only service_role can read it. Support can release the mapping after revocation.
alter table public.innerg_discord_links drop constraint innerg_discord_links_user_id_fkey;
create or replace function public.innerg_discord_membership_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP='DELETE' then
    update public.innerg_discord_links set next_sync_at=now() where user_id=old.user_id;
    return old;
  end if;
  update public.innerg_discord_links set next_sync_at=now() where user_id=new.user_id;
  return new;
end;
$$;
drop trigger innerg_discord_membership_changed on public.innerg_memberships;
create trigger innerg_discord_membership_changed after insert or update or delete on public.innerg_memberships
for each row execute function public.innerg_discord_membership_changed();
