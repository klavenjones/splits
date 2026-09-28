-- Step 6: runs and weight imported from Apple Health. The phone reads HealthKit and sends one
-- run at a time; matching to the plan happens here, in one transaction. All functions run as
-- the caller (security invoker), so RLS applies.

-- How an imported run relates to the plan (docs/data-model.md → run_logs).
alter table public.run_logs
  add column match text not null default 'auto'
    check (match in ('auto', 'linked', 'needs_match', 'extra')),
  -- Imported rows always carry the source's id, so (source, external_id) blocks a re-import.
  add constraint run_logs_external_id_check check (source = 'manual' or external_id is not null);

create index run_logs_match_idx on public.run_logs (match) where match = 'needs_match';

-- Copies a run log (with its splits) onto another session. The old log must already be gone,
-- since (source, external_id) is unique.
create or replace function public._put_run_log(p_session uuid, p_log jsonb, p_splits jsonb, p_match text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.run_logs
    (session_id, source, external_id, started_at, distance_m, duration_s, avg_pace_s_per_km,
     avg_hr, max_hr, elevation_gain_m, route_polyline, match)
  values (
    p_session, (p_log ->> 'source')::public.run_source, p_log ->> 'external_id',
    (p_log ->> 'started_at')::timestamptz, (p_log ->> 'distance_m')::int,
    (p_log ->> 'duration_s')::int, (p_log ->> 'avg_pace_s_per_km')::int,
    (p_log ->> 'avg_hr')::int, (p_log ->> 'max_hr')::int, (p_log ->> 'elevation_gain_m')::int,
    p_log ->> 'route_polyline', p_match
  );
  insert into public.run_splits (run_log_id, split_index, distance_m, duration_s, avg_hr)
  select p_session, (x ->> 'split_index')::int, (x ->> 'distance_m')::int,
         (x ->> 'duration_s')::int, (x ->> 'avg_hr')::int
  from jsonb_array_elements(coalesce(p_splits, '[]')) x;
end;
$$;

-- p = {external_id, started_at, ended_at, local_date, distance_m, duration_s, avg_hr, max_hr,
--      elevation_gain_m, recent, splits: [{split_index, distance_m, duration_s, avg_hr}]}
-- (see src/health/importer.ts). Idempotent: a run already imported returns its session.
-- Otherwise it completes the same-day planned run with no run yet (closest estimated distance
-- first), or creates an unplanned run session: needs_match when recent, else extra.
-- Returns {session_id, match, created}.
create or replace function public.import_run(p jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_ext text := p ->> 'external_id';
  v_date date := (p ->> 'local_date')::date;
  v_start timestamptz := (p ->> 'started_at')::timestamptz;
  v_end timestamptz := (p ->> 'ended_at')::timestamptz;
  v_dist int := (p ->> 'distance_m')::int;
  v_dur int := (p ->> 'duration_s')::int;
  v_session uuid;
  v_match text;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if v_ext is null or v_date is null or v_start is null or v_dist is null or v_dur is null then
    raise exception 'invalid run' using errcode = '22023';
  end if;

  select l.session_id, l.match into v_session, v_match
  from public.run_logs l
  where l.source = 'apple_health' and l.external_id = v_ext;
  if found then
    return jsonb_build_object('session_id', v_session, 'match', v_match, 'created', false);
  end if;

  select s.id into v_session
  from public.sessions s
  left join public.templates t on t.id = s.template_id
  where s.user_id = v_uid and s.kind = 'run' and s.status = 'planned'
    and s.scheduled_date = v_date
    and not exists (select 1 from public.run_logs l where l.session_id = s.id)
  order by abs(coalesce(t.est_distance_m, v_dist) - v_dist), s.created_at, s.id
  limit 1
  for update of s skip locked;

  if v_session is not null then
    v_match := 'auto';
    update public.sessions
    set status = 'completed', started_at = v_start, ended_at = v_end, skip_reason = null
    where id = v_session;
  else
    v_match := case when coalesce((p ->> 'recent')::boolean, false) then 'needs_match' else 'extra' end;
    insert into public.sessions (user_id, template_id, kind, name, scheduled_date, status, started_at, ended_at)
    values (v_uid, null, 'run', 'run', v_date, 'completed', v_start, v_end)
    returning id into v_session;
  end if;

  perform public._put_run_log(
    v_session,
    jsonb_build_object(
      'source', 'apple_health', 'external_id', v_ext, 'started_at', v_start,
      'distance_m', v_dist, 'duration_s', v_dur,
      'avg_pace_s_per_km', case when v_dist > 0 and v_dur > 0 then round(v_dur * 1000.0 / v_dist) end,
      'avg_hr', p -> 'avg_hr', 'max_hr', p -> 'max_hr', 'elevation_gain_m', p -> 'elevation_gain_m'
    ),
    p -> 'splits',
    v_match
  );
  return jsonb_build_object('session_id', v_session, 'match', v_match, 'created', true);
end;
$$;

-- Moves the run on session p_run onto the planned run p_target (match = linked), or, with a
-- null target, keeps it as an extra run. A planned session the run leaves goes back to planned;
-- an unplanned one is deleted. Returns the session that now holds the run.
create or replace function public.link_run(p_run uuid, p_target uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_log public.run_logs;
  v_old public.sessions;
  v_target public.sessions;
  v_splits jsonb;
  v_new uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select * into v_log from public.run_logs where session_id = p_run;
  if not found then
    raise exception 'run not found' using errcode = '42501';
  end if;
  select * into v_old from public.sessions where id = p_run for update;

  -- Keep as an extra run.
  if p_target is null then
    if v_old.template_id is null then
      update public.run_logs set match = 'extra' where session_id = p_run;
      return p_run;
    end if;
    insert into public.sessions (user_id, template_id, kind, name, scheduled_date, status, started_at, ended_at)
    values (v_old.user_id, null, 'run', 'run', v_old.scheduled_date, 'completed', v_old.started_at, v_old.ended_at)
    returning id into v_new;
  else
    if p_target = p_run then
      return p_run;
    end if;
    select * into v_target from public.sessions where id = p_target for update;
    if not found then
      raise exception 'session not found' using errcode = '42501';
    end if;
    if v_target.kind <> 'run' or v_target.status <> 'planned'
       or exists (select 1 from public.run_logs where session_id = p_target) then
      raise exception 'that session can''t take a run' using errcode = '22023';
    end if;
    v_new := p_target;
    update public.sessions
    set status = 'completed', started_at = v_old.started_at, ended_at = v_old.ended_at, skip_reason = null
    where id = p_target;
  end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.split_index), '[]') into v_splits
  from public.run_splits x where x.run_log_id = p_run;
  delete from public.run_logs where session_id = p_run;
  perform public._put_run_log(
    v_new, to_jsonb(v_log), v_splits, case when p_target is null then 'extra' else 'linked' end
  );

  if v_old.template_id is null then
    delete from public.sessions where id = p_run;
  else
    update public.sessions set status = 'planned', started_at = null, ended_at = null where id = p_run;
  end if;
  return v_new;
end;
$$;

-- A workout deleted from Apple Health: its planned session goes back to planned, an unplanned
-- one is deleted. Returns whether anything was removed.
create or replace function public.remove_imported_run(p_external_id text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session public.sessions;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select s.* into v_session
  from public.run_logs l join public.sessions s on s.id = l.session_id
  where l.source = 'apple_health' and l.external_id = p_external_id;
  if not found then
    return false;
  end if;
  if v_session.template_id is null then
    delete from public.sessions where id = v_session.id;
  else
    delete from public.run_logs where session_id = v_session.id;
    update public.sessions set status = 'planned', started_at = null, ended_at = null
    where id = v_session.id;
  end if;
  return true;
end;
$$;

-- p = [{date, kg}]: one Apple Health weight per day. Never overwrites a manual weigh-in.
-- Returns how many days were written.
create or replace function public.import_body_mass(p jsonb)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_count int;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if jsonb_typeof(p) is distinct from 'array' then
    raise exception 'invalid weights' using errcode = '22023';
  end if;
  insert into public.body_checkins as b (user_id, checkin_date, weight_kg, source)
  select v_uid, (x ->> 'date')::date, round((x ->> 'kg')::numeric, 2), 'apple_health'
  from jsonb_array_elements(p) x
  where (x ->> 'kg')::numeric > 0
  on conflict (user_id, checkin_date) do update
    set weight_kg = excluded.weight_kg
    where b.source = 'apple_health';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- The helper runs as the caller too (so RLS still applies); the callers need execute on it.
revoke execute on function public._put_run_log(uuid, jsonb, jsonb, text) from public, anon;
grant execute on function public._put_run_log(uuid, jsonb, jsonb, text) to authenticated;
revoke execute on function public.import_run(jsonb) from public, anon;
revoke execute on function public.link_run(uuid, uuid) from public, anon;
revoke execute on function public.remove_imported_run(text) from public, anon;
revoke execute on function public.import_body_mass(jsonb) from public, anon;
grant execute on function public.import_run(jsonb) to authenticated;
grant execute on function public.link_run(uuid, uuid) to authenticated;
grant execute on function public.remove_imported_run(text) to authenticated;
grant execute on function public.import_body_mass(jsonb) to authenticated;
