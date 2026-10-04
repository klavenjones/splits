-- Reset training data ("start from scratch"). Deletes every one of the caller's sessions
-- (completed, skipped, in progress and planned). Their exercises, sets, run logs and splits go
-- with them (on delete cascade), and PRs, bests and progress are derived from sessions, so they
-- clear too. Templates, custom exercises, nutrition and body data, targets and the profile stay.
-- Returns how many sessions were deleted. Safe to repeat.
create or replace function public.reset_training()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  n integer;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  delete from public.sessions where user_id = auth.uid();
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.reset_training() from public, anon;
grant execute on function public.reset_training() to authenticated;
