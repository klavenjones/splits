-- Row-level security: a signed-in user reads and writes only their own rows.
-- Built-in exercises and cached foods (owner_id null) are readable by everyone signed in
-- and writable by no one except the service role (which bypasses RLS).
-- Subqueries on other tables run under those tables' own policies, so an `exists` only
-- sees rows the user is allowed to see.

alter table public.users enable row level security;
alter table public.nutrition_profiles enable row level security;
alter table public.integrations enable row level security;
alter table public.exercises enable row level security;
alter table public.templates enable row level security;
alter table public.template_exercises enable row level security;
alter table public.template_run_segments enable row level security;
alter table public.sessions enable row level security;
alter table public.session_exercises enable row level security;
alter table public.set_logs enable row level security;
alter table public.run_logs enable row level security;
alter table public.run_splits enable row level security;
alter table public.foods enable row level security;
alter table public.saved_meals enable row level security;
alter table public.saved_meal_items enable row level security;
alter table public.food_logs enable row level security;
alter table public.body_checkins enable row level security;
alter table public.weekly_targets enable row level security;

-- users: keyed by id = auth.uid()
create policy "users: own row" on public.users
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Tables with a user_id column
create policy "nutrition_profiles: own rows" on public.nutrition_profiles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "integrations: own rows" on public.integrations
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "templates: own rows" on public.templates
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "sessions: own rows" on public.sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (template_id is null or exists (select 1 from public.templates t where t.id = template_id))
  );

create policy "saved_meals: own rows" on public.saved_meals
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "food_logs: own rows" on public.food_logs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (food_id is null or exists (select 1 from public.foods f where f.id = food_id))
    and (source_saved_meal_id is null
      or exists (select 1 from public.saved_meals m where m.id = source_saved_meal_id))
  );

create policy "body_checkins: own rows" on public.body_checkins
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "weekly_targets: own rows" on public.weekly_targets
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Owner-nullable tables: shared rows are read-only
create policy "exercises: read built-in and own" on public.exercises
  for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));
create policy "exercises: insert own" on public.exercises
  for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "exercises: update own" on public.exercises
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "exercises: delete own" on public.exercises
  for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "foods: read cached and own" on public.foods
  for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));
create policy "foods: insert own" on public.foods
  for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "foods: update own" on public.foods
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "foods: delete own" on public.foods
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Child tables: ownership comes from the parent row
create policy "template_exercises: via template" on public.template_exercises
  for all to authenticated
  using (exists (
    select 1 from public.templates t
    where t.id = template_id and t.user_id = (select auth.uid())
  ))
  with check (
    exists (
      select 1 from public.templates t
      where t.id = template_id and t.user_id = (select auth.uid())
    )
    and exists (select 1 from public.exercises e where e.id = exercise_id)
  );

create policy "template_run_segments: via template" on public.template_run_segments
  for all to authenticated
  using (exists (
    select 1 from public.templates t
    where t.id = template_id and t.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.templates t
    where t.id = template_id and t.user_id = (select auth.uid())
  ));

create policy "session_exercises: via session" on public.session_exercises
  for all to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = session_id and s.user_id = (select auth.uid())
  ))
  with check (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and s.user_id = (select auth.uid())
    )
    and exists (select 1 from public.exercises e where e.id = exercise_id)
    and (swapped_from_exercise_id is null
      or exists (select 1 from public.exercises e where e.id = swapped_from_exercise_id))
  );

create policy "set_logs: via session" on public.set_logs
  for all to authenticated
  using (exists (
    select 1 from public.session_exercises se
    join public.sessions s on s.id = se.session_id
    where se.id = session_exercise_id and s.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.session_exercises se
    join public.sessions s on s.id = se.session_id
    where se.id = session_exercise_id and s.user_id = (select auth.uid())
  ));

create policy "run_logs: via session" on public.run_logs
  for all to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = session_id and s.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.sessions s
    where s.id = session_id and s.user_id = (select auth.uid())
  ));

create policy "run_splits: via run log" on public.run_splits
  for all to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = run_log_id and s.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.sessions s
    where s.id = run_log_id and s.user_id = (select auth.uid())
  ));

create policy "saved_meal_items: via saved meal" on public.saved_meal_items
  for all to authenticated
  using (exists (
    select 1 from public.saved_meals m
    where m.id = saved_meal_id and m.user_id = (select auth.uid())
  ))
  with check (
    exists (
      select 1 from public.saved_meals m
      where m.id = saved_meal_id and m.user_id = (select auth.uid())
    )
    and exists (select 1 from public.foods f where f.id = food_id)
  );

-- Table privileges. Supabase is making the default Data API grants opt-in, so grant explicitly:
-- signed-in users get DML (RLS decides which rows); anonymous requests get nothing.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;
