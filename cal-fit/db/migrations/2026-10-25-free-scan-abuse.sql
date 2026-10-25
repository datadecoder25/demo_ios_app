-- Free monthly scans are granted once per email address per month, even if the account is
-- deleted and created again (see db/schema.sql). Safe to re-run.
-- After applying, refresh the Data API schema cache:
--   npx neonctl data-api refresh-schema --project-id <id> --database neondb
begin;

-- "N.Ame+promo@Gmail.com" → "name@gmail.com": one mailbox, one free allowance.
create or replace function public.normalize_email(email text) returns text
language sql immutable as $$
  with parts as (
    select split_part(lower(trim(email)), '@', 1) as local,
           split_part(lower(trim(email)), '@', 2) as domain
  )
  select case
    when domain in ('gmail.com', 'googlemail.com')
      then replace(split_part(local, '+', 1), '.', '') || '@gmail.com'
    else split_part(local, '+', 1) || '@' || domain
  end
  from parts
$$;

-- One row per mailbox and month that received free scans. Kept when an account is deleted
-- (only a one-way hash of the normalized address, no account link), so deleting and
-- re-creating an account can't reset the allowance. Not reachable through the Data API.
create table if not exists public.free_scan_grant (
  email_hash text not null,
  month date not null,
  created_at timestamptz not null default now(),
  primary key (email_hash, month)
);
revoke all on public.free_scan_grant from public, anonymous, authenticated;

-- This month's grants made before this table existed.
insert into public.free_scan_grant (email_hash, month)
select distinct encode(sha256(convert_to(public.normalize_email(u.email), 'UTF8')), 'hex'),
       date_trunc('month', now())::date
from public.credit_transaction t
join public.app_user u on u.id = t.user_id
where t.type = 'free' and t.created_at >= date_trunc('month', now()) and u.email is not null
on conflict do nothing;

-- Grants the 4 free monthly credits once per calendar month per account and per mailbox.
-- Needs the app_user row (/api/me runs first at sign-in) for the email address.
create or replace function public.claim_free_credits() returns integer
language plpgsql security definer set search_path = public as $$
declare
  uid text := auth.user_id();
  mailbox text;
  this_month date := date_trunc('month', now())::date;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtext(uid));

  if exists (
    select 1 from credit_transaction
    where user_id = uid and type = 'free' and created_at >= date_trunc('month', now())
  ) then
    return 0;
  end if;

  select encode(sha256(convert_to(normalize_email(email), 'UTF8')), 'hex') into mailbox
  from app_user where id = uid and email is not null;
  if mailbox is null then
    -- Account not synced yet; the app claims again on its next start.
    return 0;
  end if;

  -- Same lock for every account sharing the mailbox, so two can't both claim this month.
  perform pg_advisory_xact_lock(hashtext(mailbox));
  insert into free_scan_grant (email_hash, month) values (mailbox, this_month)
  on conflict do nothing;
  if not found then
    return 0;
  end if;

  insert into credit_transaction (user_id, amount, type) values (uid, 4, 'free');
  return 4;
end $$;

revoke all on function public.claim_free_credits() from public, anonymous;
grant execute on function public.claim_free_credits() to authenticated;

commit;
