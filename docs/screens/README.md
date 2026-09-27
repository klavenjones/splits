# Splits: high-fidelity screens

Splits is an iPhone app for hybrid athletes who both run and lift. It combines run plans, strength logging and adaptive nutrition in one product. This folder holds the 49 high-fidelity screens designed so far, grouped by flow, as PNG exports at 2× (786 px wide; 393 pt iPhone frames).

- **Design canvas:** "Splits · Example Screens" (Design artifact on claude.ai), which holds the live, editable versions of every screen.
- **Design system:** "Splits" (Design System artifact on claude.ai): tokens, components, and usage guidelines.
- **Exported:** Sep 27, 2026.

## How to read these screens

- **Frame:** 393 × 852 pt, light mode unless the file name ends in `-dark`. Screens with more content than one viewport are exported taller so the whole scroll shows.
- **One interaction state per screen:** each screen shows one key state (a pressed row, a focused field, an open sheet), noted in the tables below.
- **Color carries meaning:** Fiery Red is LIFT, Steel Blue is RUN (always with navy text on it), Oxblood is FUEL, and Heather is BODY. Everything else is navy on cream. Color is never the only signal: it always comes with a tag, icon, letter key or signed word.
- **Voice:** lowercase titles and buttons ("start workout"), UPPERCASE micro labels (SET, PREVIOUS), exact numbers with units (`182.4 lb`, `9:45 /mi`, `1,240 kcal left`).
- **Dark mode:** a navy base with no shadows. Each elevation step is a lighter navy (page → card → sheet → floating), and text is cream-tinted.

## Folder map

| Folder | Flow | Screens |
|---|---|---|
| `01-core/` | Core screens | 3 |
| `02-onboarding/` (+ `dark/`) | Onboarding | 6 + 6 dark |
| `03-add-exercise/` | Lift logger: add an exercise mid-workout | 4 |
| `04-swap-and-finish/` | Lift logger: swap an exercise and finish | 2 |
| `05-food-logging/` | Food logging | 5 |
| `06-weigh-in/` | Weigh-in and measurements | 3 |
| `07-run-import/` | Run import from Apple Health | 3 |
| `08-plan/` | Plan tab: week and templates | 5 |
| `09-exercise-library/` | Exercise library | 3 |
| `10-progress/` | Progress tab | 3 |
| `11-settings/` | Settings | 2 |
| `12-dark-mode/` | Dark mode: screens used in dim conditions | 4 |

---

## 01 · Core screens

The first three screens that set the visual system: the home screen, the in-workout logger and the weekly adaptive check-in.

| File | Screen | What it shows |
|---|---|---|
| `today.png` | Today | Date and "today" title, the week plate rack (5-day streak), "up next" anchor card for Upper body A with **start workout**, the planned easy run, calories left with macro bars, and the morning weigh-in (182.4 lb). Tab bar with the center + action. |
| `lift-logger.png` | Lift logger | Upper body A in progress: elapsed, volume and exercise count, bench press with warm-up, completed and current sets (set 3 live), upcoming exercises, and the frosted rest timer (1:24) docked at the bottom. |
| `weekly-check-in.png` | Weekly check-in | Week 6: the 7-day average weight (183.1 lb, −0.8), the week's runs and lifts, the updated maintenance estimate with "why it moved", and new calorie and macro targets to accept or keep. |

## 02 · Onboarding

Shown once on first launch. Five steps with a step progress bar and a full-width continue pill; titles are lowercase. Every screen has a dark-mode twin in `02-onboarding/dark/`.

| File | Screen | What it shows |
|---|---|---|
| `01-welcome.png` | Welcome | The "splits" wordmark and plate motif, "run, lift, and eat from one plan.", continue with Apple / sign up with email. |
| `02-about-you.png` | About you | Units, sex, height, weight and body fat, with "not sure? estimate it" expanded to waist and neck. |
| `03-training-focus.png` | Training focus | A run ↔ lift slider (thumb shown **pressed**), a preview of the typical week, current weekly mileage and lifting experience. |
| `04-main-goal.png` | Main goal | Goal options, the recommended phase (cut, at about 32% body fat), and the weekly rate with a "set manually" toggle. |
| `05-starting-targets.png` | Starting targets | Daily calories and macros, estimated maintenance and daily deficit, and a note that targets stay fixed for 3 weeks, then adjust at each check-in. |
| `06-connect-apps.png` | Connect apps | Apple Health, Strava and a morning weigh-in reminder as toggles; finish setup / skip for now. |

