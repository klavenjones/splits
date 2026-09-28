-- Nutrition smoke test. Run as postgres (SQL editor, or `npx supabase db query --linked -f`).
-- One transaction, rolled back. Raises an exception on the first failure.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000008a1', 'fuel-a@example.test'),
  ('00000000-0000-0000-0000-0000000008b1', 'fuel-b@example.test');

create temporary table smoke (k text primary key, v uuid) on commit drop;
grant all on smoke to authenticated;

-- A shared cached food (only the Edge Function writes these) and A's nutrition profile.
insert into public.foods (id, owner_id, source, external_id, name, serving_qty, serving_unit, serving_grams, kcal, protein_g, fat_g, carbs_g)
values ('00000000-0000-0000-0000-00000000f001', null, 'usda', 'smoke-1', 'greek yogurt', 1, 'cup', 245, 150, 20, 4, 9);
insert into public.nutrition_profiles (user_id, sex, height_cm, experience, goal, phase, rate_mode, weekly_rate_pct, start_date, start_weight_kg, start_body_fat_pct)
values ('00000000-0000-0000-0000-0000000008a1', 'male', 190, 'beginner', 'lose_fat', 'cut', 'auto', -0.7, '2026-09-21', 93, 32);

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000008a1","role":"authenticated"}', true);

-- A can't write the shared cache directly.
do $$
begin
  insert into public.foods (owner_id, source, external_id, name, serving_qty, serving_unit, kcal)
  values (null, 'usda', 'poison', 'poisoned', 1, 'g', 1);
  raise exception 'shared food cache writable';
exception when insufficient_privilege then null;
end $$;

-- A custom food, and a batch log: 1.5 cups of the cached food (client numbers ignored), the
-- custom food, and a quick add.
with x as (
  insert into public.foods (owner_id, source, name, serving_qty, serving_unit, kcal, protein_g, fat_g, carbs_g)
  values ('00000000-0000-0000-0000-0000000008a1', 'custom', 'protein shake', 1, 'scoop', 120, 24, 1, 3)
  returning id)
insert into smoke select 'mine', id from x;

do $$
declare ids uuid[];
begin
  select array_agg(id) into ids from public.log_foods(jsonb_build_object(
    'log_date', '2026-10-05', 'meal', 'breakfast', 'items', jsonb_build_array(
      jsonb_build_object('food_id', '00000000-0000-0000-0000-00000000f001', 'servings', 1.5, 'kcal', 1),
      jsonb_build_object('food_id', (select v from smoke where k = 'mine')),
      jsonb_build_object('name', 'coffee', 'kcal', 5))) ) id;
  if array_length(ids, 1) is distinct from 3 then raise exception 'expected 3 logs'; end if;
  if (select kcal from public.food_logs where id = ids[1]) is distinct from 225
     or (select protein_g from public.food_logs where id = ids[1]) is distinct from 30
     or (select name_snapshot from public.food_logs where id = ids[1]) is distinct from 'greek yogurt' then
    raise exception 'snapshot not taken from foods';
  end if;
  if (select name_snapshot from public.food_logs where id = ids[3]) is distinct from 'coffee'
     or (select food_id from public.food_logs where id = ids[3]) is not null then
    raise exception 'quick add wrong';
  end if;
  begin
    perform public.log_foods('{"log_date":"2026-10-05","meal":"lunch","items":[{"food_id":"00000000-0000-0000-0000-00000000dead"}]}');
    raise exception 'logged an unknown food';
  exception when no_data_found then null;
  end;
  -- Snapshots stay when the food changes later.
  update public.foods set kcal = 999 where id = (select v from smoke where k = 'mine');
  if (select kcal from public.food_logs where id = ids[2]) is distinct from 120 then
    raise exception 'snapshot changed with the food';
  end if;
end $$;

-- Saved meal: logs every item with source_saved_meal_id.
with x as (insert into public.saved_meals (user_id, name)
  values ('00000000-0000-0000-0000-0000000008a1', 'usual breakfast') returning id)
insert into smoke select 'meal', id from x;
insert into public.saved_meal_items (saved_meal_id, food_id, servings) values
  ((select v from smoke where k = 'meal'), '00000000-0000-0000-0000-00000000f001', 1),
  ((select v from smoke where k = 'meal'), (select v from smoke where k = 'mine'), 2);
do $$
begin
  perform public.log_saved_meal((select v from smoke where k = 'meal'), '2026-10-06', 'breakfast');
  if (select count(*) from public.food_logs where log_date = '2026-10-06'
      and source_saved_meal_id = (select v from smoke where k = 'meal')) is distinct from 2
     or (select sum(kcal) from public.food_logs where log_date = '2026-10-06') is distinct from 150 + 999 * 2 then
    raise exception 'saved meal log wrong';
  end if;
  if (select kcal from public.daily_intake('2026-10-05', '2026-10-06') where log_date = '2026-10-05') is distinct from 225 + 120 + 5 then
    raise exception 'daily intake wrong';
  end if;
