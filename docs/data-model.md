# Splits — Data Model

Target database: Postgres (Supabase). 18 tables in five areas. Every user-owned table has row-level security so a user can only read and write their own rows.

## Conventions

- **IDs:** `uuid`, default `gen_random_uuid()`. `users.id` equals the Supabase `auth.users.id`.
- **Timestamps:** `created_at` and `updated_at` (`timestamptz`, UTC) on every table. Not repeated below.
- **Units:** store metric internally — kilograms, meters, centimeters, seconds, seconds-per-km. Convert to lb / mi / in only in the UI based on `users.unit_system`. The nutrition engine uses 3,500 kcal per lb, i.e. ~7,716 kcal per kg (3,500 × 2.20462). A rounded 7,700 would miss the spreadsheet fixture by 1 kcal.
- **Dates vs timestamps:** anything tied to a calendar day (`scheduled_date`, `log_date`, `checkin_date`, `week_start`) is a `date` in the user's local timezone (`users.timezone`). Events (`started_at`, `completed_at`) are `timestamptz`.
- **Weeks start on Monday.** `week_start` is always a Monday.
- **Soft references:** `template_id` on sessions is nullable; templates can be deleted without losing history.
- **Derived, not stored:** PRs, estimated 1RM (Epley: `weight × (1 + reps / 30)`), session volume, weekly mileage, pace. Compute from logs; cache only if a query is measurably slow.

## Enumerations

| Field | Values |
|---|---|
| `users.unit_system` | `imperial`, `metric` |
| `users.focus` | `run_first`, `balanced`, `lift_first` |
| `nutrition_profiles.sex` | `male`, `female` |
| `nutrition_profiles.experience` | `beginner`, `intermediate` |
| `nutrition_profiles.goal` | `build_muscle`, `lose_fat`, `maintain` |
| `nutrition_profiles.phase` | `cut`, `maintain`, `lean_bulk` |
| `nutrition_profiles.rate_mode` | `auto`, `manual` |
| `exercises.tracking_type` | `weight_reps`, `reps_only`, `duration`, `distance` |
| `exercises.demo_type` | `animation`, `video`, `none` |
| `templates.kind` / `sessions.kind` | `lift`, `run` |
| `template_run_segments.segment_type` | `warmup`, `interval`, `recovery`, `steady`, `cooldown` |
| `template_run_segments.target_type` | `pace`, `heart_rate_zone`, `effort`, `none` |
| `sessions.status` | `planned`, `in_progress`, `completed`, `skipped` |
| `set_logs.set_type` | `warmup`, `working`, `drop`, `failure` |
| `run_logs.source` | `apple_health`, `strava`, `manual` |
| `food_logs.meal` | `breakfast`, `lunch`, `dinner`, `snack` |
| `foods.source` | `usda`, `open_food_facts`, `custom` |
| `weekly_targets.status` | `proposed`, `accepted`, `kept` |
| `weekly_targets.method` | `initial`, `adaptive`, `manual` |
| `integrations.provider` | `apple_health`, `strava` |

## 1. Users and settings

### users
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | = auth.users.id |
| display_name | text | |
| unit_system | enum | default `imperial` |
| focus | enum | default `balanced` |
| timezone | text | IANA, e.g. `America/New_York` |
| checkin_weekday | int | 1 = Monday (default) |
| onboarding_completed_at | timestamptz | null until onboarding finishes |

### nutrition_profiles (1:1 with users)
| Column | Type | Notes |
|---|---|---|
| user_id | uuid PK FK users | |
| sex | enum | |
| height_cm | numeric | |
| experience | enum | |
| goal | enum | |
| phase | enum | recommended or chosen |
| rate_mode | enum | `auto` derives rate from body fat + goal |
| weekly_rate_pct | numeric | % of bodyweight per week, negative = loss (e.g. −0.7) |
| start_date | date | |
| start_weight_kg | numeric | |
| start_body_fat_pct | numeric | |

