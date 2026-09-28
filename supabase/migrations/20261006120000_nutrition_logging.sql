-- Step 8: food logging, weigh-ins and the weekly check-in. All functions run as the caller
-- (security invoker), so RLS applies. The shared food cache (foods with owner_id null) is only
-- written by the `food` Edge Function with the service role, from the source database.

-- Logs foods to one meal of one day. p = {log_date, meal, saved_meal_id?, items: [{food_id,
-- servings} | {name?, kcal, protein_g?, fat_g?, carbs_g?}]}. Items with a food snapshot its
-- per-serving values × servings from `foods` (never from the client); quick-add items (no food)
-- take the values given. Returns the new log ids in item order.
create or replace function public.log_foods(p jsonb)
returns setof uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_date date := (p ->> 'log_date')::date;
  v_meal public.meal := (p ->> 'meal')::public.meal;
  v_saved uuid := (p ->> 'saved_meal_id')::uuid;
  v_count int;
  v_found int;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if v_date is null or v_meal is null or jsonb_typeof(p -> 'items') is distinct from 'array'
     or jsonb_array_length(p -> 'items') = 0 then
    raise exception 'nothing to log' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p -> 'items') x
    where coalesce((x ->> 'servings')::numeric, 1) <= 0
       or (x ->> 'food_id' is null and coalesce((x ->> 'kcal')::numeric, -1) < 0)
  ) then
    raise exception 'invalid item' using errcode = '22023';
  end if;

  select count(*) filter (where x ->> 'food_id' is not null), count(f.id) into v_count, v_found
  from jsonb_array_elements(p -> 'items') x
  left join public.foods f on f.id = (x ->> 'food_id')::uuid;
  if v_found <> v_count then
    raise exception 'food not found' using errcode = 'P0002';
  end if;

  return query
  insert into public.food_logs
    (user_id, food_id, log_date, meal, servings, name_snapshot, kcal, protein_g, fat_g, carbs_g,
     source_saved_meal_id)
  select v_uid, f.id, v_date, v_meal,
    coalesce((x ->> 'servings')::numeric, 1),
    coalesce(f.name, nullif(trim(x ->> 'name'), ''), 'quick add'),
    round(coalesce(f.kcal * coalesce((x ->> 'servings')::numeric, 1), (x ->> 'kcal')::numeric), 1),
    round(coalesce(f.protein_g * coalesce((x ->> 'servings')::numeric, 1), (x ->> 'protein_g')::numeric, 0), 1),
    round(coalesce(f.fat_g * coalesce((x ->> 'servings')::numeric, 1), (x ->> 'fat_g')::numeric, 0), 1),
    round(coalesce(f.carbs_g * coalesce((x ->> 'servings')::numeric, 1), (x ->> 'carbs_g')::numeric, 0), 1),
    v_saved
  from jsonb_array_elements(p -> 'items') with ordinality as t (x, n)
  left join public.foods f on f.id = (x ->> 'food_id')::uuid
  order by t.n
  returning id;
end;
$$;

-- Logs every item of a saved meal in one tap.
create or replace function public.log_saved_meal(p_saved_meal_id uuid, p_log_date date, p_meal public.meal)
returns setof uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (select 1 from public.saved_meals where id = p_saved_meal_id) then
    raise exception 'saved meal not found' using errcode = 'P0002';
  end if;
  return query select public.log_foods(jsonb_build_object(
    'log_date', p_log_date, 'meal', p_meal, 'saved_meal_id', p_saved_meal_id,
    'items', (select jsonb_agg(jsonb_build_object('food_id', i.food_id, 'servings', i.servings) order by i.created_at, i.id)
              from public.saved_meal_items i where i.saved_meal_id = p_saved_meal_id)));
end;
$$;