end $$;

-- Weigh-in: a typed weight beats Apple Health; measurements alone keep the weight.
insert into public.body_checkins (user_id, checkin_date, weight_kg, source)
values ('00000000-0000-0000-0000-0000000008a1', '2026-10-05', 92.8, 'apple_health');
do $$
begin
  perform public.save_weigh_in('{"date":"2026-10-05","weight_kg":92.4}');
  perform public.save_weigh_in('{"date":"2026-10-05","waist_cm":116,"neck_cm":41,"body_fat_pct":31}');
  if (select weight_kg from public.body_checkins where checkin_date = '2026-10-05') is distinct from 92.4
     or (select source from public.body_checkins where checkin_date = '2026-10-05') is distinct from 'manual'
     or (select body_fat_pct from public.body_checkins where checkin_date = '2026-10-05') is distinct from 31 then
    raise exception 'weigh-in wrong';
  end if;
end $$;

-- Check-in: proposed once; keep copies the previous targets; accept marks it.
insert into public.weekly_targets (user_id, week_start, method, days_logged, maintenance_kcal, kcal_target, kcal_low, kcal_high, protein_g, fat_g, carbs_g, status)
values ('00000000-0000-0000-0000-0000000008a1', '2026-09-21', 'initial', 0, 2604, 1887, 1800, 2000, 150, 52, 204, 'accepted');
do $$
declare p jsonb := '{"week_start":"2026-09-28","days_logged":7,"avg_weight_kg":92.9,"avg_kcal":2010,"weight_change_kg":-0.4,"maintenance_kcal":2604,"kcal_target":1900,"kcal_low":1800,"kcal_high":2000,"protein_g":150,"fat_g":52,"carbs_g":207}';
begin
  if not public.propose_weekly_targets(p) then raise exception 'proposal not inserted'; end if;
  if public.propose_weekly_targets(p || '{"kcal_target":2500}') then raise exception 'proposal inserted twice'; end if;
  perform public.decide_weekly_targets('2026-09-28', false);
  if (select kcal_target from public.weekly_targets where week_start = '2026-09-28') is distinct from 1887
     or (select status from public.weekly_targets where week_start = '2026-09-28') is distinct from 'kept'
     or (select avg_kcal from public.weekly_targets where week_start = '2026-09-28') is distinct from 2010 then
    raise exception 'keep wrong';
  end if;
  perform public.propose_weekly_targets(p || '{"week_start":"2026-10-05"}');
  perform public.decide_weekly_targets('2026-10-05', true);
  if (select status from public.weekly_targets where week_start = '2026-10-05') is distinct from 'accepted' then
    raise exception 'accept wrong';
  end if;
  begin
    perform public.decide_weekly_targets('2026-10-05', true);
    raise exception 'decided twice';
  exception when no_data_found then null;
  end;
  -- Settings: recalculate now writes a manual, accepted row for the week.
  perform public.update_nutrition_settings('{"phase":"maintain","weekly_rate_pct":0}',
    '{"week_start":"2026-10-05","maintenance_kcal":2600,"kcal_target":2600,"kcal_low":2500,"kcal_high":2700,"protein_g":150,"fat_g":70,"carbs_g":300}');
  if (select method from public.weekly_targets where week_start = '2026-10-05') is distinct from 'manual'
     or (select phase from public.nutrition_profiles) is distinct from 'maintain' then
    raise exception 'settings wrong';
  end if;
end $$;

-- B sees and changes none of A's diary, weigh-ins or targets.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000008b1","role":"authenticated"}', true);
do $$
begin
  if exists (select 1 from public.food_logs) or exists (select 1 from public.body_checkins)
     or exists (select 1 from public.weekly_targets) or exists (select 1 from public.daily_intake('2000-01-01', '2100-01-01')) then
    raise exception 'B can read A''s nutrition';
  end if;
  if exists (select 1 from public.foods where source = 'custom') then
    raise exception 'B sees A''s custom food';
  end if;
  begin
    perform public.log_foods(jsonb_build_object('log_date', '2026-10-05', 'meal', 'lunch',
      'items', jsonb_build_array(jsonb_build_object('food_id', (select v from smoke where k = 'mine')))));
    raise exception 'B logged A''s custom food';
  exception when no_data_found then null;
  end;
  begin
    perform public.decide_weekly_targets('2026-09-28', true);
    raise exception 'B decided A''s targets';
  exception when no_data_found then null;
  end;
  perform public.save_weigh_in('{"date":"2026-10-05","weight_kg":70}');
end $$;

reset role;
do $$
begin
  if (select weight_kg from public.body_checkins where user_id = '00000000-0000-0000-0000-0000000008a1' and checkin_date = '2026-10-05') is distinct from 92.4 then
    raise exception 'B changed A''s weigh-in';
  end if;
end $$;
select 'nutrition smoke test passed' as result;
rollback;
