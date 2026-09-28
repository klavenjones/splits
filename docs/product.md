# Splits — Product Definition (Phase 1)

Working name: **Splits** (subtitle: "Run, lift, and fuel"). Owner: Klaven Jones. Exported from the Phase 1 Claude Doc on Sep 27, 2026.

> Note: "Onboarding flow" was later moved back INTO scope (see docs/flows.md, Onboarding). Barcode scanning stays post-MVP.

## Problem statement

Hybrid athletes who run and lift juggle separate apps for running, strength, and nutrition, and none of them knows what the others are doing. The result is clashing hard sessions, fueling that ignores training, and no single view of progress.

## Target user

The first user is me: someone training both running and strength each week who wants full control over their workouts. Later audiences are runners getting stronger and lifters learning to run, served by a focus slider (Run-first, Balanced, Lift-first).

## MVP scope

The MVP covers the core loop of plan, build, log, and review; everything smart or social waits.

**In**

- Workout builders: custom strength and run builders, a custom exercise library, and templates
- Planning: a weekly planner and the focus slider (sets the default split only)
- Logging: live lift logging and run import from Apple Health or Strava
- Review: history and progress views
- Nutrition: calorie and macro logging plus an adaptive target engine automated from my weight-loss spreadsheet (see Nutrition engine).

**Out (for now)**

- AI-generated plans, auto progression, and the readiness score
- In-app GPS tracking, barcode scanning, and wearables beyond run import
- Social features, onboarding flow, and payments

## User stories

Nine stories define the MVP; each should be demoable end to end.

- As a user, I can create a custom exercise so my library matches my gym.
- As a user, I can build a strength workout with sets, reps, weight, rest, and supersets, and save it as a template.
- As a user, I can build a structured run with warmup, intervals, and cooldown at target paces.
- As a user, I can drag templates onto days to plan my week.
- As a user, I can see my runs and lifts on the same weekly calendar.
- As a user, I can log a lift live and see last session's numbers for each set.
- As a user, I can import my runs automatically instead of logging them by hand.
- As a user, I can see PRs, estimated one-rep max, weekly mileage, and volume trends.
- As a user, I can log food and see my calories and macros against my targets.

## Success criteria

The MVP succeeds when it replaces my other training apps for 4 straight weeks.

- I use only this app for training for 4 consecutive weeks
- Logging a lift set takes under 5 seconds
- Planning a full week takes under 5 minutes
- No lost data

## Nutrition engine

The MVP automates my Weight\_LOSS\_2024 spreadsheet: it sets starting calorie and macro targets from body stats, then recalculates maintenance each week from logged weight and intake.

**Setup inputs (entered once):** units, start date, weight, sex, body-fat % (typed in, or estimated from height, waist, and neck, plus hip for women, using the Navy formula), training experience, and main goal (build muscle, lose fat, or maintain).

| Step | Rule carried over from the spreadsheet |
| --- | --- |
| Phase | A "maintain" goal always maintains. Otherwise men at 25%+ body fat (women 30%+) are told to cut, and everyone else follows their goal (lose fat → cut, build muscle → lean bulk) |
| Weekly rate | Percent of the latest average bodyweight. Cut: −0.7% above 15% body fat (women 25%), −0.5% above 12% (women 22%), −0.3% at or below. Lean bulk: +0.375% for beginners, +0.25% for intermediates. Maintain: 0. Manual override allowed |
| Starting maintenance | (370 + 9.8 × lean mass in lb) × 1.5 for men, 1.55 for women |
| Daily calories | Maintenance + (weekly rate × weight in lb × 3,500 ÷ 7), floor of 1,500 for men and 1,200 for women, shown as a ±100 range rounded to 50 (when −100 would cross the floor, the range runs from the target to +100) |
| Protein | Grams per lb of bodyweight. Men: 1.0 under 20% body fat, 0.8 at 20–25%, 0.73 above 25%; women: 1.0 up to 25%, 0.8 above |
| Fat | Men: 22% of calories under 25% body fat, 25% at or above; women: 30%; ÷ 9 |
| Carbs | Remaining calories ÷ 4 |
| Weekly update (from week 4) | Missed days carry forward the previous value within the week, starting from the week's first entry; a missed Monday stays empty (week 1's weight takes the start weight), and a week with no entries repeats the previous week's estimate. Each week's estimate = average daily calories + (−change in weekly average weight × 3,500 ÷ days logged). Maintenance is the running mean of the weekly estimates from week 2 on; once 4 weeks have weigh-ins it uses the previous week's running mean. Before that, maintenance uses the start weight with the latest body fat. The weekly rate uses the latest average weight; a manual rate is a fixed amount per week |
| Protein over time | The start weight and start body fat for weeks 1–4; after that the latest week with weigh-ins and the latest measured body fat, changing only when the new value differs by 5 g or more |
| Body-fat re-check | Optional weekly waist and neck entries re-estimate body fat and flag when the recommended phase changes |

