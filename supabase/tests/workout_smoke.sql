-- Workout logging smoke test. Run as postgres (SQL editor, or `npx supabase db query --linked -f`).
-- One transaction, rolled back. Raises an exception on the first failure.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000005a1', 'logger-a@example.test'),
  ('00000000-0000-0000-0000-0000000005b1', 'logger-b@example.test');

create temporary table smoke (k text primary key, v uuid) on commit drop;
create temporary table payload (k text primary key, v jsonb) on commit drop;
grant all on smoke, payload to authenticated;
insert into smoke
select 'ex' || n, id from (
  select id, row_number() over (order by name) n from public.exercises where owner_id is null limit 2
) e;
insert into smoke values
  ('s1', '00000000-0000-0000-0000-00000000a001'),
  ('e1', '00000000-0000-0000-0000-00000000b001'),
  ('e2', '00000000-0000-0000-0000-00000000b002'),
  ('l1', '00000000-0000-0000-0000-00000000c001'),
  ('l2', '00000000-0000-0000-0000-00000000c002'),
  ('l3', '00000000-0000-0000-0000-00000000c003'),
  ('l4', '00000000-0000-0000-0000-00000000c004');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005a1","role":"authenticated"}', true);

-- A plans upper A for today, then starts it: the planned id becomes the workout.
insert into smoke select 'tpl', public.save_template(null, 'upper A', 'lift', null, 2700, null,
  jsonb_build_array(jsonb_build_object('exercise_id', (select v from smoke where k = 'ex1'),
    'target_sets', 3, 'rep_min', 8, 'rep_max', 10, 'rest_sec', 120)), null);
insert into smoke select 'planned', id from public.plan_sessions(jsonb_build_array(
  jsonb_build_object('template_id', (select v from smoke where k = 'tpl'), 'scheduled_date', '2026-10-05'))) id;

-- In progress: exercise 1 with 3 sets (two done), exercise 2 with 1 set.
insert into payload select 'p1', jsonb_build_object(
  'session', jsonb_build_object('id', (select v from smoke where k = 'planned'),
    'template_id', (select v from smoke where k = 'tpl'), 'kind', 'lift', 'name', 'upper A',
    'scheduled_date', '2026-10-05', 'status', 'in_progress', 'started_at', '2026-10-05T17:00:00Z'),
  'exercises', jsonb_build_array(
    jsonb_build_object('id', (select v from smoke where k = 'e1'), 'exercise_id', (select v from smoke where k = 'ex1'),
      'position', 0, 'rest_sec', 120),
    jsonb_build_object('id', (select v from smoke where k = 'e2'), 'exercise_id', (select v from smoke where k = 'ex2'),
      'position', 1, 'rest_sec', 90)),
  'sets', jsonb_build_array(
    jsonb_build_object('id', (select v from smoke where k = 'l1'), 'session_exercise_id', (select v from smoke where k = 'e1'),
      'set_number', 1, 'weight_kg', 80, 'reps', 8, 'completed_at', '2026-10-05T17:05:00Z'),
    jsonb_build_object('id', (select v from smoke where k = 'l2'), 'session_exercise_id', (select v from smoke where k = 'e1'),
      'set_number', 2, 'weight_kg', 80, 'reps', 8, 'completed_at', '2026-10-05T17:08:00Z'),
    jsonb_build_object('id', (select v from smoke where k = 'l3'), 'session_exercise_id', (select v from smoke where k = 'e1'),
      'set_number', 3, 'weight_kg', 80, 'reps', 8),
    jsonb_build_object('id', (select v from smoke where k = 'l4'), 'session_exercise_id', (select v from smoke where k = 'e2'),
      'set_number', 1, 'weight_kg', 20, 'reps', 12)));

select public.sync_workout((select v from payload where k = 'p1'));
select public.sync_workout((select v from payload where k = 'p1')); -- identical re-send

do $$
declare sid uuid := (select v from smoke where k = 'planned');
begin
  if (select count(*) from public.sessions) <> 1
     or (select status from public.sessions where id = sid) <> 'in_progress'
     or (select count(*) from public.session_exercises where session_id = sid) <> 2
     or (select count(*) from public.set_logs) <> 4 then
    raise exception 're-sync was not idempotent';
  end if;
end $$;

-- Finish: set 2 deleted (set 3 renumbered to 2 and completed), exercise 2 removed, feel + notes.
update payload set v = jsonb_set(jsonb_set(jsonb_set(v,
    '{session}', v -> 'session' || '{"status":"completed","ended_at":"2026-10-05T17:50:00Z","feel":"solid","notes":" good "}'),
    '{exercises}', jsonb_build_array(v -> 'exercises' -> 0)),
    '{sets}', jsonb_build_array(v -> 'sets' -> 0,
      (v -> 'sets' -> 2) || '{"set_number":2,"completed_at":"2026-10-05T17:12:00Z","reps":7}'))
where k = 'p1';
select public.sync_workout((select v from payload where k = 'p1'));

do $$
declare sid uuid := (select v from smoke where k = 'planned');
begin
  if (select status || ':' || feel || ':' || notes from public.sessions where id = sid) <> 'completed:solid:good'
     or (select count(*) from public.session_exercises where session_id = sid) <> 1
     or (select array_agg(set_number || 'x' || reps order by set_number) from public.set_logs) <> array['1x8', '2x7'] then
    raise exception 'finish sync wrong';
  end if;
  if (select array_agg(set_number || ':' || reps order by set_number) from public.previous_sets(null)) <> array['1:8', '2:7']
     or (select round(e1rm_kg, 2) from public.exercise_bests()) <> 101.33 then
    raise exception 'previous_sets / exercise_bests wrong';
  end if;
  begin
    perform public.sync_workout(jsonb_build_object('session', jsonb_build_object('id', sid, 'status', 'planned')));
    raise exception 'planned status was accepted';
  exception when invalid_parameter_value then null;
  end;
end $$;

-- B can't read A's history, overwrite A's workout, or discard it.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005b1","role":"authenticated"}', true);
do $$
begin
  if exists (select 1 from public.previous_sets(null)) or exists (select 1 from public.exercise_bests())
     or exists (select 1 from public.set_logs) then
    raise exception 'B can read A''s sets';
  end if;
  begin
    perform public.sync_workout((select v from payload where k = 'p1'));
    raise exception 'B synced into A''s workout';
  exception when insufficient_privilege then null;
  end;
  perform public.discard_workout((select v from smoke where k = 'planned'), false);
end $$;

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005a1","role":"authenticated"}', true);
do $$
declare sid uuid := (select v from smoke where k = 'planned');
begin
  if (select count(*) from public.set_logs) <> 2 or not exists (select 1 from public.sessions where id = sid) then
    raise exception 'B changed A''s workout';
  end if;
  -- Discarding a started planned session puts it back on the plan, empty.
  perform public.discard_workout(sid, true);
  if (select status from public.sessions where id = sid) <> 'planned'
     or exists (select 1 from public.session_exercises where session_id = sid)
     or exists (select 1 from public.set_logs) then
    raise exception 'discard back to planned wrong';
  end if;
  perform public.discard_workout(sid, false);
  if exists (select 1 from public.sessions where id = sid) then
    raise exception 'discard delete wrong';
  end if;
end $$;

reset role;
select 'workout smoke test passed' as result;
rollback;
