-- 1. Users and settings: users, nutrition_profiles, integrations.

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  unit_system public.unit_system not null default 'imperial',
  focus public.training_focus not null default 'balanced',
  timezone text not null default 'UTC',
  checkin_weekday int not null default 1 check (checkin_weekday between 1 and 7),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.nutrition_profiles (
  user_id uuid primary key references public.users (id) on delete cascade,
  sex public.sex not null,
  height_cm numeric not null check (height_cm > 0),
  experience public.experience not null,
  goal public.nutrition_goal not null,
  phase public.nutrition_phase not null,
  rate_mode public.rate_mode not null default 'auto',
  weekly_rate_pct numeric not null,
  start_date date not null,
  start_weight_kg numeric not null check (start_weight_kg > 0),
  start_body_fat_pct numeric not null check (start_body_fat_pct > 0 and start_body_fat_pct < 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  provider public.integration_provider not null,
  status text not null default 'connected'
    check (status in ('connected', 'disconnected', 'needs_reauth')),
  -- Strava only. Encryption at rest is set up with the Strava integration (build step 6).
  access_token text,
  refresh_token text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create trigger set_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.nutrition_profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.integrations
  for each row execute function public.set_updated_at();