## 03 · Lift logger: add an exercise mid-workout

Fiery Red is the only accent in the logger. Pickers open as bottom sheets over the dimmed logger.

| File | Screen | What it shows |
|---|---|---|
| `A1-lift-logger.png` | Lift logger | Upper A in progress (13/16 sets) with finished exercises collapsed, the current exercise, and the **add exercise** button shown pressed. |
| `A2-exercise-picker.png` | Exercise picker | A sheet with filters, "suggested for this workout" (muscles not trained today), recent exercises, multi-select checkboxes, "add as superset" and **add 2 exercises**. |
| `A3-search-results.png` | Search results | Search for "curl" with the field focused, 4 results, and "create 'curl' as a custom exercise". |
| `A4-exercises-added.png` | Exercises added | Face pull and hammer curl added to the end of the workout (14/21 sets) with a "2 exercises added" confirmation. |

## 04 · Lift logger: swap an exercise and finish

| File | Screen | What it shows |
|---|---|---|
| `B1-swap-exercise.png` | Swap exercise | A "swap bench press" sheet: same muscles (chest, triceps), an equipment filter, best matches with one swap pressed, and "also update Upper A". |
| `B2-workout-summary.png` | Workout summary | "workout complete": the share card (14,200 lb volume, 2 PRs), personal records, an "update Upper A?" prompt for the swap, how it felt, a note, and **save workout**. |

## 05 · Food logging

Fuel context: Oxblood is the only accent. Logging a common food takes two taps, and every screen that changes intake says what's left after it. Numbers use tabular numerals.

| File | Screen | What it shows |
|---|---|---|
| `01-food-diary.png` | Food diary | Calories left and macros for today, meals (breakfast, lunch, dinner, snacks) with totals and add buttons, and the Monday check-in reminder. |
| `02-food-search.png` | Food search | "add to breakfast": search, scan barcode / quick add / copy a meal, recent foods with two added, and the intake impact line with **log breakfast**. |
| `03-food-detail.png` | Food detail | Chicken breast, grilled: serving size, number of servings, 281 kcal with macros, the intake impact, and **add to dinner**. |
| `04-quick-add.png` | Quick add | Quick add to dinner: optional name, calories (focused) and macros, with a check that the macros add up. |
| `05-create-saved-meal.png` | Create saved meal | A new saved meal with four items, the meal total (525 kcal), and a note that saved meals log in one tap. |

## 06 · Weigh-in and measurements

Body context: Heather accent only. Weight is neutral data, so there's no red for a gain and no celebration for a loss.

| File | Screen | What it shows |
|---|---|---|
| `01-weigh-in.png` | Weigh-in | A sheet over Today: 203.8 lb at hero size, yesterday and the 7-day average, the number pad with a key pressed, add measurements, and **save**. |
| `02-add-measurements.png` | Add measurements | Optional waist (focused) and neck, and estimated body fat (31%, down from 32%, using the Navy formula). |
| `03-phase-change-prompt.png` | Phase change prompt | A calm dialog: "time to change phase?" at 15% body fat, with maintenance or a lean bulk as options and a Heather medallion. |

## 07 · Run import from Apple Health

Splits never records a run; it imports them. Steel Blue with Deep Navy text. Faster or slower always reads as a signed time plus a word ("−0:15 faster").

| File | Screen | What it shows |
|---|---|---|
| `01-import-cards-on-today.png` | Import cards on Today | Two imported runs: one matched automatically to the planned easy run, one needing a match (link button pressed). |
| `02-run-detail.png` | Run detail | Easy run from Apple Health: route map, average pace 9:26 /mi (4 sec faster than target), distance, time and heart rate, "on target", and per-mile splits against the target. |
| `03-link-run-sheet.png` | Link run sheet | Link a 3.2 mi run to one of this week's planned runs, or keep it as an extra run. |

