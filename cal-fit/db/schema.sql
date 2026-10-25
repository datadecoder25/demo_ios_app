-- CalFit schema for Neon Postgres + Neon Data API, with Clerk for sign-in.
-- Users are Clerk users; public.app_user mirrors each one (id = Clerk user id, e.g. user_2ab…).
-- Row-Level Security enforces ownership via auth.user_id(), which reads the `sub` claim of the
-- Clerk session JWT the app sends to the Data API.
-- Upgrading a database created for Neon Auth? Run db/migrations/2026-10-22-clerk.sql first.

begin;

-- One row per Clerk user, written only by the server (/api/me) from Clerk's Backend API, so
-- the email is the verified one from Clerk rather than whatever a client sends.
create table if not exists public.app_user (
  id text primary key,
  email text,
  email_verified boolean not null default false,
  first_name text,
  last_name text,
  image_url text,
  -- How they sign in, from Clerk: e.g. 'password', 'oauth_google', 'oauth_apple'.
  sign_in_methods text[] not null default '{}',
  -- Neon Auth user whose data was moved to this account (see /api/me); claimed at most once.
  legacy_user_id text unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
alter table public.app_user add column if not exists legacy_user_id text unique;
create index if not exists app_user_email_idx on public.app_user (lower(email));

-- Profile: one per user.
create table if not exists public.profile (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique default auth.user_id(),
  age integer,
  height numeric,
  weight numeric,
  activity_level text,
  medical_conditions text,
  goal text,
  unit_preference text not null default 'imperial' check (unit_preference in ('imperial', 'metric')),
  daily_calorie_target integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Added for the multi-step onboarding (design/app_ui.png).
alter table public.profile add column if not exists gender text check (gender in ('male', 'female'));
alter table public.profile add column if not exists goal_weight numeric;
alter table public.profile add column if not exists gym_experience text;

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profile_set_updated_at on public.profile;
create trigger profile_set_updated_at before update on public.profile
  for each row execute function public.set_updated_at();

-- Meals (photo or manual). Soft-deleted via is_deleted.
create table if not exists public.meal (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default auth.user_id(),
  photo_url text,
  analysis_json jsonb,
  is_manual boolean not null default false,
  manual_name text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists meal_user_created_idx on public.meal (user_id, created_at desc);

-- Individual foods within a meal.
create table if not exists public.meal_food (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meal(id) on delete cascade,
  food_name text not null,
  calories numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  fiber numeric not null default 0
);
create index if not exists meal_food_meal_idx on public.meal_food (meal_id);

-- Credit ledger: balance = sum(amount).
create table if not exists public.credit_transaction (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default auth.user_id(),
  amount integer not null,
  type text not null check (type in ('free', 'purchase', 'used', 'refunded')),
  reference_id text,
  created_at timestamptz not null default now()
);
create index if not exists credit_tx_user_created_idx on public.credit_transaction (user_id, created_at desc);

-- AI analysis cache keyed by image hash, shared across users.
create table if not exists public.image_cache (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  hash text not null,
  analysis_json jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists image_cache_hash_idx on public.image_cache (hash, expires_at);

-- Grants: only signed-in users (role `authenticated`) touch app data; `anonymous` gets nothing.
grant select on public.app_user to authenticated;
revoke all on public.app_user from anonymous;
alter table public.app_user enable row level security;
drop policy if exists app_user_self on public.app_user;
create policy app_user_self on public.app_user for select to authenticated
  using (id = (select auth.user_id()));

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profile, public.meal, public.meal_food to authenticated;
grant select on public.credit_transaction to authenticated;
grant select, insert on public.image_cache to authenticated;
revoke all on public.profile, public.meal, public.meal_food, public.credit_transaction, public.image_cache from anonymous;

-- Row-Level Security.
alter table public.profile enable row level security;
alter table public.meal enable row level security;
alter table public.meal_food enable row level security;
alter table public.credit_transaction enable row level security;
alter table public.image_cache enable row level security;

drop policy if exists profile_owner on public.profile;
create policy profile_owner on public.profile for all to authenticated
  using (user_id = (select auth.user_id()))
  with check (user_id = (select auth.user_id()));

drop policy if exists meal_owner on public.meal;
create policy meal_owner on public.meal for all to authenticated
  using (user_id = (select auth.user_id()))
  with check (user_id = (select auth.user_id()));

drop policy if exists meal_food_owner on public.meal_food;
create policy meal_food_owner on public.meal_food for all to authenticated
  using (exists (
    select 1 from public.meal m
    where m.id = meal_food.meal_id and m.user_id = (select auth.user_id())
  ))
  with check (exists (
    select 1 from public.meal m
    where m.id = meal_food.meal_id and m.user_id = (select auth.user_id())
  ));

drop policy if exists credit_tx_select_own on public.credit_transaction;
create policy credit_tx_select_own on public.credit_transaction for select to authenticated
  using (user_id = (select auth.user_id()));

-- No insert policy: every ledger write goes through a security-definer function
-- (claim_free_credits, spend_credit).

drop policy if exists image_cache_read on public.image_cache;
create policy image_cache_read on public.image_cache for select to authenticated
  using (expires_at > now());

drop policy if exists image_cache_insert on public.image_cache;
create policy image_cache_insert on public.image_cache for insert to authenticated
  with check (true);

-- Grants the 4 free monthly credits once per calendar month. Call via POST /rpc/claim_free_credits.
create or replace function public.claim_free_credits() returns integer
language plpgsql security definer set search_path = public as $$
declare
  uid text := auth.user_id();
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

  insert into credit_transaction (user_id, amount, type) values (uid, 4, 'free');
  return 4;
end $$;

revoke all on function public.claim_free_credits() from public, anonymous;
grant execute on function public.claim_free_credits() to authenticated;

commit;

-- Tell the Data API to reload its schema cache.
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Tracking: meal types, weight check-ins (with optional progress photo),
-- daily habits (water / workout) and the stats behind streaks and XP.
-- ---------------------------------------------------------------------------
begin;

alter table public.meal add column if not exists meal_type text
  check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack'));

-- Weight check-ins. The latest one is mirrored into profile.weight by the app.
create table if not exists public.weight_log (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default auth.user_id(),
  weight_kg numeric not null check (weight_kg between 20 and 400),
  photo_key text,
  logged_at timestamptz not null default now()
);
create index if not exists weight_log_user_logged_idx on public.weight_log (user_id, logged_at desc);

-- Seed history for profiles created before weight_log existed: their onboarding weight.
insert into public.weight_log (user_id, weight_kg, logged_at)
select p.user_id, p.weight, p.created_at from public.profile p
where p.weight is not null
  and not exists (select 1 from public.weight_log w where w.user_id = p.user_id);

-- One row per user, local day and habit; amount is ml of water or 1 for a completed workout.
create table if not exists public.habit_log (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default auth.user_id(),
  day date not null,
  habit text not null check (habit in ('water', 'workout')),
  amount numeric not null default 0 check (amount >= 0),
  updated_at timestamptz not null default now(),
  unique (user_id, day, habit)
);

grant select, insert, update, delete on public.weight_log, public.habit_log to authenticated;
revoke all on public.weight_log, public.habit_log from anonymous;

alter table public.weight_log enable row level security;
alter table public.habit_log enable row level security;

drop policy if exists weight_log_owner on public.weight_log;
create policy weight_log_owner on public.weight_log for all to authenticated
  using (user_id = (select auth.user_id()))
  with check (user_id = (select auth.user_id()));

drop policy if exists habit_log_owner on public.habit_log;
create policy habit_log_owner on public.habit_log for all to authenticated
  using (user_id = (select auth.user_id()))
  with check (user_id = (select auth.user_id()));

-- Streaks and XP for the signed-in user, with days counted in the caller's time zone.
-- A day counts towards the streak when at least one meal was logged.
-- XP: 10 per meal, 50 per day within 10% of the calorie target, 20 per weight
-- check-in, 25 per workout. Each level takes 1000 XP. Call via POST /rpc/user_stats.
-- Security definer because `authenticated` can't use the auth schema directly; every
-- query below is filtered to the caller's own user id.
create or replace function public.user_stats(tz text default 'UTC') returns json
language sql stable security definer set search_path = public as $$
  with me as (
    select auth.user_id() as uid,
           (now() at time zone tz)::date as today
  ),
  target as (
    select p.daily_calorie_target as kcal from profile p, me where p.user_id = me.uid
  ),
  meal_days as (
    select (m.created_at at time zone tz)::date as d,
           count(*) as meals,
           sum(coalesce((m.analysis_json->>'calories')::numeric, 0)) as kcal
    from meal m, me
    where m.user_id = me.uid and not m.is_deleted
    group by 1
  ),
  runs as (
    select min(d) as first_day, max(d) as last_day, count(*) as len
    from (select d, d - (row_number() over (order by d))::int as grp from meal_days) g
    group by grp
  ),
  totals as (
    select
      coalesce((select sum(meals) from meal_days), 0) as meals,
      coalesce((select count(*) from meal_days md, target t
                where t.kcal > 0 and md.kcal between t.kcal * 0.9 and t.kcal * 1.1), 0) as days_on_target,
      (select count(*) from weight_log w, me where w.user_id = me.uid) as weigh_ins,
      (select count(*) from habit_log h, me
        where h.user_id = me.uid and h.habit = 'workout' and h.amount > 0) as workouts
  )
  select json_build_object(
    'current_streak', coalesce((select len from runs, me where last_day >= me.today - 1), 0),
    'best_streak', coalesce((select max(len) from runs), 0),
    'logged_today', exists (select 1 from meal_days, me where d = me.today),
    'days_logged', (select count(*) from meal_days),
    'meals_logged', t.meals,
    'days_on_target', t.days_on_target,
    'weigh_ins', t.weigh_ins,
    'workouts', t.workouts,
    'xp', t.meals * 10 + t.days_on_target * 50 + t.weigh_ins * 20 + t.workouts * 25
  )
  from totals t
$$;

revoke all on function public.user_stats(text) from public, anonymous;
grant execute on function public.user_stats(text) to authenticated;

commit;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Credits are enforced server-side: /api/analyze-meal checks the balance before running
-- the AI and spends a credit only when the analysis succeeds. Clients can no longer write
-- the ledger directly.
-- ---------------------------------------------------------------------------
begin;

drop policy if exists credit_tx_insert_spend on public.credit_transaction;
revoke insert on public.credit_transaction from authenticated;

-- The caller's balance (sum of the ledger).
create or replace function public.credit_balance() returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0)::integer from credit_transaction
  where user_id = auth.user_id()
$$;

-- Spends one credit if the caller has one. Returns the new balance, or -1 when the
-- balance is empty (nothing is written then).
create or replace function public.spend_credit(reference text default null) returns integer
language plpgsql security definer set search_path = public as $$
declare
  uid text := auth.user_id();
  balance integer;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtext(uid));
  select coalesce(sum(amount), 0) into balance from credit_transaction where user_id = uid;
  if balance < 1 then
    return -1;
  end if;

  insert into credit_transaction (user_id, amount, type, reference_id) values (uid, -1, 'used', reference);
  return balance - 1;
end $$;

revoke all on function public.credit_balance(), public.spend_credit(text) from public, anonymous;
grant execute on function public.credit_balance(), public.spend_credit(text) to authenticated;

-- Server-only variant for /api/analyze-meal, which spends the credit after the analysis
-- finishes: by then the user's 60-second Clerk token may have expired, so the server calls
-- this with the user id it verified at the start. Not callable through the Data API.
create or replace function public.spend_credit_for(uid text, reference text default null) returns integer
language plpgsql set search_path = public as $$
declare
  balance integer;
begin
  perform pg_advisory_xact_lock(hashtext(uid));
  select coalesce(sum(amount), 0) into balance from credit_transaction where user_id = uid;
  if balance < 1 then
    return -1;
  end if;

  insert into credit_transaction (user_id, amount, type, reference_id) values (uid, -1, 'used', reference);
  return balance - 1;
end $$;

revoke all on function public.spend_credit_for(text, text) from public, anonymous, authenticated;

commit;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Marketing: consent lives on the profile; marketing_contacts is the export for
-- campaigns. Emails come from public.app_user (synced from Clerk).
-- ---------------------------------------------------------------------------
begin;

alter table public.profile add column if not exists marketing_opt_in boolean not null default false;
alter table public.profile add column if not exists marketing_opt_in_at timestamptz;

-- Records when consent was given (and clears it when withdrawn), so it can't be faked
-- from the client.
create or replace function public.set_marketing_opt_in_at() returns trigger
language plpgsql as $$
begin
  if new.marketing_opt_in and (tg_op = 'INSERT' or not old.marketing_opt_in) then
    new.marketing_opt_in_at := now();
  elsif not new.marketing_opt_in then
    new.marketing_opt_in_at := null;
  elsif tg_op = 'UPDATE' then
    new.marketing_opt_in_at := old.marketing_opt_in_at;
  end if;
  return new;
end $$;

drop trigger if exists profile_marketing_opt_in on public.profile;
create trigger profile_marketing_opt_in before insert or update on public.profile
  for each row execute function public.set_marketing_opt_in_at();

-- One row per user with what a campaign needs; filter on marketing_opt_in before
-- sending anything. Not exposed to the app: owner/admin access only.
drop view if exists public.marketing_contacts;
create view public.marketing_contacts as
select
  u.id as user_id,
  u.email,
  nullif(concat_ws(' ', u.first_name, u.last_name), '') as name,
  u.email_verified,
  u.created_at as signed_up_at,
  array_to_string(u.sign_in_methods, ',') as sign_in_methods,
  coalesce(p.marketing_opt_in, false) as marketing_opt_in,
  p.marketing_opt_in_at,
  p.goal,
  p.gender,
  p.age,
  p.activity_level,
  p.daily_calorie_target,
  (p.user_id is not null) as completed_onboarding,
  m.meals_logged,
  m.last_meal_at,
  u.last_seen_at
from public.app_user u
left join public.profile p on p.user_id = u.id
left join lateral (
  select count(*) as meals_logged, max(created_at) as last_meal_at
  from public.meal where user_id = u.id and not is_deleted
) m on true;

revoke all on public.marketing_contacts from public, anonymous, authenticated;

commit;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- In-app purchases (RevenueCat): scan packs are granted by the server after it verifies
-- the purchase with RevenueCat, keyed by store transaction so each is credited once.
-- reference_id is 'rc:<store transaction id>' for a purchase and 'rc-refund:<id>' for its refund.
-- ---------------------------------------------------------------------------
begin;

drop index if exists public.credit_tx_purchase_ref_idx;
create unique index if not exists credit_tx_store_ref_idx
  on public.credit_transaction (reference_id)
  where reference_id like 'rc:%' or reference_id like 'rc-refund:%';

commit;

-- ---------------------------------------------------------------------------
-- Terms: onboarding requires agreeing to the Terms of Use and Privacy Policy.
-- ---------------------------------------------------------------------------
begin;

alter table public.profile add column if not exists terms_version text;
alter table public.profile add column if not exists terms_accepted_at timestamptz;

-- Stamped by the database whenever the accepted version changes, so it can't be backdated
-- from the client.
create or replace function public.set_terms_accepted_at() returns trigger
language plpgsql as $$
begin
  if new.terms_version is null then
    new.terms_accepted_at := null;
  elsif tg_op = 'INSERT' or new.terms_version is distinct from old.terms_version then
    new.terms_accepted_at := now();
  else
    new.terms_accepted_at := old.terms_accepted_at;
  end if;
  return new;
end $$;

drop trigger if exists profile_terms_accepted on public.profile;
create trigger profile_terms_accepted before insert or update on public.profile
  for each row execute function public.set_terms_accepted_at();

commit;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Free scans: one allowance per mailbox per month, surviving account deletion.
-- (Replaces claim_free_credits above.)
-- ---------------------------------------------------------------------------
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
