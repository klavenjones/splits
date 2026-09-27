-- RLS smoke test. Run as the postgres role (Supabase SQL editor or psql).
-- Everything runs in one transaction and is rolled back. Raises an exception on the first failure.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'rls-a@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'rls-b@example.test');
insert into public.users (id) values
  ('00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000b');
insert into public.exercises (id, owner_id, name) values
  ('00000000-0000-0000-0000-0000000000e1', null, 'rls smoke built-in');
insert into public.foods (id, owner_id, source, external_id, name, serving_qty, serving_unit, kcal)
  values ('00000000-0000-0000-0000-0000000000f1', null, 'usda', 'rls-smoke-1', 'rls smoke food', 100, 'g', 100);
insert into public.templates (id, user_id, name, kind) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', 'b template', 'lift');

-- Act as user A.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

do $$
declare n int;
begin
  -- Own rows: write and read back.
  insert into public.templates (user_id, name, kind)
    values ('00000000-0000-0000-0000-00000000000a', 'a template', 'lift');
  select count(*) into n from public.templates;
  if n <> 1 then raise exception 'A should see only its own template, saw %', n; end if;

  select count(*) into n from public.users;
  if n <> 1 then raise exception 'A should see only its own users row, saw %', n; end if;

  -- Shared rows are readable.
  select count(*) into n from public.exercises where owner_id is null;
  if n < 1 then raise exception 'A should see built-in exercises'; end if;
  select count(*) into n from public.foods where owner_id is null;
  if n < 1 then raise exception 'A should see cached foods'; end if;

  -- Shared rows are read-only.
  update public.exercises set name = 'hacked' where id = '00000000-0000-0000-0000-0000000000e1';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'A updated a built-in exercise'; end if;
  delete from public.foods where id = '00000000-0000-0000-0000-0000000000f1';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'A deleted a cached food'; end if;

  begin
    insert into public.exercises (owner_id, name) values (null, 'fake built-in');
    raise exception 'A inserted a built-in exercise';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.foods (owner_id, source, name, serving_qty, serving_unit, kcal)
      values (null, 'custom', 'fake cache', 1, 'g', 1);
    raise exception 'A inserted a shared food';
  exception when insufficient_privilege then null;
  end;

  -- Other users' rows: invisible and unwritable.
  select count(*) into n from public.templates where id = '00000000-0000-0000-0000-0000000000b1';
  if n <> 0 then raise exception 'A can see B''s template'; end if;
  begin
    insert into public.template_exercises (template_id, exercise_id, position, target_sets)
      values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000e1', 0, 3);
    raise exception 'A added an exercise to B''s template';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.body_checkins (user_id, checkin_date, weight_kg)
      values ('00000000-0000-0000-0000-00000000000b', '2026-09-28', 80);
    raise exception 'A wrote a check-in for B';
  exception when insufficient_privilege then null;
  end;

  raise notice 'RLS smoke test passed';
end $$;

rollback;
