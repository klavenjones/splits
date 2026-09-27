-- 4. Nutrition: foods, saved_meals, saved_meal_items, food_logs.

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.users (id) on delete cascade, -- null = shared API cache
  source public.food_source not null,
  external_id text,
  name text not null check (length(trim(name)) > 0),
  brand text,
  serving_qty numeric not null check (serving_qty > 0),
  serving_unit text not null,
  serving_grams numeric check (serving_grams > 0),
  kcal numeric not null check (kcal >= 0),
  protein_g numeric not null default 0 check (protein_g >= 0),
  fat_g numeric not null default 0 check (fat_g >= 0),
  carbs_g numeric not null default 0 check (carbs_g >= 0),
  fiber_g numeric check (fiber_g >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index foods_source_external_id_key
  on public.foods (source, external_id) where external_id is not null;
create index foods_owner_id_idx on public.foods (owner_id);

create table public.saved_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index saved_meals_user_id_idx on public.saved_meals (user_id);

create table public.saved_meal_items (
  id uuid primary key default gen_random_uuid(),
  saved_meal_id uuid not null references public.saved_meals (id) on delete cascade,
  food_id uuid not null references public.foods (id),
  servings numeric not null check (servings > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index saved_meal_items_saved_meal_id_idx on public.saved_meal_items (saved_meal_id);
create index saved_meal_items_food_id_idx on public.saved_meal_items (food_id);

-- Nutrition values are a snapshot at log time and are never recomputed.
create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  food_id uuid references public.foods (id) on delete set null, -- null for quick add
  log_date date not null,
  meal public.meal not null,
  servings numeric not null default 1 check (servings > 0),
  name_snapshot text not null,
  kcal numeric not null check (kcal >= 0),
  protein_g numeric not null default 0 check (protein_g >= 0),
  fat_g numeric not null default 0 check (fat_g >= 0),
  carbs_g numeric not null default 0 check (carbs_g >= 0),
  source_saved_meal_id uuid references public.saved_meals (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index food_logs_user_date_idx on public.food_logs (user_id, log_date);
create index food_logs_food_id_idx on public.food_logs (food_id);
create index food_logs_source_saved_meal_id_idx on public.food_logs (source_saved_meal_id);

create trigger set_updated_at before update on public.foods
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.saved_meals
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.saved_meal_items
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.food_logs
  for each row execute function public.set_updated_at();
