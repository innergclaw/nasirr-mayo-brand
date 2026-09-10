-- Private founder content. Static assets never contain inbox text.
create table public.founder_drops (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default '75677100-97b7-4578-92c5-cf131997b580' references auth.users(id),
 delivery_key text unique,
 title text not null check(char_length(title) between 1 and 160),
 body text not null check(char_length(body) between 1 and 50000),
 kind text not null default 'post' check(kind in ('post','script','email','research','note')),
 brand text not null default 'innerg',
 status text not null default 'ready' check(status in ('ready','posted','archived')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.founder_drops enable row level security;
revoke all on public.founder_drops from anon, authenticated;
grant select,insert,update,delete on public.founder_drops to authenticated;
grant all on public.founder_drops to service_role;
create policy founder_drops_owner on public.founder_drops for all to authenticated
 using ((select auth.uid())=owner_id and owner_id='75677100-97b7-4578-92c5-cf131997b580')
 with check ((select auth.uid())=owner_id and owner_id='75677100-97b7-4578-92c5-cf131997b580');
create index founder_drops_inbox on public.founder_drops(owner_id,status,created_at desc);

create table public.founder_drop_push_config (
 id boolean primary key default true check(id), worker_hash text not null,
 public_key text, private_key text
);
create table public.founder_drop_devices (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 endpoint text not null unique, subscription jsonb not null, created_at timestamptz not null default now()
);
create table public.founder_drop_deliveries (
 id uuid primary key default gen_random_uuid(), drop_id uuid not null references public.founder_drops(id) on delete cascade,
 device_id uuid not null references public.founder_drop_devices(id) on delete cascade,
 state text not null default 'pending' check(state in ('pending','sending','sent','failed')),
 attempts integer not null default 0, next_attempt timestamptz not null default now(),
 lease_token uuid, sent_at timestamptz, last_error text,
 unique(drop_id,device_id)
);
alter table public.founder_drop_push_config enable row level security;
alter table public.founder_drop_devices enable row level security;
alter table public.founder_drop_deliveries enable row level security;
revoke all on public.founder_drop_push_config,public.founder_drop_devices,public.founder_drop_deliveries from public,anon,authenticated;
grant all on public.founder_drop_push_config,public.founder_drop_devices,public.founder_drop_deliveries to service_role;
create index founder_drop_due on public.founder_drop_deliveries(next_attempt) where state in ('pending','sending');

create schema if not exists private;
create function private.founder_drop_enqueue() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.owner_id <> '75677100-97b7-4578-92c5-cf131997b580'::uuid then raise exception 'Invalid owner'; end if;
 insert into public.founder_drop_deliveries(drop_id,device_id)
 select new.id,id from public.founder_drop_devices where owner_id=new.owner_id on conflict do nothing;
 return new;
end $$;
revoke all on function private.founder_drop_enqueue() from public,anon,authenticated;
create trigger founder_drop_enqueue after insert on public.founder_drops for each row execute function private.founder_drop_enqueue();

create function public.founder_drop_claim() returns setof public.founder_drop_deliveries language sql security invoker set search_path='' as $$
 update public.founder_drop_deliveries set state='sending', attempts=attempts+1, lease_token=gen_random_uuid(),next_attempt=now()+interval '2 minutes'
 where id in (select id from public.founder_drop_deliveries where state in ('pending','sending') and next_attempt<=now() and attempts<5 order by next_attempt for update skip locked limit 20) returning *;
$$;
revoke all on function public.founder_drop_claim() from public,anon,authenticated;
grant execute on function public.founder_drop_claim() to service_role;

do $$ declare secret text:=encode(extensions.gen_random_bytes(32),'hex'); begin
 perform vault.create_secret(secret,'founder_drop_worker');
 insert into public.founder_drop_push_config(id,worker_hash) values(true,encode(extensions.digest(secret,'sha256'),'hex'));
end $$;
select cron.schedule('founder-drop-notifications','* * * * *',$cron$
 select net.http_post(url:='https://zkyhhoxcrjkhywblzehr.supabase.co/functions/v1/founder-drop-push',
 headers:=jsonb_build_object('Content-Type','application/json','x-worker-secret',(select decrypted_secret from vault.decrypted_secrets where name='founder_drop_worker')),
 body:='{"action":"worker"}'::jsonb,timeout_milliseconds:=15000);
$cron$);
