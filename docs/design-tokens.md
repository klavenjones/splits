# Splits — Design Tokens

> **Source of truth:** `src/theme/tokens.ts` (exported from Claude Design) and the matching CSS variables in `src/global.css`. This page mirrors them. Change the export, then update this page. Code uses these names: `colors[scheme].<name>` in TypeScript, or Tailwind classes such as `bg-surface-card` and `text-text-muted`.

Visual direction: minimal and airy, large rounded cards on a warm light base, giant numbers as the hero of each screen, lowercase display headings, small uppercase micro-labels, pill buttons, frosted-glass overlays, one dark anchor card per screen at most. Color is used sparingly and always means something: **Lift** = red, **Run** = steel blue, **Fuel** = oxblood, **Body** = heather.

Contrast rule: WCAG AA for text; never communicate state by color alone (pair with label, icon, or shape).

## Color (`colors.light` / `colors.dark`)

| Token (TS) | Class suffix | Light | Dark |
|---|---|---|---|
| `bg` | `bg` | #fdf0d5 | #001b2b |
| `surfaceCard` | `surface-card` | #fffcf5 | #003049 |
| `surfaceInset` | `surface-inset` | #fef6e5 | #00263b |
| `surfaceRaised` | `surface-raised` | #fffcf5 | #0a3a55 |
| `surfaceControl` | `surface-control` | #f5ead3 | #0c3b57 |
| `surfaceControlPressed` | `surface-control-pressed` | #e4d8be | #16496a |
| `text` | `text` | #003049 | #fdf0d5 |
| `textMuted` | `text-muted` | #4b5b63 | #b2c0ca |
| `textSubtle` | `text-subtle` | #657277 | #93a6b3 |
| `textDisabled` | `text-disabled` | #9fa5a1 | #4d6b80 |
| `hairline` | `hairline` | #00304914 | #fdf0d51a |
| `borderControl` | `border-control` | #828b8c | #758d9d |
| `primaryFill` | `primary-fill` | #003049 | #fdf0d5 |
| `primaryPressed` | `primary-pressed` | #001b2b | #e4d8be |
| `onPrimary` | `on-primary` | #fdf0d5 | #003049 |
| `anchorCard` | `anchor-card` | #003049 | #fdf0d5 |
| `onAnchor` | `on-anchor` | #fdf0d5 | #003049 |
| `onAnchorMuted` | `on-anchor-muted` | #d2dae1 | #4b5b63 |
| `liftFill` | `lift-fill` | #c1121f | #e78279 |
| `liftPressed` | `lift-pressed` | #780000 | #f3a79f |
| `onLift` | `on-lift` | #fef6e5 | #003049 |
| `liftText` | `lift-text` | #c1121f | #f3a79f |
| `liftSoft` | `lift-soft` | #fee7e4 | #4a0d18 |
| `runFill` | `run-fill` | #669bbc | #669bbc |
| `runPressed` | `run-pressed` | #7caac7 | #7caac7 |
| `onRun` | `on-run` | #003049 | #003049 |
| `runText` | `run-text` | #325d77 | #a2c3d9 |
| `runSoft` | `run-soft` | #e4eff6 | #0d3d5b |
| `fuelFill` | `fuel-fill` | #780000 | #edd2cd |
| `fuelPressed` | `fuel-pressed` | #590000 | #ddb2ab |
| `onFuel` | `on-fuel` | #fef6e5 | #003049 |
| `fuelText` | `fuel-text` | #780000 | #edd2cd |
| `fuelSoft` | `fuel-soft` | #f8e9e7 | #3d1822 |
| `bodyFill` | `body-fill` | #5d4f7c | #a79cc1 |
| `onBody` | `on-body` | #fef6e5 | #003049 |
| `bodyText` | `body-text` | #5d4f7c | #c0b9d5 |
| `bodySoft` | `body-soft` | #eeebf4 | #2a2a4f |
| `macroProtein` | `macro-protein` | #c1121f | #e78279 |
| `macroCarbs` | `macro-carbs` | #669bbc | #7caac7 |
| `macroFat` | `macro-fat` | #e0a030 | #e8b363 |
| `successFill` | `success-fill` | #2e7d5b | #81af97 |
| `onSuccess` | `on-success` | #fef6e5 | #003049 |
| `successText` | `success-text` | #1b6748 | #a5c7b5 |
| `successSoft` | `success-soft` | #e5f0ea | #0f3a33 |
| `warningFill` | `warning-fill` | #e0a030 | #e0a030 |
| `onWarning` | `on-warning` | #003049 | #003049 |
| `warningText` | `warning-text` | #765003 | #e8b363 |
| `warningSoft` | `warning-soft` | #fbead3 | #3a2f1a |
| `infoFill` | `info-fill` | #3c5c72 | #a2c3d9 |
| `infoText` | `info-text` | #3c5c72 | #c8dcea |
| `infoSoft` | `info-soft` | #e9edf1 | #0c3550 |
| `dangerFill` | `danger-fill` | #c1121f | #c1121f |
| `dangerPressed` | `danger-pressed` | #780000 | #780000 |
| `onDanger` | `on-danger` | #fef6e5 | #fef6e5 |
| `dangerText` | `danger-text` | #a70215 | #f3a79f |
| `focusRing` | `focus-ring` | #325d77 | #a2c3d9 |
| `glass` | `glass` | #fffcf5b8 | #001b2bb8 |
| `glassEdge` | `glass-edge` | #ffffff99 | #fdf0d51f |
| `scrim` | `scrim` | #00182666 | #00000080 |
| `chartGrid` | `chart-grid` | #0030491a | #fdf0d51a |
| `chartTrend` | `chart-trend` | #003049 | #fdf0d5 |
| `track` | `track` | #0030490f | #fdf0d514 |