## 08 · Plan tab: week and templates

Runs and lifts are equals: Steel Blue always means run and Fiery Red always means lift. Planned sessions have drag handles.

| File | Screen | What it shows |
|---|---|---|
| `01-plan-week.png` | Plan week | Week of Sep 21 to 27: the week focus, days with run and lift sessions, done and planned, with drag handles on planned ones. |
| `02-template-library.png` | Template library | Lift templates (upper A, lower A, upper B) and run templates (intervals, easy, long) with a filter and **new template**. |
| `03-lift-template-builder.png` | Lift template builder | A new lift template: 6 exercises, 22 sets, about 45 minutes, a superset, and one exercise being dragged. |
| `04-run-template-builder.png` | Run template builder | A new run template: the workout shape bar strip, warmup, a repeat block (6 × interval + recovery) with one segment pressed, and cooldown. |
| `05-edit-segment-sheet.png` | Edit segment sheet | Edit an interval: measure by distance, pace target (focused), and voice cues; the watch runs it and splits compare after import. |

## 09 · Exercise library

The Lift accent is used sparingly. Every exercise uses a muscle-group glyph thumbnail, never a photo. Custom exercises are first-class.

| File | Screen | What it shows |
|---|---|---|
| `01-exercise-library.png` | Exercise library | Search, muscle filter chips, "your custom exercises", an A–Z list, and an alphabet index being scrubbed. |
| `02-create-custom-exercise.png` | Create custom exercise | Landmine press: name (focused), primary and secondary muscles, equipment, how you track it, and notes. |
| `03-exercise-detail.png` | Exercise detail | Bench press: est. 1RM trend over 12 weeks (+14 lb), and recent sessions with their sets. |

## 10 · Progress tab

Each view leads with the one number that answers "am I improving?" and owns one color. Charts highlight the current week and label values directly.

| File | Screen | What it shows |
|---|---|---|
| `01-strength.png` | Strength | Weekly volume (46,100 lb, +21% vs 8 weeks ago), recent PRs, and est. 1RM for key lifts. |
| `02-running.png` | Running | Weekly miles for 8 weeks, easy-run pace (inverted so up is faster; −0:30 /mi faster), and recent runs. |
| `03-body.png` | Body | Weight as daily dots with a 7-day average line, a range toggle, and measurements vs start (waist, neck, body fat). |

## 11 · Settings

Opened from the profile avatar on Today. The quietest part of the app: neutral grouped lists, with current values on the right. The only accents are the toggles and the Fuel-colored targets.

| File | Screen | What it shows |
|---|---|---|
| `01-settings.png` | Settings | Profile card, then training, nutrition, connected apps and account sections; the "goal and targets" row is shown **pressed**. |
| `02-goal-and-targets.png` | Goal and targets | Main goal, phase (cut, "recommended"), experience, the weekly rate (−1.4 lb per week) with a "set manually" toggle, target history, and **recalculate targets now**. |

## 12 · Dark mode: screens used in dim conditions

Dark versions of the screens used in dim gyms and on early-morning runs, converted first for review. The layouts are identical to light mode; only color and elevation change. The remaining flows are still to be converted.

| File | Light version |
|---|---|
| `lift-logger-dark.png` | `01-core/lift-logger.png` (with the rest timer) |
| `today-dark.png` | `01-core/today.png` |
| `weigh-in-dark.png` | `06-weigh-in/01-weigh-in.png` |
| `run-detail-dark.png` | `07-run-import/02-run-detail.png` |

**Dark-mode decisions**

- **No shadows:** elevation comes from lighter navy tones.
- **Rest timer and tab bar:** they sit on the lightest navy, above the cards.
- **Up next card:** it's navy-800 rather than a cream panel, so it doesn't glare in a dim room.
- **Destructive buttons:** they use a lighter red with a navy label.

All accents pass WCAG AA on every dark surface. Fiery Red text measures 5.2–9.1:1 and Oxblood text 7.1–12.3:1.
