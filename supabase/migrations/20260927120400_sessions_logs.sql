-- 3. Sessions and logs: sessions, session_exercises, set_logs, run_logs, run_splits.

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  template_id uuid references public.templates (id) on delete set null,
  kind public.workout_kind not null,
  name text not null,
  scheduled_date date not null,
  status public.session_status not null default 'planned',
  started_at timestamptz,
  ended_at timestamptz,
  skip_reason text check (skip_reason in ('tired', 'sore', 'busy', 'sick', 'injury')),
  feel text check (feel in ('easy', 'solid', 'hard', 'all_out')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sessions_user_date_idx on public.sessions (user_id, scheduled_date);
create index sessions_template_id_idx on public.sessions (template_id);

create table public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  position int not null check (position >= 0),
  superset_group int,
  rest_sec int check (rest_sec >= 0),
  notes text,
  swapped_from_exercise_id uuid references public.exercises (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index session_exercises_session_id_idx on public.session_exercises (session_id);
create index session_exercises_exercise_id_idx on public.session_exercises (exercise_id);

create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references public.session_exercises (id) on delete cascade,
  set_number int not null check (set_number >= 1),
  set_type public.set_type not null default 'working',
  weight_kg numeric check (weight_kg >= 0),
  reps int check (reps >= 0),
  duration_s int check (duration_s >= 0),
  distance_m int check (distance_m >= 0),
  rpe numeric check (rpe between 1 and 10),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_exercise_id, set_number)
);

create table public.run_logs (
  session_id uuid primary key references public.sessions (id) on delete cascade,
  source public.run_source not null,
  external_id text,
  started_at timestamptz not null,
  distance_m int not null check (distance_m >= 0),
  duration_s int not null check (duration_s >= 0),
  avg_pace_s_per_km int check (avg_pace_s_per_km > 0),
  avg_hr int check (avg_hr > 0),
  max_hr int check (max_hr > 0),
  elevation_gain_m int,
  route_polyline text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_id)
);

create table public.run_splits (
  id uuid primary key default gen_random_uuid(),
  run_log_id uuid not null references public.run_logs (session_id) on delete cascade,
  split_index int not null check (split_index >= 1),
  distance_m int not null check (distance_m > 0),
  duration_s int not null check (duration_s >= 0),
  avg_hr int check (avg_hr > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_log_id, split_index)
);

create trigger set_updated_at before update on public.sessions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.session_exercises
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.set_logs
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.run_logs
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.run_splits
  for each row execute function public.set_updated_at();
