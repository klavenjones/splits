-- Progress smoke test. Run as postgres (SQL editor, or `npx supabase db query --linked -f`).
-- One transaction, rolled back. Raises an exception on the first failure.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000007a1', 'progress-a@example.test'),
  ('00000000-0000-0000-0000-0000000007b1', 'progress-b@example.test');

create temporary table smoke (k text primary key, v uuid) on commit drop;
grant all on smoke to authenticated;
insert into smoke
select 'ex' || n, id from (
  select id, row_number() over (order by name) n from public.exercises where owner_id is null limit 2
) e;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000007a1","role":"authenticated"}', true);

-- Three completed workouts of ex1 a week apart (the first also has ex2), logged with sync_workout.
-- sets: [set_type, weight_kg, reps, done]
create or replace function pg_temp.workout(p_date date, p_sets jsonb, p_ex text default 'ex1')
returns uuid language plpgsql as $$
declare
  sid uuid := gen_random_uuid();
  eid uuid := gen_random_uuid();
begin
  perform public.sync_workout(jsonb_build_object(
    'session', jsonb_build_object('id', sid, 'kind', 'lift', 'name', 'upper A', 'scheduled_date', p_date,
      'status', 'completed', 'started_at', p_date + time '17:00', 'ended_at', p_date + time '18:00'),
    'exercises', jsonb_build_array(jsonb_build_object('id', eid,
      'exercise_id', (select v from smoke where k = p_ex), 'position', 0, 'rest_sec', 120)),
    'sets', (select jsonb_agg(jsonb_build_object('id', gen_random_uuid(), 'session_exercise_id', eid,
        'set_number', n, 'set_type', x ->> 0, 'weight_kg', (x ->> 1)::numeric, 'reps', (x ->> 2)::int,
        'completed_at', case when (x ->> 3)::boolean then p_date + time '17:30' end))
      from jsonb_array_elements(p_sets) with ordinality as t (x, n))));
  return sid;
end $$;

insert into smoke values
  ('w1', pg_temp.workout('2026-09-07', '[["warmup",100,5,true],["working",80,8,true],["working",80,8,true],["working",90,8,false]]')),
  ('w2', pg_temp.workout('2026-09-14', '[["working",80,10,true],["working",80,9,true]]')),
  ('w3', pg_temp.workout('2026-09-21', '[["working",75,8,true]]')),
  ('bw', pg_temp.workout('2026-09-21', '[["working",0,12,true],["working",0,15,true]]', 'ex2'));

do $$
declare
  r record;
  n int;
begin
  -- From Sep 14: w1 is left out, but it's still the baseline for w2.
  select count(*) into n from public.exercise_session_bests('2026-09-14');
  if n <> 3 then raise exception 'expected 3 rows from Sep 14, got %', n; end if;

  select * into r from public.exercise_session_bests('2026-09-14', (select v from smoke where k = 'ex1'))
  where session_id = (select v from smoke where k = 'w2');
  -- 80 × 10 → 106.67 beats 80 × 8 → 101.33
  if r.best_weight_kg <> 80 or r.best_reps <> 10 or r.best_e1rm_kg <> 106.67
     or r.prev_best_e1rm_kg <> 101.33 or r.volume_kg <> 1520 or r.working_sets <> 2 then
    raise exception 'w2 bests wrong: %', r;
  end if;

  select * into r from public.exercise_session_bests('2000-01-01', (select v from smoke where k = 'ex1'))
  where session_id = (select v from smoke where k = 'w1');
  -- Warm-up 100 × 5 and the unfinished 90 × 8 don't count; the first session has no baseline.
  if r.best_e1rm_kg <> 101.33 or r.volume_kg <> 1280 or r.prev_best_e1rm_kg is not null then
    raise exception 'w1 bests wrong: %', r;
  end if;

  select * into r from public.exercise_session_bests('2000-01-01', (select v from smoke where k = 'ex1'))
  where session_id = (select v from smoke where k = 'w3');
  if r.prev_best_e1rm_kg <> 106.67 or r.best_e1rm_kg >= r.prev_best_e1rm_kg then
    raise exception 'w3 should not be a PR: %', r;
  end if;

  -- Bodyweight: no e1RM, best set by reps, reps totalled.
  select * into r from public.exercise_session_bests('2000-01-01', (select v from smoke where k = 'ex2'));
  if r.best_e1rm_kg <> 0 or r.best_reps <> 15 or r.total_reps <> 27 or r.volume_kg <> 0 then
    raise exception 'bodyweight bests wrong: %', r;
  end if;

  -- History: newest first, completed sets only (warm-up kept and marked), limited.
  if (select array_agg(session_id) from public.exercise_history((select v from smoke where k = 'ex1')))
     <> array[(select v from smoke where k = 'w3'), (select v from smoke where k = 'w2'), (select v from smoke where k = 'w1')] then
    raise exception 'history order wrong';
  end if;
  select * into r from public.exercise_history((select v from smoke where k = 'ex1'), 5)
  where session_id = (select v from smoke where k = 'w1');
  if jsonb_array_length(r.sets) <> 3 or r.sets -> 0 ->> 'set_type' <> 'warmup' then
    raise exception 'history sets wrong: %', r.sets;
  end if;
  if (select count(*) from public.exercise_history((select v from smoke where k = 'ex1'), 2)) <> 2 then
    raise exception 'history limit ignored';
  end if;
end $$;

-- B sees none of it.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000007b1","role":"authenticated"}', true);
do $$
begin
  if exists (select 1 from public.exercise_session_bests('2000-01-01'))
     or exists (select 1 from public.exercise_history((select v from smoke where k = 'ex1'))) then
    raise exception 'B can read A''s progress';
  end if;
end $$;

reset role;
select 'progress smoke test passed' as result;
rollback;
