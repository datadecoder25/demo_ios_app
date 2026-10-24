-- Adds spend_credit_for (see db/schema.sql). Safe to re-run.
begin;

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
