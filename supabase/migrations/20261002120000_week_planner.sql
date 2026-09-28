-- Step 4: plan sessions from templates and shift a week. Both run as the caller (security
-- invoker), so the RLS policies on templates and sessions apply.

-- Inserts one planned session per item ({template_id, scheduled_date}), copying name and kind
-- from the template so they can't drift. All or nothing; a template the caller can't see
-- raises P0002.
create or replace function public.plan_sessions(p_items jsonb)
returns setof uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_count int;
  v_found int;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'no sessions to plan' using errcode = '22023';
  end if;

  v_count := jsonb_array_length(p_items);
  select count(*) into v_found
  from jsonb_array_elements(p_items) i
  join public.templates t on t.id = (i ->> 'template_id')::uuid;
  if v_found <> v_count then
    raise exception 'template not found' using errcode = 'P0002';
  end if;

  return query
  insert into public.sessions (user_id, template_id, kind, name, scheduled_date, status)
  select v_uid, t.id, t.kind, t.name, (i ->> 'scheduled_date')::date, 'planned'
  from jsonb_array_elements(p_items) with ordinality as x (i, n)
  join public.templates t on t.id = (i ->> 'template_id')::uuid
  order by x.n
  returning id;
end;
$$;

-- "Shift the week": moves this planned session and every planned session dated after it
-- through that week's Sunday one day later (Sunday spills to next Monday). Other statuses
-- stay put. Returns how many sessions moved.
create or replace function public.shift_sessions(p_session_id uuid)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_date date;
  v_sunday date;
  v_moved int;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  select scheduled_date into v_date
  from public.sessions
  where id = p_session_id and status = 'planned';
  if v_date is null then
    raise exception 'planned session not found' using errcode = 'P0002';
  end if;

  -- isodow: Monday 1 … Sunday 7
  v_sunday := v_date + (7 - extract(isodow from v_date)::int);

  update public.sessions
  set scheduled_date = scheduled_date + 1
  where status = 'planned'
    and (id = p_session_id or (scheduled_date > v_date and scheduled_date <= v_sunday));
  get diagnostics v_moved = row_count;
  return v_moved;
end;
$$;

revoke execute on function public.plan_sessions(jsonb) from public, anon;
revoke execute on function public.shift_sessions(uuid) from public, anon;
grant execute on function public.plan_sessions(jsonb) to authenticated;
grant execute on function public.shift_sessions(uuid) to authenticated;
