# Changelog

One entry per build step.

## Design system setup (2026-09-27)
- Added the Splits design system from `splits-react-native`: `src/global.css` theme (light + dark), `src/theme` (tokens, `useTheme`, `useSplitsFonts`), `src/components` (Icon, Button, IconButton, Tag, Card, AnchorCard, MicroLabel, HeroStat, SessionCard, PlateRack, SetRow, RestTimer, TabBar), Archivo fonts in `assets/fonts`.
- New dependencies: `expo-blur`, `react-native-svg`.
- Replaced the Expo starter screens with DS previews: `/` (Today) and `/lift-logger`.

## Step 0: project setup (2026-09-27)
- App shell: Expo Router tabs in `src/app/(tabs)` (today, plan, nutrition, progress) using the design-system `TabBar`; the center + opens a placeholder `sheets/add` form sheet; `/` redirects to `/today`. DS previews moved to `src/app/dev/`.
- Tooling: Jest (`jest-expo`) with `npm test`, Prettier (with the tailwind plugin) and `eslint-config-prettier`, plus scripts `typecheck`, `format`, `format:check`, `db:types`.
- Supabase: 8 migrations in `supabase/migrations` (helpers, 20 enums, all 18 tables with constraints, RLS plus explicit grants); `supabase/tests/rls_smoke.sql`; client in `src/db` (session stored via `expo-sqlite/localStorage`); `.env.example`.
- Nutrition engine: `src/engine/nutrition.ts` and `src/units.ts`, tested against the spreadsheet fixture (2,604 / 1,887 (1,800–2,000) / 150 / 52 / 204) and a 5-week adaptive-update scenario derived from the sheet's formulas.
- Theme: `typography` and `motion` exports; `TabBar` sizes come from `size` tokens; `docs/design-tokens.md` regenerated from `src/theme/tokens.ts`.
- Docs: weekly-update, rate, protein and fat rules in `product.md` now match the spreadsheet; kcal/kg constant corrected in `data-model.md`; `stack.md` layout uses `src/app`.
- New dependencies: `@supabase/supabase-js`, `expo-sqlite`; dev: `jest`, `jest-expo`, `@types/jest`, `prettier`, `eslint-config-prettier`, `supabase`.

## Step 1: auth, onboarding and settings (2026-09-28)
- Email sign-in with Supabase Auth (6–10 digit code plus a link), structured so Apple and Google can be added (`src/auth/providers.ts`). Session persists; `Stack.Protected` routes signed out → welcome, not onboarded → onboarding, otherwise the tabs.
- Onboarding (about you, training focus, main goal, your targets, connect apps) saves the profile, `nutrition_profiles` and the first accepted `weekly_targets` row through the `save_starting_targets` RPC. Settings: profile name, units, focus, log out.
- Migration `20260928120000_auth_onboarding.sql`: `handle_new_user` trigger and the RPC; `supabase/tests/onboarding_smoke.sql`.
- Auth email templates in `supabase/templates` sent through custom SMTP (Resend); `config.toml` mirrors the hosted auth settings.
- Native `className` on third-party views goes through `styled()` (e.g. `SafeAreaView`).
- New dependency: `@tanstack/react-query`.

## Step 2: exercise library and custom exercises (2026-09-29)
- Built-in library of 193 exercises (strength plus 16 conditioning moves, no running), seeded by migration from `supabase/seed-data/exercises.json`; names and muscles curated from free-exercise-db (Unlicense), how-to text written for Splits.
- Private `exercise-media` Storage bucket with per-user folder policies, and an `exercises (owner_id)` index (`20260929120000_exercise_media.sql`); `supabase/tests/exercise_library_smoke.sql`.
- Screens: exercise library (search, muscle and equipment filters, your custom exercises first, A–Z with a scrubber), create/edit custom exercise with an optional photo or ≤30 s video, and exercise detail with history, charts (empty states for now) and how to. Reached from the Plan tab.
- Reusable: `ExerciseRow`, `ExerciseThumbnail` (muscle-group glyphs), `SearchField`, `Checkbox`, `EmptyState`, `AlphabetScrubber`, `MediaUploadField`, `DemoPlayer`, `NumberedCueList`, and the multi-select `ExercisePicker`, opened with `pickExercises()` (`/dev/picker` is a harness until step 3 uses it).
- Pure, tested modules in `src/exercises` (vocab, filter, sections, validate, media, picker requests, seed data checks).
- New dependencies: `expo-image-picker`, `expo-video`, `expo-file-system`.

