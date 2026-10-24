-- Close new free / seven-day trial INNERG IDs (Mr G, Oct 24 2026).
-- Additive and safe: no table rows are inserted, updated, or deleted.
-- Existing grandfathered and sunday_free rows keep working through
-- innerg_entitlement_decide, get_free_innerg_id_record, and innerg-member-access,
-- none of which change here. Only the claim path that created new trial rows closes.
-- New visitors are pointed to InnerG Pulse (free) or a paid membership.

create or replace function public.claim_innerg_sunday_id()
returns table (
  claim_status text,
  drop_date date,
  membership_number text,
  claimed_count integer,
  capacity integer,
  next_drop_at timestamptz,
  trial_started_at timestamptz,
  trial_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_membership_number text;
begin
  if v_user_id is null then
    return query select 'sign_in_required'::text, null::date, null::text, 0, 0, null::timestamptz, null::timestamptz, null::timestamptz;
    return;
  end if;

  select m.membership_number into v_membership_number
  from public.innerg_memberships as m
  where m.user_id = v_user_id;

  if v_membership_number is not null then
    return query select 'already_has_id'::text, null::date, v_membership_number, 0, 0, null::timestamptz, null::timestamptz, null::timestamptz;
    return;
  end if;

  return query select 'closed'::text, null::date, null::text, 0, 0, null::timestamptz, null::timestamptz, null::timestamptz;
end;
$$;

revoke all on function public.claim_innerg_sunday_id() from public, anon, authenticated;

comment on function public.claim_innerg_sunday_id() is
  'Closed Oct 24 2026: no new free or trial INNERG IDs. Returns closed or already_has_id and never writes rows. New visitors go to InnerG Pulse or a paid membership.';