### integrations
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| provider | enum | |
| status | text | `connected`, `disconnected`, `needs_reauth` |
| access_token / refresh_token | text | Strava only, encrypted at rest |
| last_synced_at | timestamptz | |
| **unique** | | (user_id, provider) |

## 2. Training templates

### exercises
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| owner_id | uuid FK users, nullable | null = built-in library |
| name | text | |
| primary_muscle | text | e.g. `chest` |
| secondary_muscles | text[] | |
| equipment | text | e.g. `barbell` |
| tracking_type | enum | |
| thumbnail_url | text | small square image |
| demo_url | text | short silent loop (mp4) or animation |
| demo_type | enum | |
| instructions | jsonb | `{ steps: string[], cues: string[], mistakes: string[] }` |
| notes | text | user notes on custom exercises |
| is_archived | bool | |
| **unique** | | (owner_id, lower(name)) — allows a custom exercise to shadow nothing; built-ins unique by name |

Custom-exercise media is uploaded to Supabase Storage bucket `exercise-media/{user_id}/…`; `thumbnail_url` / `demo_url` hold the storage paths.

### templates
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| name | text | |
| kind | enum | `lift` or `run` |
| notes | text | |
| est_duration_s | int | computed on save |
| est_distance_m | int | run only, computed on save |
| is_archived | bool | |

### template_exercises (lift templates)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| template_id | uuid FK templates | on delete cascade |
| exercise_id | uuid FK exercises | |
| position | int | order in the template |
| superset_group | int, nullable | exercises sharing a value alternate as a superset |
| target_sets | int | |
| rep_min | int | |
| rep_max | int | |
| rest_sec | int | |
| notes | text | |

### template_run_segments (run templates)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| template_id | uuid FK templates | on delete cascade |
| position | int | order |
| segment_type | enum | |
| repeat_group | int, nullable | segments sharing a value form a repeat block |
| repeats | int | repeat count for the block (stored on each member; ≥ 1) |
| distance_m | int, nullable | measure by distance… |
| duration_s | int, nullable | …or by time (exactly one of the two) |
| target_type | enum | |
| target_pace_s_per_km | int, nullable | |
| target_pace_tolerance_s | int | e.g. 10 = ±10 s/km |
| target_hr_zone | int, nullable | 1–5 |
| target_effort | text, nullable | `easy`, `moderate`, `hard` |
| voice_cues | text[] | `halfway`, `every_200m`, `pace_alerts` |

Expansion rule: to compute totals or send to a watch, expand each repeat block `repeats` times in `position` order.

## 3. Sessions and logs

### sessions
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| template_id | uuid FK templates, nullable | |
| kind | enum | |
| name | text | copied from template at creation |
| scheduled_date | date | |
| status | enum | |
| started_at / ended_at | timestamptz | |
| skip_reason | text, nullable | `tired`, `sore`, `busy`, `sick`, `injury` |
| feel | text, nullable | `easy`, `solid`, `hard`, `all_out` |
| notes | text | |

Lifecycle: `planned` → `in_progress` (Start) → `completed` (Finish) or `skipped`. Imported runs with no match create a session directly as `completed` with `template_id` null.

### session_exercises
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| session_id | uuid FK sessions | cascade |
| exercise_id | uuid FK exercises | |
| position | int | |
| superset_group | int, nullable | |
| rest_sec | int | |
| notes | text | |
| swapped_from_exercise_id | uuid, nullable | set when swapped mid-workout |

Copied from `template_exercises` when a session starts, so later template edits never change history.

### set_logs
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| session_exercise_id | uuid FK session_exercises | cascade |
| set_number | int | |
| set_type | enum | |
| weight_kg | numeric, nullable | |
| reps | int, nullable | |
| duration_s | int, nullable | for `duration` tracking |
| distance_m | int, nullable | for `distance` tracking |
| rpe | numeric, nullable | 1–10 |
| completed_at | timestamptz, nullable | null = not done yet |
| **unique** | | (session_exercise_id, set_number) |

