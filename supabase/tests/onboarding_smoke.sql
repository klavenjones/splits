-- Onboarding smoke test. Run as postgres (SQL editor, or `npx supabase db query --linked -f`).
-- One transaction, rolled back. Raises an exception on the first failure.
begin;

-- The trigger creates public.users for new auth users.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000001a1', 'onboarding-a@example.test'),
  ('00000000-0000-0000-0000-0000000001b1', 'onboarding-b@example.test');

do $$
begin
  if (select count(*) from public.users where id in (
    '00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000001b1')) <> 2 then
    raise exception 'handle_new_user did not create users rows';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000001a1","role":"authenticated"}', true);

-- The engine fixture: 205 lb, 32%, male, beginner, lose fat. Called twice to prove it re-runs.
select public.save_starting_targets(
  'imperial', 'balanced', 'America/New_York', 'male', 190.5, 'beginner', 'lose_fat', 'cut',
  'auto', -0.7, '2026-09-27', 92.986, 32, '2026-09-21', 2604, 1900, 1800, 2000, 150, 52, 204);
select public.save_starting_targets(
  'imperial', 'balanced', 'America/New_York', 'male', 190.5, 'beginner', 'lose_fat', 'cut',
  'auto', -0.7, '2026-09-27', 92.986, 32, '2026-09-21', 2604, 1887, 1800, 2000, 150, 52, 204);

do $$
declare t public.weekly_targets;
begin
  if (select focus from public.users) <> 'balanced'
     or (select timezone from public.users) <> 'America/New_York' then
    raise exception 'users row not updated';
  end if;
  if (select count(*) from public.nutrition_profiles) <> 1
     or (select phase from public.nutrition_profiles) <> 'cut' then
    raise exception 'nutrition_profiles not saved';
  end if;
  select * into t from public.weekly_targets;
  if t.kcal_target <> 1887 or t.maintenance_kcal <> 2604 or t.status <> 'accepted'
     or t.method <> 'initial' or t.week_start <> '2026-09-21' or t.decided_at is null
     or (t.protein_g, t.fat_g, t.carbs_g) <> (150, 52, 204) then
    raise exception 'weekly_targets row wrong: %', row_to_json(t);
  end if;
  if (select count(*) from public.weekly_targets) <> 1 then
    raise exception 'weekly_targets upsert created a duplicate';
  end if;
end $$;

-- User B sees none of A's rows.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000001b1","role":"authenticated"}', true);

do $$
begin
  if (select count(*) from public.nutrition_profiles) <> 0
     or (select count(*) from public.weekly_targets) <> 0
     or (select count(*) from public.users) <> 1 then
    raise exception 'user B can see user A''s onboarding rows';
  end if;
  raise notice 'onboarding smoke test passed';
end $$;

rollback;