## Step 2b: exercise illustrations (2026-09-30)
- 33 built-in exercises show Everkinetic / wger.de line art (CC-BY-SA 3.0, via wger) on the How to tab, whole on a paper card in both themes, with a tappable credit line; Settings → credits lists sources.
- New nullable column `exercises.media_credit`; built-in media lives in `exercise-media/builtin/`, readable by signed-in users and written only by the service role (`20260930120000_exercise_media_credit.sql`, plus `…120100_fix_wger_source_urls.sql` for the wger page links).
- Pipeline in `scripts/wger-images.mjs` and `scripts/build-exercise-media-migration.mjs` (see `supabase/seed-data/README.md`). Only line art is used: wger's user-uploaded photos were excluded because several look copied from other sites.
- WorkoutX was evaluated and not used: its data and GIFs appear to be ExerciseDB / Gym Visual content with no license shown.

## Step 3: lift and run templates (2026-10-01)
- Plan tab: week | templates; the template library has all / lift / run filters, a 2-column card grid, and edit / duplicate / delete from each card's menu. The exercise library link moved below it.
- Lift template builder: add exercises with the step-2 picker; sets, rep range and rest per exercise in a targets sheet; drag to reorder (in-house `SortableList`, no new dependency); supersets via "superset with next" / "leave superset", with the rest held on the last member.
- Run template builder: warmup, steady, cooldown and repeat blocks (interval + recovery × n); each segment by distance or time with a pace (± tolerance), heart-rate zone or effort target and voice cues, in an edit-segment sheet; a workout-shape strip and computed distance and duration.
- Migration `20261001120000_template_rpcs.sql`: `save_template` (atomic, validates groups and targets) and `duplicate_template`; no new tables or columns. `supabase/tests/templates_smoke.sql`.
- Pure, tested: `src/templates/runSegments.ts` (rows ↔ blocks, expansion that skips the last round's trailing recovery, totals, shape), `liftTemplate.ts`, `validate.ts`; pace, duration and distance formatting in `src/units.ts`.
- Small fixes: the small `Tag` size rendered no text on native (`text-micro` isn't a font size there).

## Step 4: week planner, planned sessions and Today v1 (2026-10-02)
- Plan → week: week switcher, RUN / LIFT / FOCUS tiles, day rows with session cards, "add a session" on empty days (and + on busy ones), press-and-hold to drag a session to another day (in-house `WeekBoard`, auto-scrolls near the edges; past days refuse the drop). The Plan tab now opens on the week.
- Fill week from focus: a preview of the focus split (Balanced = Mon/Wed/Fri lift, Tue/Thu/Sat run) pre-filled by rotating your templates; change any day, then add. Only empty days that haven't passed are filled.
- Planned session detail (targets from the template, start placeholder until step 5, reschedule, skip, restore, remove), a reschedule sheet with coach notes (heavy legs before a hard or long run; two upper days in a row), and a skip dialog with "just skip" (optional reason) or "shift the week".
- Today v1: Monday-first plate rack from real sessions (tap a day to see it), the "up next" card with the first exercise's target, other sessions as cards, "next up" on rest days, and weekly done / planned totals. The daily-targets card is off Today until step 8.
- Migration `20261002120000_week_planner.sql`: `plan_sessions` and `shift_sessions`; no new tables or columns. `supabase/tests/sessions_smoke.sql`.
- Pure, tested: `src/plan/week.ts`, `fill.ts`, `coach.ts`, `describe.ts`.
- Fix: bare `text-label` / `text-micro` / `text-caption` classes gave huge line heights on native, stretching the plate rack and hiding the tab bar labels; they now use explicit sizes.

## Step 5: live workout logging, offline first (2026-10-03)
- Start a planned lift (session detail, Today's up-next, the + sheet) or an empty workout. The template is copied into the workout; weights and reps are pre-filled from last time.
- Lift logger: thumbnails open a demo sheet; set rows show previous, lb/kg and reps inputs (tabular numerals), optional RPE and warm-up via the set badge, check to complete; add set, add exercise (picker with "suggested for this workout" from muscles not trained today, and last-time lines), swap (same muscle, your equipment or any, "also update the template"). Supersets alternate and rest after the round.
- Rest timer: starts on completing a set; −15 / +15 / skip; runs off an absolute end time so it survives backgrounding and restarts; a local notification fires when rest ends.
- Offline: every edit is written to SQLite first (`src/local`), mirrored in a Zustand store, and synced whole and idempotently with `sync_workout` a few seconds after edits, on finish, when the connection returns, on foreground and at launch (backoff 5 s → 5 min; polls while offline). The app reopens into an in-progress workout after a kill; a resume bar sits above the tab bar. The TanStack Query cache is persisted and queries pause while offline, so the app opens without signal.
- Summary: duration, volume, sets, PRs with est. 1RM (Epley), how did it feel, note, and "update the template?" after swaps or additions (applied through `save_template`, after the sync if offline). Today and Plan show a workout finished offline as done before it syncs.
- Migration `20261003120000_workout_logging.sql`: `sync_workout`, `discard_workout`, `previous_sets`, `exercise_bests`; the set-number uniqueness is now deferrable. `supabase/tests/workout_smoke.sql`.
- Pure, tested: `src/engine/metrics.ts`, `src/workout/model.ts`, `suggest.ts`, `templateUpdate.ts`, and the SQLite repo and sync against an in-memory SQLite.
- New dependencies: `zustand`, `expo-notifications`, `expo-network`, `expo-crypto`.

## Step 6: Apple Watch runs from Apple Health (2026-10-04)
- Connect Apple Health from Today's card or Settings → Apple Health (reads workouts, distance, heart rate, body mass). The first import covers the last 8 weeks; after that an anchored query picks up only new or deleted runs, on launch, on foreground, when the connection returns, on pull to refresh, and in the background when HealthKit wakes the app.
- Each run is sent to `import_run`, idempotent on the HealthKit UUID (`run_logs.external_id`). A run on the same day as a planned run with no run yet completes it (closest planned distance wins, "matched automatically"); otherwise it becomes an unplanned run session: "needs a match" when it's from the last 7 days, an extra run when older. Today shows run cards (distance, time, pace, on target) and "needs a match" cards; the link sheet moves a run to a planned run of that week or keeps it as an extra run (`link_run`). Workouts deleted from Health are undone (`remove_imported_run`).
- Splits per mile or km come from the workout's distance samples (interpolated at each boundary, paused time left out), with heart rate per split. Run detail: average pace against target ("4 sec faster than target"), distance, time, heart rate, the target with an on-target badge, and the splits table. The target is derived from the template's segments (pace targets, or estimated effort paces).
- Weight: the earliest reading of each day is imported into `body_checkins` (`import_body_mass`), never over a manual weigh-in.
- Weekly distance counts what was actually run, including extra runs.
- Migration `20261004120000_run_import.sql`: `run_logs.match`, imported rows must have an `external_id`, and the RPCs above. `supabase/tests/run_import_smoke.sql`.
- Pure, tested: `src/health/splits.ts`, `src/health/importer.ts` (with a fake HealthKit), `src/engine/runs.ts`.
- New dependencies: `@kingstinct/react-native-healthkit@15.1.0`, `react-native-nitro-modules`, `expo-dev-client`, plus CocoaPods on the Mac. The app now runs as a dev build (`npm run ios`) instead of Expo Go.

## Step 7: Progress tab and exercise history (2026-10-05)
- Progress → Strength: weekly volume for 8 weeks (bar chart, current week bold; leads with last week until this week has sets), change vs the first week, recent PRs, and est. 1RM for key lifts (the 3 most-logged weighted exercises in 12 weeks) with the 4-week change.
- Progress → Running: this month, weekly average (8 full weeks), easy pace, weekly distance bars, easy-run pace trend (inverted: up is faster; planned easy runs only), recent runs opening run detail.
- Progress → Body: 7-day average, change since the starting weight, body fat, weight chart with daily dots and the 7-day line (1M / 3M / 6M / all), measurements vs start.
- Exercise detail: History (latest sessions with set chips, PR set with a trophy, warm-ups marked W; opens here when there's history) and Charts (current est. 1RM with best set and best volume, 12-week est. 1RM chart; reps for bodyweight exercises).
- Migration `20261005120000_progress.sql`: `exercise_session_bests`, `exercise_history` (derived; about 10 ms on the hosted database). `supabase/tests/progress_smoke.sql`. Pure, tested: `src/engine/progress.ts`, `isEasyRun`.
- Speed: one query per view, cached on the phone (persisted), charts draw once. First chart in the simulator dev build: strength 436 ms (346 ms cached), running 685 ms, body 215 ms.
- New dependencies: `victory-native` 42.0.1, `@shopify/react-native-skia` 2.6.2 (dev client rebuilt).


## Step 8: food logging, weigh-ins and the weekly check-in (2026-10-06)
- Nutrition tab (food diary): date switcher, calories left as the hero with `CalorieBar` and `MacroBars`, breakfast / lunch / dinner / snacks meal cards (tap a food to change servings or delete it), a check-in reminder and a link to nutrition settings.
- Food search sheet: USDA search and your foods behind one field, all / my meals / my foods, recent (most logged first), multi-select with an "after this" footer, and one-tap batch logging. Food detail with a servings stepper, quick add (macros checked against calories), custom foods, saved meals (create, edit, log in one tap), and a barcode scanner (Open Food Facts, with a "create it" path when not found).
- Weigh-in sheet: number pad, yesterday and the 7-day average, optional waist / neck / hip with a Navy body-fat estimate and a phase-change note. One `body_checkins` row per day; Apple Health weight fills it, and a manual weigh-in replaces it.
- Weekly check-in: on the check-in day (from 04:00 local) the week's averages are computed and targets proposed; the screen shows the body card, the week, maintenance and why it moved, a details table in the sheet's columns, and keep / accept. Proposed by the `weekly-checkin` Edge Function (pg_cron every 15 minutes, user time zones) with an on-device fallback at launch and foreground.
- Engine: the weekly update now matches `Weight_LOSS_2024.xlsx` (within-week carry-forward, empty weeks, the protein chain with its 5 g step, fixed weeks 1–4), minus the sheet's week-4+ Monday bug; checked by a 500-case property test against a cell-by-cell model of the sheet. Check-in timing in `src/engine/checkin.ts`.
- Today: fuel card (kcal left, macro bars), morning weigh-in card, and a "check-in ready" prompt. + sheet: log food, log weight and quick add now work. Settings → goal and targets: goal, phase, experience, a manual weekly rate, target history and "recalculate targets now".
- Edge Functions `food` and `weekly-checkin`, sharing the engine through `npm run functions:sync`. Secrets: `USDA_API_KEY` (function secret); Vault `project_url` and `anon_key` for the cron call.
- Migrations `20261006120000_nutrition_logging.sql` (`log_foods`, `log_saved_meal`, `save_weigh_in`, `propose_weekly_targets`, `decide_weekly_targets`, `update_nutrition_settings`, `daily_intake`; no new tables or columns), `…120100_checkin_schedule.sql`, `…120200_pg_net_schema.sql`. `supabase/tests/nutrition_smoke.sql`.
- New dependency: `expo-camera` (dev client rebuilt; reinstall on the phone with `npx expo run:ios --device`).

## Step 9: Sentry and EAS (2026-10-07)
- Sentry (`@sentry/react-native` 7.11 with the Expo plugin): crashes, JavaScript errors and performance traces (app start, navigation, `logger.start`, `logger.set`, `sync.pass`, `health.import`, `checkin.propose`). Release builds only; the user is identified by id only.
- Scrubbing (`src/lib/scrub.ts`): no set weights, reps, food logs, body weight, measurements or health data in any event, transaction or breadcrumb; PostgREST row details, URL query strings, console breadcrumbs and frame variables are removed. Tested rule by rule with a mutation check.
- Sync failures are reported once per workout and error code, with replay context (session id, step, revisions, pending exercise and set counts); offline isn't reported. Settings shows "N workouts to sync" while anything is unsent.
- Error boundaries with fallbacks: root, check-in screen, Settings → Apple Health, Today's plan / check-in / fuel / body cards. Failed Apple Health imports and check-in preparation are reported and shown with "try again".
- Settings → diagnostics: version, environment, reporting status, sync status, test error, JavaScript and native test crashes.
- EAS: `eas.json` (development, preview, production → TestFlight), remote build numbers, `usesNonExemptEncryption: false`; Metro uses `getSentryExpoConfig`; the Xcode build phase uploads source maps and dSYMs for Release builds (Debug builds skip it). Scripts `ios:release` and `build:ios`.
- New dependency: `@sentry/react-native` (dev client rebuilt).
- TestFlight prep: EAS project `@klaven/splits` created and linked (`extra.eas.projectId`, `owner` in `app.json`); `expo-doctor` passes 21/21.

## Sentry error mitigation (2026-10-03)
- Health import no longer reports expected failures: HealthKit "protected data inaccessible" (phone locked; `runImport` skips while `isProtectedDataAvailable()` is false and retries on foreground) and lost-connection fetches (`isOfflineError`), with a matching `beforeSend` filter.
- Import needs a live session for the same user (`importNow`), avoiding 42501/23503 from stale or expired sessions.
- Reports keep the original error as `cause`, carry a `step` tag (`import_run`, `import_body_mass`, `healthkit_read`, ...) and group by area, error and step; the import de-dupes per step.
- Diagnostics test buttons are hidden in production-profile builds.
- Hosted DB checked: `import_body_mass` and the other import functions already grant `execute` to `authenticated`; no migration needed.
- Still to do by hand: set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` as EAS secrets so release builds upload source maps.

## Delete planned sessions from the Plan tab (2026-10-04)
- Planned session cards on Plan → week have a three-dot menu ("remove from plan") and swipe left to reveal "remove". Both ask "Remove X?" first (the shared `confirmRemovePlanned`, also used by the session screen); a cancelled swipe closes the card. VoiceOver gets a "Remove from plan" action.
- Swipe maths in `src/plan/swipe.ts` (tested). Completed, skipped and imported sessions are unchanged. No schema, dependency or `useDeleteSession` change.

## Reset training data (2026-10-07)
- Settings → account → "reset training data" opens a sheet that lists what is deleted and kept, and enables "reset" only after you type RESET. It deletes every session (completed, skipped, in progress, planned) with its sets, run logs and splits, so PRs, bests and progress clear too. Templates, custom exercises, nutrition and body data, targets, profile and settings stay.
- `reset_training()` (migration `20261007120000_reset_training.sql`, no new tables or columns) runs as the caller. `supabase/tests/reset_training_smoke.sql` checks the cascade, what stays, user isolation, repeating and signed-out.
- On the phone (`src/lib/resetTraining.ts`): sync is paused, the server is cleared first (so an offline failure loses nothing here), then SQLite workouts and the previous / bests caches, the live workout and rest timer, Apple Health's import window (`resetRunCutoff`: only runs from the reset on import; body weight is untouched) and the query cache, including the saved copy. Partial failure says so and is safe to retry.
- Known limit: the Health cutoff is on the device, so a reinstall or another phone re-imports the last 56 days of runs.
- Migration applied to the hosted project; `src/db/types.ts` regenerated with `npm run db:types`.

## CI/CD with EAS Workflows (2026-10-04)
- `.eas/workflows/deploy-main.yml`: on every push to `main` (not docs-, `supabase/`- or markdown-only), run `typecheck`, `lint` and `test`; then fingerprint the project. A JavaScript-only change publishes an EAS Update to the `production` branch; a native change builds iOS (`production` profile) and submits to TestFlight. `[eas skip]` skips a run.
- New dependency: `expo-updates` (native; dev client and production builds need a rebuild). `app.json` gets `runtimeVersion: { policy: "fingerprint" }` and `updates.url`; the `production` build profile gets `channel: "production"`.
- The first push after this lands changes the fingerprint, so it makes a full build and submits it to TestFlight. Install that build; later JavaScript-only pushes arrive as updates (applied at the next cold start).
- Setup done by hand: the repo is linked in expo.dev (GitHub), and `submit.production.ios.ascAppId` in `eas.json` is the App Store Connect app ID.
