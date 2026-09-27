# Splits — Pages and User Flows

Wireframes (low-fi) and hi-fi screens: Figma file "Hybrid Fitness App — Low-Fi Wireframes"
https://www.figma.com/design/drxyNFe2mA87l0QLLa2fy8 — pages **Wireframes** and **Hi-Fi**.

## Navigation

Five bottom tabs: **Today · Plan · [+] · Nutrition · Progress**.
The center **+** is not a page; it opens an action sheet: Start workout, Log food, Log weight, Quick add.
Settings opens from the profile avatar on Today.

## Page inventory (31 pages + 2 media views)

### Onboarding (first launch only)
| Page | Purpose |
|---|---|
| Welcome / sign in | Create an account or sign in (email magic link now; Sign in with Apple later) |
| About you | Units, sex, height, weight, body fat (or estimate from waist/neck via Navy formula) |
| Training focus | Slider Run-first / Balanced / Lift-first; weekly mileage; experience |
| Main goal | Lose fat / Maintain / Build muscle; recommended phase; weekly rate (auto or manual) |
| Starting targets | Calories, range, macros, maintenance, deficit; note on week-4 adjustment |
| Connect apps | Apple Health, Strava, morning reminder toggles (skippable) |

### Today
| Page | Purpose |
|---|---|
| Today | Plate-rack week strip, today's sessions, calories left + macro bars, weigh-in card, run import cards |
| Weigh-in sheet | Number pad for today's weight; "Add measurements" |

### Plan
| Page | Purpose |
|---|---|
| Week calendar | Sessions by day, add, press-and-hold to move, weekly totals, focus tile |
| Planned session detail | Exercise list with targets; Start, Reschedule, Skip |
| Reschedule sheet | Pick a day; coach notes on conflicts |
| Skip dialog | Just skip / shift the week; optional reason |
| Template library | Lift and run templates, filters, New template |
| Lift template builder | Exercises, sets, rep range, rest, supersets, reorder |
| Run template builder | Warmup / repeat blocks / steady / cooldown; workout-shape strip |
| Edit segment sheet | Distance or time; pace / HR zone / effort target; voice cues |
| Exercise library | Search, filters, A–Z, custom first |
| Exercise detail | Tabs: History, Charts, How to (demo, muscle map, steps, mistakes) |
| Create custom exercise | Name, muscles, equipment, tracking type, optional photo/video, notes |

### Workout
| Page | Purpose |
|---|---|
| Lift logger | Live set logging, previous values, rest timer, add / swap exercise, thumbnails |
| Exercise picker sheet | Multi-select; search; "suggested for this workout"; add as superset |
| Swap exercise sheet | Same-muscle alternatives filtered by equipment; "also update template" |
| Exercise demo sheet | Silent loop, muscle chips, 3 cues, last set; "Back to workout" |
| Workout summary | Duration, volume, PRs, template-update prompt, feel, notes |
| Run detail | Imported run: stats, target vs actual, splits table |
| Link run sheet | Match an imported run to a planned session or keep as extra |

### Nutrition
| Page | Purpose |
|---|---|
| Food diary | Meals for the day, calories left, macro bars, check-in reminder |
| Food search sheet | Search, recent, My meals, My foods; quick actions; added-items bar |
| Food detail | Serving size + unit, servings stepper, nutrition, impact line, meal |
| Quick add | Calories and macros only, optional name |
| Create saved meal | Named combo of foods with totals |
| Weekly check-in | Week averages, maintenance update, new targets; Accept / Keep |
| Goal and targets (nutrition settings) | Goal, phase, weekly rate override, target history |

### Progress and settings
| Page | Purpose |
|---|---|
| Progress: Strength | Weekly volume, recent PRs, est. 1RM for key lifts |
| Progress: Running | Monthly miles, weekly avg, easy pace trend, recent runs |
| Progress: Body | Weekly avg weight, change since start, body fat, weight chart, measurements |
| Settings | Profile, units, focus, connected apps, notifications, export, log out |

## User flows (17)

### Setup
1. **First-time setup:** Welcome → About you → Training focus → Main goal → Starting targets → Connect apps → Today. Creates `users`, `nutrition_profiles`, first `weekly_targets` (method `initial`, status `accepted`).

### Planning and building
2. **Build a lift template:** Plan → Templates → New → Lift → pick exercises → sets/reps/rest → supersets → Save.
3. **Build a run template:** Templates → New → Run → add segments and repeat blocks → paces → Save.
4. **Create a custom exercise:** Exercise library → Create → name, muscles, equipment, tracking, optional media → Save.
5. **Plan the week:** Week calendar → Add on a day → pick template → press-and-hold to move.
6. **Change training focus:** Settings → Focus → preview split → confirm (applies from next week; MVP: "fill week from focus" only).

### Training
7. **Log a lift:** Today (or +) → Start → log sets (rest timer auto-starts) → add/swap as needed → Finish → summary → Save. Must work offline.
8. **Quick-start an empty workout:** + → Start workout → Empty → add exercises → Finish → optionally save as template.
9. **Complete a run:** run on Apple Watch → HealthKit import → auto-match to same-day planned run → Run detail. No match → "needs a match" card → Link run sheet.
10. **Skip or reschedule a session:** Session detail → Skip (dialog) or Reschedule (sheet) → calendar updates.
17. **View an exercise demo mid-workout:** Logger → tap thumbnail → Demo sheet → Back to workout. Also reachable from picker and swap rows.

### Nutrition and body
11. **Log food:** + or diary → Food search → meal → search/recent → Food detail → Add → diary updates.
12. **Log a saved meal / copy a meal:** Food search → My meals or Copy meal → pick → Add.
13. **Daily weigh-in:** Today → weigh-in card → number pad → Save (or auto from Apple Health).
14. **Weekly check-in:** check-in day prompt on Today → check-in page → Accept or Keep → Today shows new targets.
15. **Log measurements:** Weigh-in sheet → Add measurements → waist/neck/hip → body fat recalculated → phase-change prompt if recommendation changes.

### Review
16. **Review progress:** Progress → Strength / Running / Body → tap an item → detail.

## Priorities

Prototype and polish first: flows 7, 11, 13, 14 (the daily and weekly loop). Onboarding (1) second. Everything else after.

## Hybrid coaching rules used in flows (MVP, rule-based, no AI)
- Warn when a heavy lower-body session is the day before a hard or long run.
- Warn on two upper-body days in a row when rescheduling.
- Picker suggestions: exercises whose primary muscle has not been trained today.
- Swap suggestions: same primary muscle, filtered by the user's equipment.
