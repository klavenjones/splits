-- Run import smoke test. Run as postgres (SQL editor, or `npx supabase db query --linked -f`).
-- One transaction, rolled back. Raises an exception on the first failure.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000006a1', 'runner-a@example.test'),
  ('00000000-0000-0000-0000-0000000006b1', 'runner-b@example.test');

create temporary table smoke (k text primary key, v uuid) on commit drop;
grant all on smoke to authenticated;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000006a1","role":"authenticated"}', true);

-- A plans an easy 4 mi and a long 8 mi run on Monday, and a tempo on Tuesday.
insert into smoke select 'easy', public.save_template(null, 'easy run', 'run', null, 2280, 6437, null,
  '[{"segment_type":"steady","distance_m":6437,"target_type":"pace","target_pace_s_per_km":354,"target_pace_tolerance_s":10}]');
insert into smoke select 'long', public.save_template(null, 'long run', 'run', null, 4800, 12875, null,
  '[{"segment_type":"steady","distance_m":12875,"target_type":"effort","target_effort":"easy"}]');
insert into smoke select 'p_' || n, id from public.plan_sessions(jsonb_build_array(
  jsonb_build_object('template_id', (select v from smoke where k = 'long'), 'scheduled_date', '2026-10-05'),
  jsonb_build_object('template_id', (select v from smoke where k = 'easy'), 'scheduled_date', '2026-10-05'),
  jsonb_build_object('template_id', (select v from smoke where k = 'easy'), 'scheduled_date', '2026-10-06')))
  with ordinality as x (id, n);
-- p_1 = long Mon, p_2 = easy Mon, p_3 = easy Tue.

do $$
declare
  r jsonb;
  run jsonb := '{"external_id":"HK-1","started_at":"2026-10-05T10:10:00Z","ended_at":"2026-10-05T10:49:00Z",
    "local_date":"2026-10-05","distance_m":6598,"duration_s":2320,"avg_hr":148,"max_hr":166,"recent":true,
    "splits":[{"split_index":1,"distance_m":1609,"duration_s":581,"avg_hr":139},
              {"split_index":2,"distance_m":1609,"duration_s":568,"avg_hr":146},
              {"split_index":3,"distance_m":1609,"duration_s":562,"avg_hr":151},
              {"split_index":4,"distance_m":1609,"duration_s":555,"avg_hr":155},
              {"split_index":5,"distance_m":162,"duration_s":54,"avg_hr":156}]}';
begin
  -- A 4.1 mi run on Monday matches the easy run (closest distance), not the long one.
  r := public.import_run(run);
  if (r ->> 'session_id')::uuid <> (select v from smoke where k = 'p_2') or r ->> 'match' <> 'auto'
     or not (r ->> 'created')::boolean then
    raise exception 'auto match wrong: %', r;
  end if;
  if (select status from public.sessions where id = (select v from smoke where k = 'p_2')) <> 'completed'
     or (select avg_pace_s_per_km from public.run_logs where external_id = 'HK-1') <> 352
     or (select count(*) from public.run_splits) <> 5 then
    raise exception 'import rows wrong';
  end if;

  -- Importing again changes nothing.
  r := public.import_run(run);
  if (r ->> 'created')::boolean or (select count(*) from public.run_logs) <> 1
     or (select count(*) from public.sessions) <> 3 then
    raise exception 'import not idempotent';
  end if;

  -- A second Monday run: only the long run is left, so it takes it.
  r := public.import_run(run || '{"external_id":"HK-2","distance_m":5150,"splits":[]}');
  if (r ->> 'session_id')::uuid <> (select v from smoke where k = 'p_1') then
    raise exception 'second match wrong';
  end if;

  -- A third Monday run: nothing planned is left, so it needs a match.
  r := public.import_run(run || '{"external_id":"HK-3","started_at":"2026-10-05T21:45:00Z","distance_m":5150,"splits":[{"split_index":1,"distance_m":1609,"duration_s":547}]}');
  if r ->> 'match' <> 'needs_match'
     or (select template_id from public.sessions where id = (r ->> 'session_id')::uuid) is not null
     or (select status from public.sessions where id = (r ->> 'session_id')::uuid) <> 'completed' then
    raise exception 'unmatched run wrong: %', r;
  end if;
  insert into smoke values ('needs', (r ->> 'session_id')::uuid);

  -- An old run on a day with nothing planned is an extra run, not a card.
  r := public.import_run(run || '{"external_id":"HK-4","local_date":"2026-08-01","recent":false,"splits":[]}');
  if r ->> 'match' <> 'extra' then
    raise exception 'old run should be extra';
  end if;
