-- Enumerations from docs/data-model.md.

create type public.unit_system as enum ('imperial', 'metric');
create type public.training_focus as enum ('run_first', 'balanced', 'lift_first');
create type public.sex as enum ('male', 'female');
create type public.experience as enum ('beginner', 'intermediate');
create type public.nutrition_goal as enum ('build_muscle', 'lose_fat', 'maintain');
create type public.nutrition_phase as enum ('cut', 'maintain', 'lean_bulk');
create type public.rate_mode as enum ('auto', 'manual');
create type public.tracking_type as enum ('weight_reps', 'reps_only', 'duration', 'distance');
create type public.demo_type as enum ('animation', 'video', 'none');
create type public.workout_kind as enum ('lift', 'run');
create type public.segment_type as enum ('warmup', 'interval', 'recovery', 'steady', 'cooldown');
create type public.target_type as enum ('pace', 'heart_rate_zone', 'effort', 'none');
create type public.session_status as enum ('planned', 'in_progress', 'completed', 'skipped');
create type public.set_type as enum ('warmup', 'working', 'drop', 'failure');
create type public.run_source as enum ('apple_health', 'strava', 'manual');
create type public.meal as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type public.food_source as enum ('usda', 'open_food_facts', 'custom');
create type public.target_status as enum ('proposed', 'accepted', 'kept');
create type public.target_method as enum ('initial', 'adaptive', 'manual');
create type public.integration_provider as enum ('apple_health', 'strava');
