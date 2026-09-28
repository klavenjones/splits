-- Step 5: live workout logging. The app keeps the active workout in SQLite and syncs the whole
-- workout (session, exercises, sets) through sync_workout, which is idempotent: re-sending the
-- same payload changes nothing. All functions run as the caller, so RLS applies.

-- A sync may renumber sets (delete set 2 of 4 → 3 and 4 become 2 and 3) in one statement order
-- that briefly duplicates a number; check uniqueness at commit instead.
alter table public.set_logs
  drop constraint set_logs_session_exercise_id_set_number_key,
  add constraint set_logs_session_exercise_id_set_number_key
    unique (session_exercise_id, set_number) deferrable initially deferred;

-- p = {session: {...}, exercises: [...], sets: [...]} (see src/local/syncPayload.ts).
-- Upserts the session and every row by id, and deletes this session's exercises and sets that
-- are no longer in the payload. Returns the server time of the sync.
create or replace function public.sync_workout(p jsonb)
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  s jsonb := p -> 'session';
  v_id uuid := (s ->> 'id')::uuid;
  v_status public.session_status := (s ->> 'status')::public.session_status;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if v_id is null or v_status not in ('in_progress', 'completed') then
    raise exception 'invalid workout' using errcode = '22023';
  end if;

  -- Another user's session with this id fails the update policy and raises.
  insert into public.sessions as t
    (id, user_id, template_id, kind, name, scheduled_date, status, started_at, ended_at, feel, notes)
  values (
    v_id, v_uid,
    -- A template deleted since the workout started is dropped, not an error.
    (select x.id from public.templates x where x.id = (s ->> 'template_id')::uuid),
    (s ->> 'kind')::public.workout_kind, s ->> 'name', (s ->> 'scheduled_date')::date, v_status,
    (s ->> 'started_at')::timestamptz, (s ->> 'ended_at')::timestamptz,
    s ->> 'feel', nullif(trim(s ->> 'notes'), '')
  )
  on conflict (id) do update set
    template_id = excluded.template_id, kind = excluded.kind, name = excluded.name,
    scheduled_date = excluded.scheduled_date, status = excluded.status,
    started_at = excluded.started_at, ended_at = excluded.ended_at,
    feel = excluded.feel, notes = excluded.notes;
  if not exists (select 1 from public.sessions where id = v_id and user_id = v_uid) then
    raise exception 'session not found' using errcode = '42501';
  end if;

  delete from public.session_exercises
  where session_id = v_id
    and id not in (select (e ->> 'id')::uuid from jsonb_array_elements(coalesce(p -> 'exercises', '[]')) e);

  insert into public.session_exercises as t
    (id, session_id, exercise_id, position, superset_group, rest_sec, notes, swapped_from_exercise_id)
  select (e ->> 'id')::uuid, v_id, (e ->> 'exercise_id')::uuid, (e ->> 'position')::int,
         (e ->> 'superset_group')::int, (e ->> 'rest_sec')::int, nullif(trim(e ->> 'notes'), ''),
         (e ->> 'swapped_from_exercise_id')::uuid
  from jsonb_array_elements(coalesce(p -> 'exercises', '[]')) e
  on conflict (id) do update set
    exercise_id = excluded.exercise_id, position = excluded.position,
    superset_group = excluded.superset_group, rest_sec = excluded.rest_sec,
    notes = excluded.notes, swapped_from_exercise_id = excluded.swapped_from_exercise_id
  where t.session_id = v_id;

  delete from public.set_logs l
  using public.session_exercises se
  where se.id = l.session_exercise_id and se.session_id = v_id
    and l.id not in (select (x ->> 'id')::uuid from jsonb_array_elements(coalesce(p -> 'sets', '[]')) x);

  -- Every set must belong to an exercise of this session.
  if exists (
    select 1 from jsonb_array_elements(coalesce(p -> 'sets', '[]')) x
    where not exists (
      select 1 from public.session_exercises se
      where se.id = (x ->> 'session_exercise_id')::uuid and se.session_id = v_id
    )
  ) then
    raise exception 'set without an exercise in this workout' using errcode = '22023';
  end if;

  insert into public.set_logs as t
    (id, session_exercise_id, set_number, set_type, weight_kg, reps, duration_s, distance_m, rpe, completed_at)
  select (x ->> 'id')::uuid, (x ->> 'session_exercise_id')::uuid, (x ->> 'set_number')::int,
         coalesce((x ->> 'set_type')::public.set_type, 'working'), (x ->> 'weight_kg')::numeric,
         (x ->> 'reps')::int, (x ->> 'duration_s')::int, (x ->> 'distance_m')::int,
         (x ->> 'rpe')::numeric, (x ->> 'completed_at')::timestamptz
  from jsonb_array_elements(coalesce(p -> 'sets', '[]')) x
  on conflict (id) do update set
    session_exercise_id = excluded.session_exercise_id, set_number = excluded.set_number,
    set_type = excluded.set_type, weight_kg = excluded.weight_kg, reps = excluded.reps,
    duration_s = excluded.duration_s, distance_m = excluded.distance_m, rpe = excluded.rpe,
    completed_at = excluded.completed_at;

  return now();