The base ramps (`palette`: cream, navy, red, blue, oxblood, heather, pine, amber, stone, 50–900) live in `tokens.ts`. Use semantic tokens in components, not ramps.

## Typography (`typography`, alias of `type`)

Display: **Archivo Expanded** (Bold, ExtraBold). Body/UI: **Archivo** (Regular, Medium, SemiBold, Bold). Use tabular numerals for numbers (the `type-hero`, `type-stat`, `type-timer`, `type-label` utilities include them). Display headings are lowercase; `micro` is uppercase.

| Token | Class | Font | Size / line | Letter spacing |
|---|---|---|---|---|
| `hero` | `type-hero` | ArchivoExpanded-ExtraBold | 88 / 80 | -2.6 |
| `heroSm` | `type-hero-sm` | ArchivoExpanded-ExtraBold | 64 / 59 | -1.9 |
| `timer` | `type-timer` | ArchivoExpanded-Bold | 56 / 56 | -1.1 |
| `display` | `type-display` | ArchivoExpanded-ExtraBold | 36 / 40 | -0.7 |
| `title` | `type-title` | ArchivoExpanded-Bold | 24 / 28 | -0.2 |
| `stat` | `type-stat` | ArchivoExpanded-ExtraBold | 28 / 32 | -0.6 |
| `headline` | `type-headline` | ArchivoExpanded-ExtraBold | 18 / 22 | 0 |
| `body` | `type-body` | Archivo-Regular | 17 / 24 | 0 |
| `subhead` | `type-subhead` | Archivo-Medium | 15 / 20 | 0 |
| `label` | `type-label` | Archivo-SemiBold | 15 / 20 | 0 |
| `caption` | `type-caption` | Archivo-Medium | 13 / 18 | 0 |
| `micro` | `type-micro` | Archivo-Bold | 11 / 14 | 0.9 |

## Spacing (`space`, 4pt grid)
`0` 0 · `1` 4 · `2` 8 · `3` 12 · `4` 16 · `5` 20 · `6` 24 · `8` 32 · `10` 40 · `12` 48 · `16` 64

