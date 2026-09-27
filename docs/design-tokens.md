# Splits — Design Tokens

> **Status:** starting point derived from the "Fiery Ocean" palette and the Pushr-inspired direction. Replace values with the export from Claude Design once the design system is finalized, but keep the token *names* so code doesn't change.

Visual direction: minimal and airy, large rounded cards on a warm light base, giant numbers as the hero of each screen, lowercase display headings, small uppercase micro-labels, pill buttons, frosted-glass overlays, one dark anchor card per screen at most. Color is used sparingly and always means something.

## Color

### Base palette (Fiery Ocean)
| Token | Hex | Role |
|---|---|---|
| `palette.cream` | #FDF0D5 | app background |
| `palette.navy` | #003049 | primary text, icons, dark cards, primary buttons |
| `palette.red` | #C1121F | **Lift** (strength, sets, PRs), destructive |
| `palette.steel` | #669BBC | **Run** (running, miles, pace) |
| `palette.oxblood` | #780000 | **Fuel** (nutrition), pressed state of red |

### Semantic roles (light mode)
| Token | Value | Notes |
|---|---|---|
| `color.bg` | #FDF0D5 | |
| `color.surface` | #FFFFFF | cards |
| `color.surface.subtle` | #F6E9CF | inset fields, secondary buttons |
| `color.surface.dark` | #003049 | anchor card, rest timer |
| `color.line` | #E8DCC1 | hairlines only; prefer shadows |
| `color.text` | #003049 | |
| `color.text.muted` | #5E6E7A | AA on cream and white |
| `color.text.onDark` | #FDF0D5 | |
| `color.run.fill` | #669BBC | use **navy text** on it (white fails AA) |
| `color.run.text` | #2F5F7E | darker steel for text on light bg |
| `color.run.tint` | #E3EDF4 | |
| `color.lift.fill` | #C1121F | white text OK |
| `color.lift.text` | #C1121F | |
| `color.lift.tint` | #F9E0E1 | |
| `color.lift.pressed` | #780000 | |
| `color.fuel.fill` | #780000 | |
| `color.fuel.text` | #780000 | |
| `color.fuel.tint` | #F1DAD6 | |
| `color.body.fill` | #B08D2F | body metrics (weight, body fat); warm gold that sits with the palette |
| `color.body.text` | #6B5416 | |
| `color.body.tint` | #F5EAC8 | |
| `color.success` | #2E7D4F | |
| `color.warning` | #B8741A | |
| `color.info` | #2F5F7E | |
| `color.focus` | #669BBC | focus ring |

### Dark mode
| Token | Value |
|---|---|
| `color.bg` | #002233 |
| `color.surface` | #003049 |
| `color.surface.subtle` | #0B3D57 |
| `color.surface.dark` | #001622 |
| `color.line` | #12465F |
| `color.text` | #FDF0D5 |
| `color.text.muted` | #A9BCC7 |
| `color.run.fill` | #7FB0CC |
| `color.lift.fill` | #E24B55 (lifted for contrast) |
| `color.fuel.fill` | #C0575A |
| `color.body.fill` | #D2B25A |

Contrast rule: WCAG AA for text; never communicate state by color alone (pair with label, icon, or shape).

## Typography

Display: **Archivo Expanded** (extra-wide geometric). Body/UI: **Archivo**. Tabular numerals (`font-variant-numeric: tabular-nums`) in tables and timers.

| Token | Family | Size / line | Weight | Use |
|---|---|---|---|---|
| `type.hero` | Archivo Expanded | 80 / 84 | 700 | single giant metric |
| `type.hero.sm` | Archivo Expanded | 56 / 60 | 700 | secondary big number |
| `type.display` | Archivo Expanded | 32 / 36 | 700 | screen titles (lowercase) |
| `type.title` | Archivo Expanded | 22 / 26 | 600 | card titles |
| `type.headline` | Archivo | 17 / 22 | 600 | row titles |
| `type.body` | Archivo | 15 / 20 | 400 | |
| `type.label` | Archivo | 13 / 16 | 500 | |
| `type.caption` | Archivo | 12 / 16 | 400 | |
| `type.micro` | Archivo | 11 / 14 | 600, +0.08em, uppercase | "SET 2", "TOTAL" |

## Spacing (4pt grid)
`space.1` 4 · `space.2` 8 · `space.3` 12 · `space.4` 16 · `space.5` 20 · `space.6` 24 · `space.8` 32 · `space.10` 40 · `space.12` 48

Screen horizontal padding: 16. Card padding: 16. Section gap: 16. Min touch target: 44 × 44.

## Radius
`radius.sm` 8 · `radius.md` 14 · `radius.lg` 20 · `radius.xl` 28 · `radius.pill` 999

Cards use `lg`; sheets use `xl` on top corners; buttons and chips use `pill`; inputs use `md`.

## Elevation (light mode)
| Token | Shadow |
|---|---|
| `shadow.card` | 0 8 24 rgba(0,48,73,0.08) |
| `shadow.raised` | 0 12 32 rgba(0,48,73,0.14) |
| `shadow.sheet` | 0 −8 32 rgba(0,48,73,0.18) |

Dark mode: no shadows; raise elevation by lightening the surface token instead.

## Blur
`blur.glass` 24px backdrop blur, surface at 72% opacity — rest timer bar, sheet headers over content.

## Motion
| Token | Value | Use |
|---|---|---|
| `motion.fast` | 120 ms, ease-out | toggles, checkmarks |
| `motion.base` | 220 ms, ease-in-out | sheets, cards |
| `motion.slow` | 360 ms, spring (damping 18) | number roll-ups, PR celebration |

Respect iOS Reduce Motion: disable number roll-ups and demo autoplay.

## Icons
Stroke icons, 2px, 22 px in tab bar, 20 px inline, 16 px in chips. One consistent set (e.g. Tabler or Phosphor).

## Component index (names used in prompts and code)
Button (primary, secondary, icon, destructive, floating), Tag (Run, Lift, Fuel, Body, PR, New), HeroStatCard, SessionCard, DarkAnchorCard, TipCard, PlateRackWeekStrip, SetRow, RestTimerBar, TextField, NumericField, Stepper, SegmentedControl, Chip, Toggle, Checkbox, RadioOptionCard, SearchField, NumberPad, CalorieBar, MacroBars, CircularProgress, StepProgressBar, BarChart, LineChart, SplitTable, TabBar, TopNav, BottomSheet, Dialog, Toast, ExerciseRow, FoodRow, SettingsRow, ExerciseThumbnail, DemoPlayer, MuscleMap, NumberedCueList, MediaUploadField.
