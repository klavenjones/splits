-- 5. Body and adaptive-target engine: body_checkins, weekly_targets.

create table public.body_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  checkin_date date not null,
  weight_kg numeric check (weight_kg > 0),
  waist_cm numeric check (waist_cm > 0),
  neck_cm numeric check (neck_cm > 0),
  hip_cm numeric check (hip_cm > 0),
  body_fat_pct numeric check (body_fat_pct > 0 and body_fat_pct < 100),
  source text not null default 'manual' check (source in ('manual', 'apple_health')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, checkin_date)
);

create table public.weekly_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1), -- always a Monday
  method public.target_method not null,
  days_logged int not null default 0 check (days_logged between 0 and 7),
  avg_weight_kg numeric,
  avg_kcal int,
  weight_change_kg numeric,
  maintenance_kcal int not null check (maintenance_kcal > 0),
  kcal_target int not null check (kcal_target > 0),
  kcal_low int not null check (kcal_low > 0),
  kcal_high int not null check (kcal_high > 0),
  protein_g int not null check (protein_g >= 0),
  fat_g int not null check (fat_g >= 0),
  carbs_g int not null check (carbs_g >= 0),
  status public.target_status not null default 'proposed',
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start),
  check (kcal_low <= kcal_high)
);

create trigger set_updated_at before update on public.body_checkins
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.weekly_targets
  for each row execute function public.set_updated_at();