Example from the sheet: 205 lb, 32% body fat, male beginner cutting → 2,604 maintenance, 1,887 calories (1,800–2,000), 150 g protein, 52 g fat, 204 g carbs.

**What automation removes**

- Double entry: daily calories come straight from the food log instead of being retyped into a weekly grid.
- Manual math: targets recalculate automatically every week, and missed days carry forward the previous value, as the sheet does.
- Setup friction: weight can come from a daily weigh-in screen or Apple Health (smart scale).

**Hybrid fit:** maintenance is measured from real intake and weight change, so running and lifting volume is already baked in. Exercise calories are never "eaten back"; training-day carb shifts stay post-MVP.

**Nutrition user stories**

- As a user, I enter my stats and goal once and get calorie, protein, fat, and carb targets.
- As a user, I log my weight daily and my intake is pulled from the food log automatically.
- As a user, my targets update each week from my actual results, starting in week 4.
- As a user, I can optionally log waist, neck, and hip to re-estimate my body fat.

**Acceptance test:** for the same inputs and logs, the app's targets match the spreadsheet's output. The app follows the sheet's formulas with one deliberate difference: from week 4 on, the sheet's Monday cell reads a cell three weeks back when Monday is missed; the app leaves it empty, as the sheet does in weeks 1–3. Parity is checked in Jest against a cell-by-cell model of the sheet (`src/engine/sheetModel.ts`), and the check-in screen's details table shows the sheet's columns (L, AW, AL, BE, BD) for comparing by hand.

**Open question:** keep the fixed 3-week wait before adjusting, or start adjusting once 14 days of data exist?

## Competitor teardown

Spend an hour in each app and note 3 things to copy and 3 to avoid; my own frustrations are the most valuable input.

| App | Copy | Watch out for |
| --- | --- | --- |
| Runna | Structured run plans and clear workout cues | Plans feel rigid when the week changes |
| Fitbod | Recovery-aware exercise suggestions | Less control over exercise choice |
| Strong / Hevy | Fast set logging (the speed benchmark) | Little or no running support |
| MyFitnessPal | Food search and saved meals | Clutter and friction in daily logging |

- [ ] Runna teardown
- [ ] Fitbod teardown
- [ ] Strong or Hevy teardown
- [ ] MyFitnessPal teardown

## Data model sketch (superseded)

> The full 18-table schema lives in `docs/data-model.md`. The sketch below is kept for history only.

Runs and lifts are the same kind of object, a Session, so the calendar, training load, and nutrition can connect later.

| Entity | Key fields | Links to |
| --- | --- | --- |
| User | Profile, focus setting | — |
| Exercise | Name, muscle groups, equipment, custom flag | User (if custom) |
| Template | Name, type (lift or run) | User |
| Template item | Lift: exercise, target sets, reps, rest. Run: segment distance or time, target pace | Template, Exercise |
| Session | Date, type, status (planned or completed) | User, Template (optional) |
| Set log | Reps, weight, RPE | Session, Exercise |
| Run log | Distance, duration, pace, heart rate, splits, source (Apple Health, Strava, manual) | Session |
| Food item | Name, calories, macros, source (API or custom) | User (if custom) |
| Food log | Quantity, meal, date | User, Food item |
| Nutrition profile | Units, sex, experience, goal, phase, weekly rate (auto or manual), start date | User |
| Body check-in | Date, weight, optional waist, neck, hip, calculated body-fat % | User |
| Weekly target | Week start, days logged, average weight and calories, maintenance estimate, calorie range, protein, fat, carbs | User |
