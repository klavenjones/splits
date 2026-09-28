-- Week planner smoke test. Run as postgres (SQL editor, or `npx supabase db query --linked -f`).
-- One transaction, rolled back. Raises an exception on the first failure.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000004a1', 'planner-a@example.test'),
  ('00000000-0000-0000-0000-0000000004b1', 'planner-b@example.test');

create temporary table smoke (k text primary key, v uuid) on commit drop;
grant all on smoke to authenticated;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000004a1","role":"authenticated"}', true);

insert into smoke select 'upper', public.save_template(null, 'upper A', 'lift', null, 2700, null,
  jsonb_build_array(jsonb_build_object(
    'exercise_id', (select id from public.exercises where owner_id is null order by name limit 1),
    'target_sets', 4, 'rep_min', 6, 'rep_max', 8, 'rest_sec', 150)), null);
insert into smoke select 'run', public.save_template(null, 'easy run', 'run', null, 2280, 6437,
  null, jsonb_build_array(jsonb_build_object('segment_type', 'steady', 'distance_m', 6437,
    'target_type', 'effort', 'target_effort', 'easy')));

-- A plans the week of Mon Sep 28 2026 (lift Mon/Wed, run Tue/Thu/Sun) and a run next Tuesday.
insert into smoke (k, v)
select 's' || n, id from (
  select id, row_number() over () n from public.plan_sessions(jsonb_build_array(
    jsonb_build_object('template_id', (select v from smoke where k = 'upper'), 'scheduled_date', '2026-09-28'),
    jsonb_build_object('template_id', (select v from smoke where k = 'run'), 'scheduled_date', '2026-09-29'),
    jsonb_build_object('template_id', (select v from smoke where k = 'upper'), 'scheduled_date', '2026-09-30'),
    jsonb_build_object('template_id', (select v from smoke where k = 'run'), 'scheduled_date', '2026-10-01'),
    jsonb_build_object('template_id', (select v from smoke where k = 'run'), 'scheduled_date', '2026-10-04'),
    jsonb_build_object('template_id', (select v from smoke where k = 'run'), 'scheduled_date', '2026-10-06')
  )) as id
) x;

do $$
begin
  if (select count(*) from public.sessions) <> 6
     or exists (select 1 from public.sessions where status <> 'planned')
     or (select name || ':' || kind from public.sessions where id = (select v from smoke where k = 's1'))
        <> 'upper A:lift'
     or (select name || ':' || kind || ':' || scheduled_date from public.sessions
         where id = (select v from smoke where k = 's2')) <> 'easy run:run:2026-09-29' then
    raise exception 'plan_sessions rows wrong';
  end if;
  -- One bad template id rejects the whole batch.
  begin
    perform public.plan_sessions(jsonb_build_array(
      jsonb_build_object('template_id', (select v from smoke where k = 'run'), 'scheduled_date', '2026-10-02'),
      jsonb_build_object('template_id', gen_random_uuid(), 'scheduled_date', '2026-10-03')));
    raise exception 'unknown template was accepted';
  exception when no_data_found then null;
  end;
  if (select count(*) from public.sessions) <> 6 then
    raise exception 'partial batch was inserted';
  end if;
end $$;

-- Thursday is done; Wednesday is skipped. Shifting from Tuesday moves Tue and Sun only
-- (Sun spills to next Monday); Mon, the skipped Wed, the completed Thu and next week stay.
update public.sessions set status = 'completed' where id = (select v from smoke where k = 's4');
update public.sessions set status = 'skipped', skip_reason = 'sore'
where id = (select v from smoke where k = 's3');
do $$
begin
  if public.shift_sessions((select v from smoke where k = 's2')) <> 2 then
    raise exception 'shift moved the wrong number of sessions';
  end if;
  if (select array_agg(scheduled_date::text order by scheduled_date) from public.sessions)
     <> array['2026-09-28', '2026-09-30', '2026-09-30', '2026-10-01', '2026-10-05', '2026-10-06'] then
    raise exception 'shift dates wrong';
  end if;
  begin
    perform public.shift_sessions((select v from smoke where k = 's3'));
    raise exception 'shifted a skipped session';
  exception when no_data_found then null;
  end;
end $$;

-- B can't see, plan from, move, shift or delete A's rows.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000004b1","role":"authenticated"}', true);
do $$
declare n int;
begin
  if exists (select 1 from public.sessions) then
    raise exception 'B can read A''s sessions';
  end if;
  begin
    perform public.plan_sessions(jsonb_build_array(jsonb_build_object(
      'template_id', (select v from smoke where k = 'run'), 'scheduled_date', '2026-10-02')));
    raise exception 'B planned from A''s template';
  exception when no_data_found then null;
  end;
  begin
    perform public.shift_sessions((select v from smoke where k = 's1'));
    raise exception 'B shifted A''s week';
  exception when no_data_found then null;
  end;
  update public.sessions set scheduled_date = '2026-10-10' where id = (select v from smoke where k = 's1');
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'B moved A''s session'; end if;
  delete from public.sessions where id = (select v from smoke where k = 's1');
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'B deleted A''s session'; end if;
end $$;

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000004a1","role":"authenticated"}', true);
do $$
begin
  if (select count(*) from public.sessions) <> 6
     or (select scheduled_date from public.sessions where id = (select v from smoke where k = 's1'))
        <> '2026-09-28' then
    raise exception 'B changed A''s sessions';
  end if;
end $$;

-- Deleting a template keeps its sessions (template_id set null).
delete from public.templates where id = (select v from smoke where k = 'run');
do $$
begin
  if (select count(*) from public.sessions where name = 'easy run' and template_id is null) <> 4 then
    raise exception 'template delete lost session history';
  end if;
end $$;

reset role;
select 'sessions smoke test passed' as result;
rollback;
