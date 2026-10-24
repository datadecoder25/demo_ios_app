-- One-time migration: Neon Auth (uuid user ids) → Clerk (text user ids like 'user_2ab…').
-- Run once against a database created by the Neon Auth version of db/schema.sql, then apply
-- db/schema.sql. Existing rows keep their old uuid (as text) until /api/me links them to the
-- matching Clerk user by verified email.

begin;

-- Policies and the view reference user_id, so they must go before its type can change;
-- db/schema.sql recreates them.
drop view if exists public.marketing_contacts;

do $$
declare
  pol record;
  t text;
  fk record;
begin
  for pol in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('profile', 'meal', 'meal_food', 'credit_transaction', 'weight_log', 'habit_log')
  loop
    execute format('drop policy %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;

  foreach t in array array['profile', 'meal', 'credit_transaction', 'weight_log', 'habit_log'] loop
    -- Drop the foreign key to neon_auth."user".
    for fk in
      select con.conname from pg_constraint con
      where con.conrelid = format('public.%I', t)::regclass
        and con.contype = 'f'
        and con.confrelid = 'neon_auth."user"'::regclass
    loop
      execute format('alter table public.%I drop constraint %I', t, fk.conname);
    end loop;

    if (select data_type from information_schema.columns
        where table_schema = 'public' and table_name = t and column_name = 'user_id') = 'uuid' then
      execute format('alter table public.%I alter column user_id drop default', t);
      execute format('alter table public.%I alter column user_id type text using user_id::text', t);
    end if;
    execute format('alter table public.%I alter column user_id set default auth.user_id()', t);
  end loop;
end $$;

-- Functions whose signatures/bodies used uuid ids are replaced by db/schema.sql.

commit;