end;
$$;

-- Discards a started workout. A session started from a plan goes back to planned (its logged
-- rows are removed); an empty workout is deleted. Unknown ids are a no-op, so a retry is safe.
create or replace function public.discard_workout(p_id uuid, p_back_to_planned boolean)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p_back_to_planned then
    delete from public.session_exercises where session_id = p_id;
    update public.sessions
    set status = 'planned', started_at = null, ended_at = null, feel = null, notes = null
    where id = p_id;
  else
    delete from public.sessions where id = p_id;
  end if;
end;
$$;

-- "Previous" in the logger: for each exercise, the completed sets of the most recent completed
-- session that logged it. Null ids = every exercise the caller has logged.
create or replace function public.previous_sets(p_exercise_ids uuid[] default null)
returns table (
  exercise_id uuid, set_number int, set_type public.set_type, weight_kg numeric, reps int,
  performed_on date
)
language sql
stable
security invoker
set search_path = ''
as $$
  with last as (
    select distinct on (se.exercise_id) se.exercise_id, se.id as session_exercise_id, s.scheduled_date
    from public.session_exercises se
    join public.sessions s on s.id = se.session_id
    where s.user_id = auth.uid() and s.status = 'completed'
      and (p_exercise_ids is null or se.exercise_id = any (p_exercise_ids))
      and exists (
        select 1 from public.set_logs l where l.session_exercise_id = se.id and l.completed_at is not null
      )
    order by se.exercise_id, coalesce(s.ended_at, s.started_at) desc nulls last, se.position
  )
  select last.exercise_id, l.set_number, l.set_type, l.weight_kg, l.reps, last.scheduled_date
  from last
  join public.set_logs l on l.session_exercise_id = last.session_exercise_id
  where l.completed_at is not null
  order by last.exercise_id, l.set_number;
$$;

-- Best completed working set per exercise by estimated 1RM (Epley; 1 rep = the weight), for PRs.
create or replace function public.exercise_bests()
returns table (exercise_id uuid, e1rm_kg numeric, weight_kg numeric, reps int)
language sql
stable
security invoker
set search_path = ''
as $$
  select distinct on (se.exercise_id) se.exercise_id,
    case when l.reps = 1 then l.weight_kg else l.weight_kg * (1 + l.reps / 30.0) end,
    l.weight_kg, l.reps
  from public.set_logs l
  join public.session_exercises se on se.id = l.session_exercise_id
  join public.sessions s on s.id = se.session_id
  where s.user_id = auth.uid() and s.status = 'completed' and l.completed_at is not null
    and l.set_type <> 'warmup' and l.weight_kg > 0 and l.reps > 0
  order by se.exercise_id,
    case when l.reps = 1 then l.weight_kg else l.weight_kg * (1 + l.reps / 30.0) end desc;
$$;

revoke execute on function public.sync_workout(jsonb) from public, anon;
revoke execute on function public.discard_workout(uuid, boolean) from public, anon;
revoke execute on function public.previous_sets(uuid[]) from public, anon;
revoke execute on function public.exercise_bests() from public, anon;
grant execute on function public.sync_workout(jsonb) to authenticated;
grant execute on function public.discard_workout(uuid, boolean) to authenticated;
grant execute on function public.previous_sets(uuid[]) to authenticated;
grant execute on function public.exercise_bests() to authenticated;
