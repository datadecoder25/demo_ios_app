-- Records agreement to the Terms of Use and Privacy Policy (see db/schema.sql). Safe to re-run.
-- After applying, refresh the Data API schema cache or writes fail with PGRST204 (the notify
-- below isn't picked up by Neon's Data API):
--   npx neonctl data-api refresh-schema --project-id <id> --database neondb
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
