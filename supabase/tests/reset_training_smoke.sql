-- reset_training smoke test. Run as postgres (SQL editor, or `npx supabase db query --linked -f`).
-- One transaction, rolled back. Raises an exception on the first failure.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000007a1', 'reset-a@example.test'),
  ('00000000-0000-0000-0000-0000000007b1', 'reset-b@example.test');

create temporary table smoke (k text primary key, v uuid) on commit drop;
grant all on smoke to authenticated;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000007a1","role":"authenticated"}', true);

-- A: a template, a planned session, a completed lift with a set, a completed run with a split,
-- and a food log. B: one planned session.
insert into smoke select 'tpl', public.save_template(null, 'upper A', 'lift', null, 2700, null,
  jsonb_build_array(jsonb_build_object(
    'exercise_id', (select id from public.exercises where owner_id is null order by name limit 1),
    'target_sets', 3, 'rep_min', 6, 'rep_max', 8, 'rest_sec', 120)), null);

insert into public.sessions (user_id, kind, name, scheduled_date, status)
values ('00000000-0000-0000-0000-0000000007a1', 'lift', 'planned lift', '2026-10-08', 'planned');

-- Separate statements: a policy can't see rows inserted by the same statement.
insert into public.sessions (user_id, kind, name, scheduled_date, status, started_at, ended_at)
values ('00000000-0000-0000-0000-0000000007a1', 'lift', 'done lift', '2026-10-05', 'completed',
        '2026-10-05 07:00+00', '2026-10-05 08:00+00');
insert into public.session_exercises (session_id, exercise_id, position)
select id, (select id from public.exercises where owner_id is null order by name limit 1), 0
from public.sessions where name = 'done lift';
insert into public.set_logs (session_exercise_id, set_number, weight_kg, reps, completed_at)
select id, 1, 100, 5, '2026-10-05 07:10+00' from public.session_exercises;

insert into public.sessions (user_id, kind, name, scheduled_date, status, started_at, ended_at)
values ('00000000-0000-0000-0000-0000000007a1', 'run', 'done run', '2026-10-06', 'completed',
        '2026-10-06 07:00+00', '2026-10-06 07:30+00');
insert into public.run_logs (session_id, source, external_id, started_at, distance_m, duration_s)
select id, 'apple_health', 'hk-reset-1', '2026-10-06 07:00+00', 5000, 1800
from public.sessions where name = 'done run';
insert into public.run_splits (run_log_id, split_index, distance_m, duration_s)
select session_id, 1, 1609, 540 from public.run_logs;

insert into public.food_logs (user_id, log_date, meal, servings, name_snapshot, kcal)
values ('00000000-0000-0000-0000-0000000007a1', '2026-10-05', 'breakfast', 1, 'oats', 300);

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000007b1","role":"authenticated"}', true);
insert into public.sessions (user_id, kind, name, scheduled_date, status)
values ('00000000-0000-0000-0000-0000000007b1', 'lift', 'b planned', '2026-10-08', 'planned');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000007a1","role":"authenticated"}', true);
do $$
begin
  if (select count(*) from public.sessions) <> 3
     or (select count(*) from public.set_logs) <> 1
     or (select count(*) from public.run_logs) <> 1
     or (select count(*) from public.run_splits) <> 1 then
    raise exception 'seed rows wrong';
  end if;
end $$;

-- A resets: all three sessions and their dependents go; the template and the food log stay.
do $$
begin
  if public.reset_training() <> 3 then
    raise exception 'reset_training returned the wrong count';
  end if;
  if exists (select 1 from public.sessions)
     or exists (select 1 from public.session_exercises)
     or exists (select 1 from public.set_logs)
     or exists (select 1 from public.run_logs)
     or exists (select 1 from public.run_splits) then
    raise exception 'reset_training left training rows behind';
  end if;
  if (select count(*) from public.templates) <> 1
     or (select count(*) from public.template_exercises) <> 1
     or (select count(*) from public.food_logs) <> 1 then
    raise exception 'reset_training deleted more than training';
  end if;
  -- A second reset is a no-op.
  if public.reset_training() <> 0 then
    raise exception 'second reset_training was not a no-op';
  end if;
end $$;

-- B is untouched.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000007b1","role":"authenticated"}', true);
do $$
begin
  if (select count(*) from public.sessions) <> 1 then
    raise exception 'A''s reset touched B''s sessions';
  end if;
end $$;

-- Signed out: refused.
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
do $$
begin
  begin
    perform public.reset_training();
    raise exception 'reset_training worked while signed out';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
select 'reset_training smoke test passed' as result;
rollback;
