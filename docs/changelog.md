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
