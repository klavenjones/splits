# Splits — Technical Stack

Decided Sep 2026. iPhone first (Android later), solo developer, TypeScript.

## Stack

| Layer | Choice | Why |
|---|---|---|
| App | React Native + Expo (TypeScript, strict) | One language across app, engine, and backend functions; Android stays open |
| Navigation | Expo Router | File-based routes matching the 5 tabs and sheets |
| Backend | Supabase: Postgres, Auth, Storage, Edge Functions, scheduled functions | Relational model; RLS; no servers to run |
| Auth | Supabase Auth — email magic link now, Sign in with Apple when on the paid Apple Developer Program | |
| Local / offline | `expo-sqlite` for the active workout; sync to Supabase on Finish or when back online | Logging must never fail in a gym without signal |
| Server state | TanStack Query | caching, retries, background refetch |
| App state | Zustand | live workout, timers, UI state |
| Health data | HealthKit via `@kingstinct/react-native-healthkit` (verify maintenance before adding; needs an Expo dev build, not Expo Go) | Apple Watch runs and smart-scale weight |
| Food data | USDA FoodData Central + Open Food Facts (barcode); cached into `foods` on first log | Free; accurate whole foods; barcode coverage |
| Charts | Victory Native (Skia) | smooth, themeable |
| Media | Supabase Storage for custom-exercise photos/videos; `expo-av`/`expo-video` for silent loops | |
| Notifications | `expo-notifications` local only (rest timer end, morning weigh-in) | no push server needed |
| Errors | Sentry (Expo integration) with PII scrubbing | |
| Builds | EAS Build → TestFlight (paid Apple account); `npx expo run:ios` on a Mac with a free account while starting | |
| Repo | GitHub, conventional commits, PR per build step | |

Post-MVP native extras (small Expo native modules in Swift): WorkoutKit (push interval templates to Apple Watch), Live Activities (rest timer on lock screen). Android later adds Health Connect.

## Project layout (target)

```
src/
  app/                    # Expo Router routes (SDK 57 default location)
    (tabs)/today, plan, nutrition, progress
    sheets/add            # center "+" action sheet
    onboarding/
    workout/[sessionId]
    sheets/               # picker, swap, demo, food-search, weigh-in
    dev/                  # design-system previews, not linked from the app
  engine/nutrition.ts     # pure functions + tests
  engine/metrics.ts       # e1RM, PRs, volume, mileage (pure)
  units.ts                # metric <-> imperial, display only
  db/                     # supabase client, generated types, queries
  local/                  # expo-sqlite schema + sync for active workout
  health/                 # HealthKit import + matching
  food/                   # USDA + OFF clients, normalizer
  store/                  # zustand stores
  theme/                  # tokens (export from Claude Design; see docs/design-tokens.md)
  components/             # design-system components
supabase/migrations/      # SQL, one file per change
supabase/tests/           # SQL checks (RLS smoke test)
docs/                     # this folder
```

## Conventions

- **Units:** store metric (kg, m, cm, s, s/km). Convert in `src/units.ts` for display only.
- **Dates:** calendar-day fields are local `date`s; events are UTC `timestamptz`. Weeks start Monday.
- **Engine purity:** `src/engine/*` has no I/O, no dates from `Date.now()` (pass them in), 100% unit-tested.
- **Offline first for the logger:** every set write hits SQLite synchronously before any network call.
- **Snapshots:** `food_logs` copy nutrition values at log time; `session_exercises` copy template rows at start.
- **RLS everywhere:** every table with `user_id` has policies; built-in `exercises`/`foods` (owner null) are read-only to users.
- **Dependencies:** ask before adding one; prefer Expo SDK modules.
- **Testing:** Jest (`jest-expo`), `npm test`; unit tests for engine and metrics; a small integration test for offline sync; manual device test for HealthKit.
- **Secrets:** `.env` only (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `USDA_API_KEY`, `SENTRY_DSN`); never in prompts or commits.

## Build order

0. Project setup: scaffold, schema migrations, generated types, nutrition engine + tests, theme tokens.
1. Auth + onboarding + settings.
2. Exercise library + custom exercises (+ picker sheet component).
3. Lift and run template builders + template library.
4. Week planner + planned-session detail + Today (v1).
5. Live workout logging (offline) + summary + demo sheet.
6. HealthKit run import + matching + run detail.
7. Progress tab + exercise history/charts.
8. Nutrition: food logging, weigh-ins, weekly check-in (Edge Function + on-device fallback), Today (v2).
9. Sentry + EAS/TestFlight.