Screen horizontal padding: 16. Card padding: 20 (`Card` default `p-5`). Section gap: 12–16. Min touch target: 44 × 44.

## Radius (`radius`)
`xs` 8 · `sm` 12 · `md` 16 · `card` 24 · `sheet` 28 · `pill` 999

Cards use `card`; sheets use `sheet` on top corners; buttons and chips use `pill`; inputs use `md`.

## Sizes (`size`)
`iconSm` 16 · `iconMd` 20 · `iconLg` 24 · `iconXl` 32 · `touchMin` 44 · `controlH` 52 · `controlHSm` 44 · `fabSize` 64 · `tabbarH` 84

## Elevation (`shadow.light` / `shadow.dark`)
| Token | Light | Dark |
|---|---|---|
| `card` | `0 1px 2px #0030490a, 0 8px 24px #00304912` | `0 1px 2px #00000033, 0 8px 24px #00000040` |
| `raised` | `0 2px 6px #00304914, 0 16px 40px #0030491f` | `0 2px 6px #0000004d, 0 16px 40px #00000066` |
| `float` | `0 6px 16px #00304926, 0 20px 40px #0030491f` | `0 6px 16px #00000066, 0 20px 40px #00000066` |
| `sheet` | `0 -8px 40px #0030491f` | `0 -8px 40px #00000080` |
| `none` | `none` | `none` |

## Blur (`blur`)
`sm` 12 · `md` 24 · `lg` 40. Glass surfaces use `glass` / `glassEdge` colors over a `BlurView`: tab bar, rest timer bar, sheet headers over content.

## Motion (`motion` = `{ duration, easing }`)
| Duration | ms |
|---|---|
| `instant` | 100 |
| `fast` | 180 |
| `base` | 280 |
| `sheet` | 420 |
| `count` | 600 |
| `tick` | 1000 |

| Easing | cubic-bezier |
|---|---|
| `standard` | 0.2, 0, 0, 1 |
| `sheet` | 0.32, 0.72, 0, 1 |
| `exit` | 0.3, 0, 1, 1 |
| `spring` | 0.34, 1.56, 0.64, 1 |

Use with `Easing.bezier(...)` from Reanimated. Respect iOS Reduce Motion: disable number roll-ups and demo autoplay.

## Opacity (`opacity`)
`disabled` 0.4 · `planned` 0.55

## Icons
Stroke icons on a 24pt grid, 2pt round strokes (`src/components/Icon.tsx`). Sizes: `iconLg` 24 in the tab bar, `iconMd` 20 inline, `iconSm` 16 in chips.

## Component index (names used in prompts and code)
Button (primary, secondary, icon, destructive, floating), Tag (Run, Lift, Fuel, Body, PR, New), HeroStatCard, SessionCard, DarkAnchorCard, TipCard, PlateRackWeekStrip, SetRow, RestTimerBar, TextField, NumericField, Stepper, SegmentedControl, Chip, Toggle, Checkbox, RadioOptionCard, SearchField, NumberPad, CalorieBar, MacroBars, CircularProgress, StepProgressBar, BarChart, LineChart, SplitTable, TabBar, TopNav, BottomSheet, Dialog, Toast, ExerciseRow, FoodRow, SettingsRow, ExerciseThumbnail, DemoPlayer, MuscleMap, NumberedCueList, MediaUploadField, AlphabetScrubber, EmptyState, ExercisePicker, ActionRow, ChipGroup, SortableList (with DragHandle), TemplateCard, LiftExerciseCard, SupersetBlock, SegmentRow, RepeatBlock, WorkoutShape, WeekSwitcher, SummaryTile, DayRow, RestDay, PlannedSessionCard, DashedBar, WeekBoard, TemplatePickRow, WorkoutStats, SyncBadge, LoggerExerciseCard, ResumeBar, SummaryHero, PRCard.