"Previous" values in the logger = the most recent completed `set_logs` for the same `exercise_id`, matched by `set_number`.

### run_logs (1:1 with a run session)
| Column | Type | Notes |
|---|---|---|
| session_id | uuid PK FK sessions | cascade |
| source | enum | |
| external_id | text | HealthKit UUID or Strava activity id |
| started_at | timestamptz | |
| distance_m | int | |
| duration_s | int | moving time |
| avg_pace_s_per_km | int | derived at import |
| avg_hr | int, nullable | |
| max_hr | int, nullable | |
| elevation_gain_m | int, nullable | |
| route_polyline | text, nullable | |
| **unique** | | (source, external_id) — prevents double import |

### run_splits
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| run_log_id | uuid FK run_logs | cascade |
| split_index | int | 1-based |
| distance_m | int | 1,000 m or 1,609 m per unit_system |
| duration_s | int | |
| avg_hr | int, nullable | |
| **unique** | | (run_log_id, split_index) |

## 4. Nutrition

### foods
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| owner_id | uuid FK users, nullable | null = shared cache of API foods |
| source | enum | |
| external_id | text, nullable | USDA fdcId or OFF barcode |
| name | text | |
| brand | text, nullable | |
| serving_qty | numeric | |
| serving_unit | text | `g`, `ml`, `oz`, `cup`, `piece`, … |
| serving_grams | numeric, nullable | for unit conversion |
| kcal | numeric | per serving |
| protein_g / fat_g / carbs_g | numeric | per serving |
| fiber_g | numeric, nullable | |
| **unique** | | (source, external_id) where external_id not null |

### saved_meals
| Column | Type |
|---|---|
| id | uuid PK |
| user_id | uuid FK |
| name | text |

### saved_meal_items
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| saved_meal_id | uuid FK saved_meals | cascade |
| food_id | uuid FK foods | |
| servings | numeric | |

### food_logs
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| food_id | uuid FK foods, nullable | null for quick add |
| log_date | date | |
| meal | enum | |
| servings | numeric | |
| name_snapshot | text | |
| kcal / protein_g / fat_g / carbs_g | numeric | **snapshot at log time**, never recomputed |
| source_saved_meal_id | uuid, nullable | |

## 5. Body and adaptive-target engine

### body_checkins
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| checkin_date | date | |
| weight_kg | numeric, nullable | |
| waist_cm / neck_cm / hip_cm | numeric, nullable | |
| body_fat_pct | numeric, nullable | Navy formula when measurements present |
| source | text | `manual`, `apple_health` |
| **unique** | | (user_id, checkin_date) |

### weekly_targets
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| week_start | date | Monday |
| method | enum | |
| days_logged | int | days with a food log in the prior week |
| avg_weight_kg | numeric, nullable | prior-week average (missing days carry forward) |
| avg_kcal | int, nullable | prior-week average intake |
| weight_change_kg | numeric, nullable | vs previous week's average |
| maintenance_kcal | int | |
| kcal_target | int | |
| kcal_low / kcal_high | int | rounded to 50 |
| protein_g / fat_g / carbs_g | int | |
| status | enum | `proposed` until the user acts |
| decided_at | timestamptz, nullable | |
| **unique** | | (user_id, week_start) |

The app always reads the latest row with status `accepted` or `kept` for the current targets. A `kept` row copies the previous targets but records the week's averages.

## Relationships (summary)

```
users 1—1 nutrition_profiles
users 1—* integrations, exercises(custom), templates, sessions, foods(custom),
          saved_meals, food_logs, body_checkins, weekly_targets
templates 1—* template_exercises | template_run_segments
templates 1—* sessions (nullable back-reference)
sessions 1—* session_exercises 1—* set_logs
sessions 1—0..1 run_logs 1—* run_splits
exercises 1—* template_exercises, session_exercises
foods 1—* saved_meal_items, food_logs
saved_meals 1—* saved_meal_items
```
