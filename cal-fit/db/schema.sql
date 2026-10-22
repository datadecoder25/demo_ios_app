-- CalFit schema for Neon Postgres + Neon Auth + Data API.
-- Users live in neon_auth."user" (managed by Neon Auth); every row here is owned by one of them.
-- Row-Level Security enforces ownership via auth.user_id(), which reads the `sub` claim of the
-- JWT the app sends to the Data API.

begin;

-- Profile: one per user.
create table if not exists public.profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default (auth.user_id())::uuid
    references neon_auth."user"(id) on delete cascade,
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
  user_id uuid not null default (auth.user_id())::uuid
    references neon_auth."user"(id) on delete cascade,
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
  user_id uuid not null default (auth.user_id())::uuid
    references neon_auth."user"(id) on delete cascade,
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
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profile, public.meal, public.meal_food to authenticated;
grant select, insert on public.credit_transaction, public.image_cache to authenticated;
revoke all on public.profile, public.meal, public.meal_food, public.credit_transaction, public.image_cache from anonymous;

-- Row-Level Security.
alter table public.profile enable row level security;
alter table public.meal enable row level security;
alter table public.meal_food enable row level security;
alter table public.credit_transaction enable row level security;
alter table public.image_cache enable row level security;

drop policy if exists profile_owner on public.profile;
create policy profile_owner on public.profile for all to authenticated
  using (user_id = (select auth.user_id())::uuid)
  with check (user_id = (select auth.user_id())::uuid);

drop policy if exists meal_owner on public.meal;
create policy meal_owner on public.meal for all to authenticated
  using (user_id = (select auth.user_id())::uuid)
  with check (user_id = (select auth.user_id())::uuid);

drop policy if exists meal_food_owner on public.meal_food;
create policy meal_food_owner on public.meal_food for all to authenticated
  using (exists (
    select 1 from public.meal m
    where m.id = meal_food.meal_id and m.user_id = (select auth.user_id())::uuid
  ))
  with check (exists (
    select 1 from public.meal m
    where m.id = meal_food.meal_id and m.user_id = (select auth.user_id())::uuid
  ));

drop policy if exists credit_tx_select_own on public.credit_transaction;
create policy credit_tx_select_own on public.credit_transaction for select to authenticated
  using (user_id = (select auth.user_id())::uuid);

-- Users may only spend credits; free/purchase grants go through security-definer functions.
drop policy if exists credit_tx_insert_spend on public.credit_transaction;
create policy credit_tx_insert_spend on public.credit_transaction for insert to authenticated
  with check (user_id = (select auth.user_id())::uuid and type = 'used' and amount < 0);

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
  uid uuid := (auth.user_id())::uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtext(uid::text));

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
