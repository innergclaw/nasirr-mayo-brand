create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create table public.innerg_trial_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.innerg_sunday_claims(id) on delete cascade,
  stage text not null check (stage in ('trial_day_0', 'trial_day_3', 'trial_day_6', 'trial_day_7')),
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent')),
  lease_token uuid,
  leased_at timestamptz,
  sent_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (claim_id, stage),
  check ((status = 'sent') = (sent_at is not null))
);

alter table public.innerg_trial_email_deliveries enable row level security;
revoke all on public.innerg_trial_email_deliveries from public, anon, authenticated;
grant all on public.innerg_trial_email_deliveries to service_role;

create function public.seed_innerg_trial_email_deliveries()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.innerg_trial_email_deliveries (claim_id, stage, due_at)
  values
    (new.id, 'trial_day_0', new.trial_started_at),
    (new.id, 'trial_day_3', new.trial_started_at + interval '3 days'),
    (new.id, 'trial_day_6', new.trial_started_at + interval '6 days'),
    (new.id, 'trial_day_7', new.trial_expires_at)
  on conflict (claim_id, stage) do nothing;
  return new;
end;
$$;

create trigger seed_innerg_trial_email_deliveries_after_claim
after insert on public.innerg_sunday_claims
for each row execute function public.seed_innerg_trial_email_deliveries();

insert into public.innerg_trial_email_deliveries (claim_id, stage, due_at)
select c.id, schedule.stage, schedule.due_at
from public.innerg_sunday_claims as c
cross join lateral (
  values
    ('trial_day_0'::text, c.trial_started_at),
    ('trial_day_3'::text, c.trial_started_at + interval '3 days'),
    ('trial_day_6'::text, c.trial_started_at + interval '6 days'),
    ('trial_day_7'::text, c.trial_expires_at)
) as schedule(stage, due_at)
on conflict (claim_id, stage) do nothing;

select vault.create_secret(
  pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '') || pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''),
  'innerg_trial_email_worker',
  'Authenticates the scheduled seven-day INNERG trial email worker.'
)
where not exists (select 1 from vault.decrypted_secrets where name = 'innerg_trial_email_worker');

create function public.lease_innerg_trial_emails(p_worker_secret text, p_limit integer default 20)
returns table (
  delivery_id uuid,
  lease_token uuid,
  stage text,
  email text,
  member_id text,
  first_name text,
  access_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from vault.decrypted_secrets
    where name = 'innerg_trial_email_worker'
      and decrypted_secret = p_worker_secret
  ) then
    raise exception 'Unauthorized worker';
  end if;

  return query
  with candidates as (
    select d.id
    from public.innerg_trial_email_deliveries as d
    join public.innerg_sunday_claims as c on c.id = d.claim_id
    join public.innerg_memberships as m on m.user_id = c.user_id
    where d.due_at <= now()
      and (d.status = 'pending' or (d.status = 'sending' and d.leased_at < now() - interval '30 minutes'))
      and m.access_source = 'sunday_free'
    order by d.due_at, d.id
    limit greatest(1, least(coalesce(p_limit, 20), 50))
    for update of d skip locked
  ), leased as (
    update public.innerg_trial_email_deliveries as d
    set status = 'sending', lease_token = gen_random_uuid(), leased_at = now(),
        attempt_count = d.attempt_count + 1, updated_at = now()
    from candidates
    where d.id = candidates.id
    returning d.id, d.claim_id, d.lease_token, d.stage
  )
  select
    l.id,
    l.lease_token,
    l.stage,
    u.email::text,
    m.membership_number,
    coalesce(r.first_name, 'member')::text,
    c.trial_expires_at
  from leased as l
  join public.innerg_sunday_claims as c on c.id = l.claim_id
  join auth.users as u on u.id = c.user_id
  join public.innerg_memberships as m on m.user_id = c.user_id
  left join private.member_registry as r on r.user_id = c.user_id
  where u.email is not null and u.email_confirmed_at is not null;
end;
$$;

create function public.complete_innerg_trial_email(
  p_worker_secret text,
  p_delivery_id uuid,
  p_lease_token uuid,
  p_success boolean,
  p_error text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from vault.decrypted_secrets
    where name = 'innerg_trial_email_worker'
      and decrypted_secret = p_worker_secret
  ) then
    raise exception 'Unauthorized worker';
  end if;

  update public.innerg_trial_email_deliveries
  set
    status = case when p_success then 'sent' else 'pending' end,
    sent_at = case when p_success then now() else null end,
    due_at = case when p_success then due_at else greatest(due_at, now() + interval '1 hour') end,
    last_error = case when p_success then null else left(coalesce(p_error, 'Trial email failed'), 500) end,
    lease_token = null,
    leased_at = null,
    updated_at = now()
  where id = p_delivery_id
    and lease_token = p_lease_token
    and status = 'sending';

  if not found then raise exception 'Invalid delivery lease'; end if;
end;
$$;

revoke all on function public.lease_innerg_trial_emails(text, integer) from public, anon, authenticated;
revoke all on function public.complete_innerg_trial_email(text, uuid, uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.lease_innerg_trial_emails(text, integer) to service_role;
grant execute on function public.complete_innerg_trial_email(text, uuid, uuid, boolean, text) to service_role;

select cron.unschedule(jobid)
from cron.job
where jobname = 'innerg-trial-email-sequence';

select cron.schedule(
  'innerg-trial-email-sequence',
  '10 * * * *',
  $schedule$
    select net.http_post(
      url := 'https://zkyhhoxcrjkhywblzehr.supabase.co/functions/v1/innerg-trial-email-worker',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-worker-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'innerg_trial_email_worker')
      ),
      body := '{}'::jsonb
    );
  $schedule$
);

comment on table public.innerg_trial_email_deliveries is
  'Private idempotent delivery ledger for day 0, 3, 6, and 7 Sunday trial emails.';