end $$;

-- B can't see, link or remove A's runs, and B's own import doesn't touch A's plan.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000006b1","role":"authenticated"}', true);
do $$
declare r jsonb;
begin
  if exists (select 1 from public.run_logs) or exists (select 1 from public.run_splits) then
    raise exception 'B can read A''s runs';
  end if;
  begin
    perform public.link_run((select v from smoke where k = 'needs'), null);
    raise exception 'B linked A''s run';
  exception when insufficient_privilege then null;
  end;
  if public.remove_imported_run('HK-3') then
    raise exception 'B removed A''s run';
  end if;
  r := public.import_run('{"external_id":"HK-B1","started_at":"2026-10-06T10:00:00Z","local_date":"2026-10-06","distance_m":5000,"duration_s":1800,"recent":true}');
  if r ->> 'match' <> 'needs_match' then
    raise exception 'B matched onto A''s plan';
  end if;
end $$;

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000006a1","role":"authenticated"}', true);
do $$
declare
  needs uuid := (select v from smoke where k = 'needs');
  tue uuid := (select v from smoke where k = 'p_3');
  moved uuid;
begin
  if (select status from public.sessions where id = tue) <> 'planned' then
    raise exception 'B changed A''s plan';
  end if;

  -- A run can't go onto a session that already has one, or onto a lift.
  begin
    perform public.link_run(needs, (select v from smoke where k = 'p_2'));
    raise exception 'linked onto a session with a run';
  exception when invalid_parameter_value then null;
  end;

  -- Link the unmatched run to Tuesday's easy run: log and splits move, the unplanned session goes.
  moved := public.link_run(needs, tue);
  if moved <> tue or (select match from public.run_logs where session_id = tue) <> 'linked'
     or (select status from public.sessions where id = tue) <> 'completed'
     or (select count(*) from public.run_splits where run_log_id = tue) <> 1
     or exists (select 1 from public.sessions where id = needs) then
    raise exception 'link wrong';
  end if;

  -- Change it to an extra run: Tuesday goes back to planned, a new unplanned session holds it.
  moved := public.link_run(tue, null);
  if moved = tue or (select match from public.run_logs where session_id = moved) <> 'extra'
     or (select status from public.sessions where id = tue) <> 'planned'
     or exists (select 1 from public.run_logs where session_id = tue)
     or (select count(*) from public.run_splits where run_log_id = moved) <> 1 then
    raise exception 'unlink to extra wrong';
  end if;

  -- Deleted from Apple Health: the matched easy run goes back to planned, the extra run is gone.
  if not public.remove_imported_run('HK-1') or not public.remove_imported_run('HK-3') then
    raise exception 'remove returned false';
  end if;
  if (select status from public.sessions where id = (select v from smoke where k = 'p_2')) <> 'planned'
     or exists (select 1 from public.run_logs where external_id in ('HK-1', 'HK-3'))
     or exists (select 1 from public.sessions where id = moved) then
    raise exception 'remove wrong';
  end if;
  if public.remove_imported_run('HK-1') then
    raise exception 'remove twice should be a no-op';
  end if;
end $$;

-- Weight: Apple Health fills a day, updates its own day, and never overwrites a manual weigh-in.
insert into public.body_checkins (user_id, checkin_date, weight_kg, source)
values ('00000000-0000-0000-0000-0000000006a1', '2026-10-05', 93.0, 'manual');
do $$
begin
  perform public.import_body_mass('[{"date":"2026-10-05","kg":92.4},{"date":"2026-10-06","kg":92.1}]');
  perform public.import_body_mass('[{"date":"2026-10-06","kg":91.9}]');
  if (select weight_kg from public.body_checkins where checkin_date = '2026-10-05') <> 93.0
     or (select weight_kg from public.body_checkins where checkin_date = '2026-10-06') <> 91.9
     or (select source from public.body_checkins where checkin_date = '2026-10-06') <> 'apple_health' then
    raise exception 'body mass import wrong';
  end if;
end $$;

-- Imported rows must carry the HealthKit id.
do $$
begin
  insert into public.run_logs (session_id, source, external_id, started_at, distance_m, duration_s)
  values ((select v from smoke where k = 'p_3'), 'apple_health', null, now(), 1000, 300);
  raise exception 'import without external_id allowed';
exception when check_violation then null;
end $$;

reset role;
select 'run import smoke test passed' as result;
rollback;
