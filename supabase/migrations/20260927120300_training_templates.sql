-- 2. Training templates: exercises, templates, template_exercises, template_run_segments.

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.users (id) on delete cascade, -- null = built-in library
  name text not null check (length(trim(name)) > 0),
  primary_muscle text,
  secondary_muscles text[] not null default '{}',
  equipment text,
  tracking_type public.tracking_type not null default 'weight_reps',
  thumbnail_url text,
  demo_url text,
  demo_type public.demo_type not null default 'none',
  instructions jsonb,
  notes text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- One name per owner; NULLS NOT DISTINCT makes built-ins (owner null) unique by name too.
create unique index exercises_owner_name_key
  on public.exercises (owner_id, lower(name)) nulls not distinct;

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  kind public.workout_kind not null,
  notes text,
  est_duration_s int check (est_duration_s >= 0),
  est_distance_m int check (est_distance_m >= 0),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index templates_user_id_idx on public.templates (user_id);

create table public.template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  position int not null check (position >= 0),
  superset_group int,
  target_sets int not null check (target_sets > 0),
  rep_min int check (rep_min > 0),
  rep_max int check (rep_max > 0),
  rest_sec int check (rest_sec >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (rep_min is null or rep_max is null or rep_min <= rep_max)
);
create index template_exercises_template_id_idx on public.template_exercises (template_id);
create index template_exercises_exercise_id_idx on public.template_exercises (exercise_id);

create table public.template_run_segments (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates (id) on delete cascade,
  position int not null check (position >= 0),
  segment_type public.segment_type not null,
  repeat_group int,
  repeats int not null default 1 check (repeats >= 1),
  distance_m int check (distance_m > 0),
  duration_s int check (duration_s > 0),
  target_type public.target_type not null default 'none',
  target_pace_s_per_km int check (target_pace_s_per_km > 0),
  target_pace_tolerance_s int not null default 0 check (target_pace_tolerance_s >= 0),
  target_hr_zone int check (target_hr_zone between 1 and 5),
  target_effort text check (target_effort in ('easy', 'moderate', 'hard')),
  voice_cues text[] not null default '{}'
    check (voice_cues <@ array['halfway', 'every_200m', 'pace_alerts']),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Measure by distance or by time, exactly one.
  check (num_nonnulls(distance_m, duration_s) = 1)
);
create index template_run_segments_template_id_idx on public.template_run_segments (template_id);

create trigger set_updated_at before update on public.exercises
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.templates
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.template_exercises
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.template_run_segments
  for each row execute function public.set_updated_at();
