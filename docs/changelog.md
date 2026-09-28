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
