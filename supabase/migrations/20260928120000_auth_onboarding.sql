-- Step 1: create the public.users row on sign-up, and save onboarding in one transaction.

-- Every new auth user gets a public.users row (id = auth.users.id).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill anyone who signed up before this trigger existed.
insert into public.users (id)
select id from auth.users
on conflict (id) do nothing;

-- Onboarding "your targets" → continue. Runs as the caller, so RLS applies to every write.
-- Safe to call again (going back and changing answers) before onboarding is completed.
create or replace function public.save_starting_targets(
  p_unit_system public.unit_system,
  p_focus public.training_focus,
  p_timezone text,
  p_sex public.sex,
  p_height_cm numeric,
  p_experience public.experience,
  p_goal public.nutrition_goal,
  p_phase public.nutrition_phase,
  p_rate_mode public.rate_mode,
  p_weekly_rate_pct numeric,
  p_start_date date,
  p_start_weight_kg numeric,
  p_start_body_fat_pct numeric,
  p_week_start date,
  p_maintenance_kcal int,
  p_kcal_target int,
  p_kcal_low int,
  p_kcal_high int,
  p_protein_g int,
  p_fat_g int,
  p_carbs_g int
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  update public.users
     set unit_system = p_unit_system, focus = p_focus, timezone = p_timezone
   where id = uid;
  if not found then
    raise exception 'no users row for %', uid using errcode = 'P0002';
  end if;

  insert into public.nutrition_profiles (
    user_id, sex, height_cm, experience, goal, phase, rate_mode, weekly_rate_pct,
    start_date, start_weight_kg, start_body_fat_pct
  ) values (
    uid, p_sex, p_height_cm, p_experience, p_goal, p_phase, p_rate_mode, p_weekly_rate_pct,
    p_start_date, p_start_weight_kg, p_start_body_fat_pct
  )
  on conflict (user_id) do update set
    sex = excluded.sex,
    height_cm = excluded.height_cm,
    experience = excluded.experience,
    goal = excluded.goal,
    phase = excluded.phase,
    rate_mode = excluded.rate_mode,
    weekly_rate_pct = excluded.weekly_rate_pct,
    start_date = excluded.start_date,
    start_weight_kg = excluded.start_weight_kg,
    start_body_fat_pct = excluded.start_body_fat_pct;

  insert into public.weekly_targets (
    user_id, week_start, method, days_logged, maintenance_kcal, kcal_target, kcal_low,
    kcal_high, protein_g, fat_g, carbs_g, status, decided_at
  ) values (
    uid, p_week_start, 'initial', 0, p_maintenance_kcal, p_kcal_target, p_kcal_low,
    p_kcal_high, p_protein_g, p_fat_g, p_carbs_g, 'accepted', now()
  )
  on conflict (user_id, week_start) do update set
    method = excluded.method,
    maintenance_kcal = excluded.maintenance_kcal,
    kcal_target = excluded.kcal_target,
    kcal_low = excluded.kcal_low,
    kcal_high = excluded.kcal_high,
    protein_g = excluded.protein_g,
    fat_g = excluded.fat_g,
    carbs_g = excluded.carbs_g,
    status = excluded.status,
    decided_at = excluded.decided_at;
end;
$$;

revoke execute on function public.save_starting_targets from public, anon;
grant execute on function public.save_starting_targets to authenticated;
