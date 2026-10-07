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
| movement_pattern | text, nullable | the movement slot the exercise fills (e.g. `horizontal press`, `hinge`); one per exercise; null = untagged (custom exercises until picked). Check constraint lists the 28 values below |
| tracking_type | enum | |
| thumbnail_url | text | small square image |
| demo_url | text | short silent loop (mp4) or animation |
| demo_type | enum | |
| instructions | jsonb | `{ steps: string[], cues: string[], mistakes: string[] }` |
| notes | text | user notes on custom exercises |
| is_archived | bool | |
| media_credit | jsonb, nullable | credit for third-party media: `{ author, author_url?, license, license_url, source_url }`; null for your own uploads |
| **unique** | | (owner_id, lower(name)) — allows a custom exercise to shadow nothing; built-ins unique by name |

Custom-exercise media is uploaded to Supabase Storage bucket `exercise-media/{user_id}/…`; `thumbnail_url` / `demo_url` hold the storage paths.
- **Bucket:** private, 50 MB per file, `image/jpeg|png|heic`, `video/mp4|quicktime`. Policies on `storage.objects` let a user read and write only under their own `{user_id}/` folder; the app shows media through short-lived signed URLs.
- **Which column:** a photo goes in `thumbnail_url` (`demo_type = none`); a video goes in `demo_url` with `demo_type = video`. List rows always show the muscle-group glyph, never the media (screens/README); media plays on the detail page's How to tab.
- **Delete = archive.** `template_exercises` and `session_exercises` reference exercises without an on-delete rule, so the app sets `is_archived` instead of deleting.
- **Built-in illustrations:** 33 built-ins show Everkinetic / wger.de line art (CC-BY-SA 3.0, via [wger](https://wger.de)), stored unmodified under `exercise-media/builtin/`, which every signed-in user can read and only the service role writes. The path is in `thumbnail_url` and the credit in `media_credit`; the How to tab shows the credit line. wger's user-uploaded photos are not used: several look copied from other sites.
- **Built-in library:** 193 rows seeded by migration `20260929120100_exercise_seed.sql`, generated from `supabase/seed-data/exercises.json` (`node scripts/build-exercise-seed.mjs`). Names, muscles and equipment were curated from [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense); the instructions are original. No third-party images are used.

**Exercise vocabulary.** `primary_muscle`, `secondary_muscles` and `equipment` stay free text; the app writes only these values (`src/exercises/vocab.ts`) and filters by group:

| Group | Muscles |
|---|---|
| chest | chest, upper chest |
| back | lats, upper back, lower back, traps |
| shoulders | front delts, side delts, rear delts |
| arms | biceps, triceps, forearms |
| legs | quads, hamstrings, glutes, calves, adductors, abductors |
| core | abs, obliques |
| full body | full body (conditioning) |

Equipment: barbell, dumbbell, kettlebell, cable, machine, bodyweight, band, landmine, ez bar, smith machine, sled, box, rower, bike, other.

**Movement slots** (`movement_pattern`; `src/exercises/vocab.ts`). One per exercise, independent of the muscle it trains. Library search and the filter chips use it, the swap screen ranks the same slot first, and the picker and detail subtitles show it. A check constraint (not an enum) holds the list, so adding a slot is a one-line migration plus a vocab entry.

| Group | Slots |
|---|---|
| upper push | horizontal press, incline press, vertical press, chest fly, triceps extension, lateral raise |
| upper pull | horizontal pull, vertical pull, rear delt / upper back, biceps curl, shrug |
| lower | squat, hinge, lunge / split squat, hip thrust / bridge, knee extension, knee flexion, calf raise, hip abduction / adduction |
| core | anti-extension, flexion, rotation / anti-rotation, back extension |
| full body / other | carry, olympic / power, plyometric / jump, conditioning / cardio, mobility / other |

Built-ins are tagged by `20261008120100_exercise_movement_pattern_data.sql` (generated from `exercises.json`).

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
| superset_group | int, nullable | exercises sharing a value alternate as a superset; members are contiguous, and only the last one holds `rest_sec` (the rest after each round); the others store 0 |
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

Expansion rule: to compute totals or send to a watch, expand each repeat block `repeats` times in `position` order. In the **last round**, recovery segments after the block's last non-recovery segment are dropped (the final interval flows into what follows), so 6 × (800 m + 400 m recovery) runs 6 intervals and 5 recoveries. A recoveries-only block plays in full. (`src/templates/runSegments.ts` → `expand`.)

Estimates (`templates.est_distance_m`, `est_duration_s`, saved with the template): a distance segment's time comes from its pace target, or else a default pace for its effort or zone (easy / Z1–2 6:15 /km, moderate / Z3 5:30, hard / Z4–5 4:45, recovery 7:00); a time segment's distance is estimated the same way. Lift templates: 45 s of work per set plus its rest, a superset round is its members' work plus one rest, and 2 minutes of setup per exercise.

Saving goes through `save_template(...)`: one transaction that upserts the template and replaces its children from JSON (positions from array order). It rejects a non-contiguous superset or repeat block, a block with mixed `repeats`, and a target without its value, and clears target columns that don't match `target_type`. `duplicate_template(id)` copies a template and its children as "{name} copy". Both run as the caller, so RLS applies.

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

Planning (step 4): a planned session is a `sessions` row with `status = planned`, a `scheduled_date` and a `template_id`; `name` and `kind` are copied from the template by `plan_sessions(items jsonb)` (one insert for `[{template_id, scheduled_date}]`, all or nothing). No `session_exercises` exist until Start, so a planned session reads its template live; a skipped session can go back to `planned`. Moving a session updates `scheduled_date` (planned only); "just skip" sets `skipped` and an optional `skip_reason`. `shift_sessions(id)` ("shift the week") moves that planned session and every planned session after it through that week's Sunday one day later, so Sunday spills into next Monday; other statuses stay put. Both functions run as the caller, so RLS applies.

Coaching notes (`src/plan/coach.ts`, rule-based): a lift template is *heavy lower* when ≥ 50% of its target sets are on legs-group exercises and *upper* when ≥ 50% are chest, back, shoulders or arms; a run is *hard* with an interval segment, a hard effort or a zone 4–5 target, and *long* from 12 km or 75 minutes estimated. The reschedule sheet warns when heavy lower lands the day before a hard or long run (either way round) and on two upper-body days in a row. "Fill week from focus" lays `users.focus`'s split (Monday first) over the week and rotates through lift and run templates by name, filling only empty days that haven't passed.

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
| **unique** | | (session_exercise_id, set_number), deferrable initially deferred (a sync may renumber sets) |

"Previous" values in the logger = the most recent completed `set_logs` for the same `exercise_id`, matched by `set_number`.

Logging (step 5): the active workout lives on the phone first (expo-sqlite, `src/local/`) with client-generated uuids that become the server ids. The whole workout is sent with `sync_workout(p jsonb)`: it upserts the session, its `session_exercises` and `set_logs` by id and deletes this session's rows missing from the payload, so a re-send is harmless. `discard_workout(id, back_to_planned)` puts a started planned session back on the plan (or deletes an empty workout). The local copy also keeps display and target fields (`name`, `primary_muscle`, `equipment`, `rep_min`, `rep_max`, whether the exercise came from the template) that are not stored on the server. "Previous" comes from `previous_sets(exercise_ids)` (the last completed session per exercise; warm-ups and working sets are matched separately, by order) and PRs from `exercise_bests()`; both are derived, cached on the phone, and updated locally when a workout finishes. A PR is a completed working set whose Epley e1RM beats the exercise's previous best; the first time an exercise is logged sets the baseline. Swapping keeps done sets on the original exercise and sets `swapped_from_exercise_id` on the new one.

Progress (step 7), all derived: `exercise_session_bests(since, exercise_id?)` returns one row per completed session per exercise (best working set by Epley e1RM, volume, set and rep counts) with the best e1RM of every *earlier* session of that exercise over all history, so a session is a PR when it beats that (the first weighted session is the baseline, as in the logger). `exercise_history(exercise_id, limit)` returns the latest sessions of an exercise with their completed sets. Weekly volume, key lifts (the 3 weighted exercises with the most sessions in the last 12 weeks), current e1RM (best of the last 4 weeks) and its 4-week change, weekly distance, easy-run pace (planned runs whose template is easy; see `isEasyRun`), the 7-day weight average and measurement changes are computed on the phone (`src/engine/progress.ts`). Nothing is stored; both functions run in about 10 ms over 10 weeks of data.

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
| match | text | `auto` (matched to a same-day planned run), `linked` (linked by hand), `needs_match` (unplanned, waiting on the user), `extra` (kept as an extra run: counts toward weekly distance, not the plan). Default `auto` |
| **unique** | | (source, external_id) — prevents double import |
| **check** | | `source = 'manual'` or `external_id` not null |

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

Import (step 6): runs are read from HealthKit on the phone (`src/health/`) and sent one at a time with `import_run(p jsonb)`, which is idempotent on `(source, external_id)`. It matches a run to the planned run session on the same local date that has no run log yet (closest estimated distance wins): that session becomes `completed` with `match = auto`. With no match it creates a `completed` run session with `template_id` null and name `run`, `match = needs_match` when the run is from the last 7 days, otherwise `extra`. `link_run(run_session, target)` moves a run log (and its splits) onto a planned run (`linked`), or keeps it as an extra run when `target` is null; a planned session a run leaves goes back to `planned`. `remove_imported_run(external_id)` undoes an import when the workout is deleted from Apple Health. Splits are computed on the phone from the workout's distance samples in the user's unit at import time (the last split is the remainder); changing units later doesn't recompute them. Moving time excludes pauses. Target vs actual is derived from the matched session's template segments, not stored.

Reset: `reset_training()` deletes every one of the caller's `sessions` (any status, planned included) and returns how many; `session_exercises`, `set_logs`, `run_logs` and `run_splits` follow by cascade, and PRs, bests and progress are derived so they clear too. Templates, custom exercises, nutrition and body data, targets and the profile are kept. It runs as the caller (RLS applies) and is safe to repeat. Deleting `run_logs` also deletes the only server-side record of imported HealthKit ids, so the phone sets an import cutoff at the reset (`resetRunCutoff`, device-local); a reinstall or second phone loses it and re-imports the last 56 days.

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

Food data (step 8): the `food` Edge Function searches USDA FoodData Central (`?q=`, Foundation, SR Legacy and Branded) and looks up barcodes on Open Food Facts (`?barcode=`, UPC-A and EAN-13 forms), normalized to one serving per food (`src/food/normalize.ts`). A search result is cached only when it's first logged: `POST {source, external_id, serving_grams}` re-fetches the food from its source and inserts a shared row (`owner_id` null) with the service role, so the app never writes shared foods. The first cached copy wins and is never updated, so earlier snapshots and saved meals keep their serving. Custom foods are ordinary rows with `owner_id` set.

Logging RPCs (all security invoker):
- `log_foods(p jsonb)` inserts a batch (`[{food_id, servings, log_date, meal}]`, or quick add with `food_id` null plus name and values). Snapshots are computed in SQL from `foods` × servings; numbers sent by the app are ignored for real foods.
- `log_saved_meal(p_saved_meal_id, p_log_date, p_meal)` logs every item, setting `source_saved_meal_id`.
- `daily_intake(p_from, p_to)` returns kcal and macros per logged day (the engine's calorie input).

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

Apple Health weight (step 6): `import_body_mass(p jsonb)` upserts one row per day (`[{date, kg}]`, the day's earliest reading) with `source = apple_health`; it never overwrites a `manual` row.

Weigh-in (step 8): `save_weigh_in(p jsonb)` upserts the day's row with `source = manual` (a manual weight replaces an Apple Health one); measurements and `body_fat_pct` (Navy formula, computed on the phone) update the same row, and fields left out keep their value.

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

Weekly check-in (step 8):
- `propose_weekly_targets(p jsonb)` inserts `method = adaptive`, `status = proposed` with the week's averages; `on conflict (user_id, week_start) do nothing`, and it returns whether a row was inserted, so the scheduled function and the phone can both try.
- `decide_weekly_targets(p_week_start, p_accept)`: accept sets `accepted`; keep copies the previous accepted or kept targets into the row and sets `kept`. Both set `decided_at`.
- `update_nutrition_settings(p_profile, p_targets)` updates goal, phase, experience and the rate override; with targets ("recalculate now") it writes this week's row as `method = manual`, `accepted`.
- Schedule: `pg_cron` job `weekly-checkin` calls the Edge Function every 15 minutes through `pg_net` (the URL and anon key come from Vault secrets `project_url` and `anon_key`). The function uses `users.timezone` (IANA) to find users whose local time is on or after the check-in weekday at 04:00 in a week that has no row, excluding the start week, and proposes with the same engine code as the phone. The phone runs the same check at launch and on foreground, and keeps `users.timezone` in step with the device.

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