-- Today's weigh-in and measurements. p = {date, weight_kg?, waist_cm?, neck_cm?, hip_cm?,
-- body_fat_pct?}. A weight typed here replaces an Apple Health weight for the day; fields left
-- out keep their value.
create or replace function public.save_weigh_in(p jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if (p ->> 'date') is null then
    raise exception 'date required' using errcode = '22023';
  end if;
  insert into public.body_checkins as b
    (user_id, checkin_date, weight_kg, waist_cm, neck_cm, hip_cm, body_fat_pct, source)
  values (v_uid, (p ->> 'date')::date, (p ->> 'weight_kg')::numeric, (p ->> 'waist_cm')::numeric,
    (p ->> 'neck_cm')::numeric, (p ->> 'hip_cm')::numeric, (p ->> 'body_fat_pct')::numeric, 'manual')
  on conflict (user_id, checkin_date) do update set
    weight_kg = coalesce(excluded.weight_kg, b.weight_kg),
    waist_cm = coalesce(excluded.waist_cm, b.waist_cm),
    neck_cm = coalesce(excluded.neck_cm, b.neck_cm),
    hip_cm = coalesce(excluded.hip_cm, b.hip_cm),
    body_fat_pct = coalesce(excluded.body_fat_pct, b.body_fat_pct),
    source = case when excluded.weight_kg is not null then 'manual' else b.source end;
end;
$$;

-- The weekly check-in's proposal (src/engine/checkin.ts → Proposal). Inserted once per week:
-- whichever of the phone and the scheduled function gets there first. Returns whether it was
-- inserted.
create or replace function public.propose_weekly_targets(p jsonb)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_rows int;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  insert into public.weekly_targets
    (user_id, week_start, method, days_logged, avg_weight_kg, avg_kcal, weight_change_kg,
     maintenance_kcal, kcal_target, kcal_low, kcal_high, protein_g, fat_g, carbs_g, status)
  values (v_uid, (p ->> 'week_start')::date, 'adaptive', (p ->> 'days_logged')::int,
    (p ->> 'avg_weight_kg')::numeric, (p ->> 'avg_kcal')::int, (p ->> 'weight_change_kg')::numeric,
    (p ->> 'maintenance_kcal')::int, (p ->> 'kcal_target')::int, (p ->> 'kcal_low')::int,
    (p ->> 'kcal_high')::int, (p ->> 'protein_g')::int, (p ->> 'fat_g')::int,
    (p ->> 'carbs_g')::int, 'proposed')
  on conflict (user_id, week_start) do nothing;
  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

-- Accept the proposed targets, or keep the current ones (the row keeps the week's averages and
-- copies the previous targets; docs/data-model.md → weekly_targets).
create or replace function public.decide_weekly_targets(p_week_start date, p_accept boolean)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_prev public.weekly_targets;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.weekly_targets where week_start = p_week_start and status = 'proposed'
  ) then
    raise exception 'no proposal for that week' using errcode = 'P0002';
  end if;
  if p_accept then
    update public.weekly_targets set status = 'accepted', decided_at = now()
    where week_start = p_week_start;
    return;
  end if;
  select * into v_prev from public.weekly_targets
  where week_start < p_week_start and status in ('accepted', 'kept')
  order by week_start desc limit 1;
  if not found then
    raise exception 'no earlier targets to keep' using errcode = 'P0002';
  end if;
  update public.weekly_targets set
    status = 'kept', decided_at = now(),
    maintenance_kcal = v_prev.maintenance_kcal, kcal_target = v_prev.kcal_target,
    kcal_low = v_prev.kcal_low, kcal_high = v_prev.kcal_high, protein_g = v_prev.protein_g,
    fat_g = v_prev.fat_g, carbs_g = v_prev.carbs_g
  where week_start = p_week_start;
end;
$$;

-- Nutrition settings: goal, phase, experience and rate; with p_targets, the current week's
-- targets recalculated now (method manual, accepted).
create or replace function public.update_nutrition_settings(p_profile jsonb, p_targets jsonb default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  update public.nutrition_profiles set
    goal = coalesce((p_profile ->> 'goal')::public.nutrition_goal, goal),
    phase = coalesce((p_profile ->> 'phase')::public.nutrition_phase, phase),
    experience = coalesce((p_profile ->> 'experience')::public.experience, experience),
    rate_mode = coalesce((p_profile ->> 'rate_mode')::public.rate_mode, rate_mode),
    weekly_rate_pct = coalesce((p_profile ->> 'weekly_rate_pct')::numeric, weekly_rate_pct)
  where user_id = v_uid;
  if not found then
    raise exception 'no nutrition profile' using errcode = 'P0002';
  end if;
  if p_targets is not null then
    insert into public.weekly_targets as w
      (user_id, week_start, method, days_logged, maintenance_kcal, kcal_target, kcal_low,
       kcal_high, protein_g, fat_g, carbs_g, status, decided_at)
    values (v_uid, (p_targets ->> 'week_start')::date, 'manual', 0,
      (p_targets ->> 'maintenance_kcal')::int, (p_targets ->> 'kcal_target')::int,
      (p_targets ->> 'kcal_low')::int, (p_targets ->> 'kcal_high')::int,
      (p_targets ->> 'protein_g')::int, (p_targets ->> 'fat_g')::int,
      (p_targets ->> 'carbs_g')::int, 'accepted', now())
    on conflict (user_id, week_start) do update set
      method = 'manual', maintenance_kcal = excluded.maintenance_kcal,
      kcal_target = excluded.kcal_target, kcal_low = excluded.kcal_low,
      kcal_high = excluded.kcal_high, protein_g = excluded.protein_g, fat_g = excluded.fat_g,
      carbs_g = excluded.carbs_g, status = 'accepted', decided_at = now();
  end if;
end;
$$;

-- Daily intake for the check-in: kcal per logged day (days with no logs are absent).
create or replace function public.daily_intake(p_from date, p_to date)
returns table (log_date date, kcal numeric, protein_g numeric, fat_g numeric, carbs_g numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select l.log_date, sum(l.kcal), sum(l.protein_g), sum(l.fat_g), sum(l.carbs_g)
  from public.food_logs l
  where l.user_id = auth.uid() and l.log_date between p_from and p_to
  group by l.log_date
  order by l.log_date;
$$;

create index if not exists food_logs_user_food_idx on public.food_logs (user_id, food_id);

revoke execute on function public.log_foods(jsonb) from public, anon;
revoke execute on function public.log_saved_meal(uuid, date, public.meal) from public, anon;
revoke execute on function public.save_weigh_in(jsonb) from public, anon;
revoke execute on function public.propose_weekly_targets(jsonb) from public, anon;
revoke execute on function public.decide_weekly_targets(date, boolean) from public, anon;
revoke execute on function public.update_nutrition_settings(jsonb, jsonb) from public, anon;
revoke execute on function public.daily_intake(date, date) from public, anon;
grant execute on function public.log_foods(jsonb) to authenticated;
grant execute on function public.log_saved_meal(uuid, date, public.meal) to authenticated;
grant execute on function public.save_weigh_in(jsonb) to authenticated;
grant execute on function public.propose_weekly_targets(jsonb) to authenticated;
grant execute on function public.decide_weekly_targets(date, boolean) to authenticated;
grant execute on function public.update_nutrition_settings(jsonb, jsonb) to authenticated;
grant execute on function public.daily_intake(date, date) to authenticated;
