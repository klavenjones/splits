-- Templates smoke test. Run as postgres (SQL editor, or `npx supabase db query --linked -f`).
-- One transaction, rolled back. Raises an exception on the first failure.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000003a1', 'templates-a@example.test'),
  ('00000000-0000-0000-0000-0000000003b1', 'templates-b@example.test');

create temporary table smoke (k text primary key, v uuid) on commit drop;
grant all on smoke to authenticated;
insert into smoke
select 'ex' || n, id from (
  select id, row_number() over (order by name) n from public.exercises where owner_id is null limit 3
) e;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000003a1","role":"authenticated"}', true);

-- A saves Upper A: bench press, then a two-exercise superset (rest only on the last member).
insert into smoke select 'upper', public.save_template(null, ' upper A ', 'lift', null, 2700, null,
  jsonb_build_array(
    jsonb_build_object('exercise_id', (select v from smoke where k = 'ex1'), 'target_sets', 4,
      'rep_min', 6, 'rep_max', 8, 'rest_sec', 150),
    jsonb_build_object('exercise_id', (select v from smoke where k = 'ex2'), 'superset_group', 1,
      'target_sets', 3, 'rep_min', 8, 'rep_max', 10, 'rest_sec', 0),
    jsonb_build_object('exercise_id', (select v from smoke where k = 'ex3'), 'superset_group', 1,
      'target_sets', 3, 'rep_min', 10, 'rep_max', 12, 'rest_sec', 90)),
  null);

-- A saves 6 × 800 m. The recovery sends a stray pace, which must be cleared.
insert into smoke select 'run', public.save_template(null, 'intervals 6 × 800 m', 'run', null,
  3200, 10018, null,
  jsonb_build_array(
    jsonb_build_object('segment_type', 'warmup', 'distance_m', 1609, 'target_type', 'pace',
      'target_pace_s_per_km', 354),
    jsonb_build_object('segment_type', 'interval', 'repeat_group', 1, 'repeats', 6,
      'distance_m', 800, 'target_type', 'pace', 'target_pace_s_per_km', 261,
      'target_pace_tolerance_s', 6, 'voice_cues', jsonb_build_array('halfway', 'pace_alerts')),
    jsonb_build_object('segment_type', 'recovery', 'repeat_group', 1, 'repeats', 6,
      'distance_m', 400, 'target_type', 'effort', 'target_effort', 'easy',
      'target_pace_s_per_km', 999),
    jsonb_build_object('segment_type', 'cooldown', 'distance_m', 1609, 'target_type', 'effort',
      'target_effort', 'easy')));

do $$
declare upper uuid := (select v from smoke where k = 'upper');
        run uuid := (select v from smoke where k = 'run');
begin
  if (select name from public.templates where id = upper) <> 'upper A' then
    raise exception 'name not trimmed';
  end if;
  if (select array_agg(position || ':' || coalesce(superset_group::text, '-') || ':' || rest_sec
        order by position) from public.template_exercises where template_id = upper)
     <> array['0:-:150', '1:1:0', '2:1:90'] then
    raise exception 'lift rows wrong';
  end if;
  if (select count(*) from public.template_run_segments where template_id = run) <> 4
     or (select repeats from public.template_run_segments where template_id = run and position = 0) <> 1
     or (select count(*) from public.template_run_segments
         where template_id = run and repeat_group = 1 and repeats = 6) <> 2
     or (select target_pace_s_per_km from public.template_run_segments
         where template_id = run and segment_type = 'recovery') is not null
     or (select voice_cues from public.template_run_segments
         where template_id = run and segment_type = 'interval') <> '{halfway,pace_alerts}' then
    raise exception 'run rows wrong';
  end if;
end $$;

-- Re-saving replaces children instead of adding to them.
select public.save_template((select v from smoke where k = 'upper'), 'upper A', 'lift', 'v2', 2400,
  null, jsonb_build_array(jsonb_build_object('exercise_id', (select v from smoke where k = 'ex1'),
    'target_sets', 5, 'rep_min', 5, 'rep_max', 5, 'rest_sec', 180)), null);

do $$
begin
  if (select count(*) from public.template_exercises
      where template_id = (select v from smoke where k = 'upper')) <> 1
     or (select notes from public.templates where id = (select v from smoke where k = 'upper')) <> 'v2' then
    raise exception 're-save did not replace children';
  end if;
end $$;

-- Invalid shapes are rejected.
do $$
begin
  begin
    perform public.save_template(null, 'bad', 'run', null, null, null, null, jsonb_build_array(
      jsonb_build_object('segment_type', 'interval', 'repeat_group', 1, 'repeats', 3, 'distance_m', 400,
        'target_type', 'none'),
      jsonb_build_object('segment_type', 'steady', 'distance_m', 400, 'target_type', 'none'),
      jsonb_build_object('segment_type', 'recovery', 'repeat_group', 1, 'repeats', 3, 'distance_m', 200,
        'target_type', 'none')));
    raise exception 'split repeat block was accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.save_template(null, 'bad', 'run', null, null, null, null, jsonb_build_array(
      jsonb_build_object('segment_type', 'interval', 'distance_m', 400, 'target_type', 'pace')));
    raise exception 'pace target without a pace was accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.save_template(null, 'bad', 'lift', null, null, null, '[]'::jsonb, null);
    raise exception 'empty lift template was accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.save_template(null, 'bad', 'run', null, null, null, null, jsonb_build_array(
      jsonb_build_object('segment_type', 'steady', 'distance_m', 400, 'duration_s', 60,
        'target_type', 'none')));
    raise exception 'distance and time together was accepted';
  exception when check_violation then null;
  end;
end $$;

-- Duplicate copies children.
insert into smoke select 'copy', public.duplicate_template((select v from smoke where k = 'run'));
do $$
begin
  if (select name from public.templates where id = (select v from smoke where k = 'copy'))
       <> 'intervals 6 × 800 m copy'
     or (select count(*) from public.template_run_segments
         where template_id = (select v from smoke where k = 'copy')) <> 4 then
    raise exception 'duplicate wrong';
  end if;
end $$;

-- B can't see, save into, or duplicate A's templates.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000003b1","role":"authenticated"}', true);
do $$
begin
  if exists (select 1 from public.templates) or exists (select 1 from public.template_run_segments) then
    raise exception 'B can read A''s templates';
  end if;
  begin
    perform public.save_template((select v from smoke where k = 'run'), 'hijack', 'run', null, null,
      null, null, jsonb_build_array(jsonb_build_object('segment_type', 'steady', 'distance_m', 1000,
        'target_type', 'none')));
    raise exception 'B saved into A''s template';
  exception when no_data_found then null;
  end;
  begin
    perform public.duplicate_template((select v from smoke where k = 'run'));
    raise exception 'B duplicated A''s template';
  exception when no_data_found then null;
  end;
end $$;

-- A deletes a template; its children go with it.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000003a1","role":"authenticated"}', true);
delete from public.templates where id = (select v from smoke where k = 'copy');
do $$
begin
  if exists (select 1 from public.template_run_segments
             where template_id = (select v from smoke where k = 'copy')) then
    raise exception 'delete left segments behind';
  end if;
  if (select name from public.templates where id = (select v from smoke where k = 'run'))
       <> 'intervals 6 × 800 m' then
    raise exception 'B changed A''s template';
  end if;
end $$;

reset role;
select 'templates smoke test passed' as result;
rollback;
