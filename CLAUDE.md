# Splits — hybrid training app (run + lift + fuel)

iPhone-first React Native / Expo app for hybrid athletes: run plans, strength logging, and adaptive calorie targets in one plan. Solo project; the developer is also the first user.

## Read these before planning any task
- `docs/product.md` — problem, MVP scope, user stories, **nutrition engine rules** (the spreadsheet logic)
- `docs/data-model.md` — the 18-table Postgres schema, enums, constraints. **Do not invent tables or columns; propose changes here first.**
- `docs/flows.md` — page inventory and the 17 user flows, plus the hybrid coaching rules
- `docs/design-tokens.md` — colors, type, spacing, radius, motion, component names
- `docs/stack.md` — stack decisions, project layout, build order
- `docs/screens/` — hi-fi screenshots (reference layouts; match them)
- `docs/Weight_LOSS_2024.xlsx` — the spreadsheet the nutrition engine must reproduce

## Ground rules
- TypeScript strict. Expo Router. Supabase. See `docs/stack.md` for the full list.
- Store metric units internally (kg, m, cm, s, s/km); convert only in the UI.
- Weeks start on Monday. Calendar-day fields are local dates; events are UTC timestamps.
- `src/engine/*` is pure (no I/O, no `Date.now()`), fully unit-tested. Engine test fixture: 205 lb, 32% body fat, male, beginner, lose fat → 2,604 maintenance, 1,887 kcal (1,800–2,000), 150 g protein, 52 g fat, 204 g carbs.
- The lift logger is offline-first: every set is written to SQLite before any network call.
- Snapshot pattern: food logs copy nutrition values at log time; sessions copy template rows at start.
- Row-level security on every user-owned table.
- Ask before adding a dependency. Prefer Expo SDK modules.
- Never put secrets in code, prompts, or commits; use `.env`.
- Use design tokens from `src/theme` (never hard-coded colors or sizes). Component names follow `docs/design-tokens.md`.

## Working style
- Plan first (plan mode). Show: files to create/change, migrations, new dependencies, and how the plan maps to `docs/data-model.md` and `docs/flows.md`.
- One build step per PR (see build order in `docs/stack.md`).
- Each step ends with: tests passing, the acceptance check from the step prompt demonstrated, and a short note in `docs/changelog.md`.
- If a design or data-model question is ambiguous, ask rather than guess.
