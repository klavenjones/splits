/**
 * Nutrition engine: automates docs/Weight_LOSS_2024.xlsx (CALCULATIONS sheet).
 *
 * Pure: no I/O, no clock. Inputs and outputs are metric (kg, cm, kcal, g). The sheet's math is
 * defined per pound, so values are converted to lb internally to reproduce it exactly
 * (3,500 kcal/lb = ~7,716 kcal/kg). Cell references in comments point to the sheet.
 */
import { kgToLb } from '../units';

export type Sex = 'male' | 'female';
export type Experience = 'beginner' | 'intermediate';
export type Goal = 'build_muscle' | 'lose_fat' | 'maintain';
export type Phase = 'cut' | 'maintain' | 'lean_bulk';

export const KCAL_PER_LB = 3500;

/* ---------------- Body fat ---------------- */

/**
 * US Navy body-fat estimate (AL6), rounded to a whole percent like the sheet.
 * Women need a hip measurement.
 */
export function navyBodyFat(input: {
  sex: Sex;
  heightCm: number;
  waistCm: number;
  neckCm: number;
  hipCm?: number;
}): number {
  const { sex, heightCm, waistCm, neckCm, hipCm } = input;
  if (sex === 'male') {
    return Math.round(86.01 * Math.log10(waistCm - neckCm) - 70.041 * Math.log10(heightCm) + 30.3);
  }
  if (hipCm === undefined) throw new Error('navyBodyFat: hipCm is required for women');
  return Math.round(
    495 /
      (1.29579 - 0.35004 * Math.log10(waistCm + hipCm - neckCm) + 0.221 * Math.log10(heightCm)) -
      450,
  );
}

/* ---------------- Phase and rate ---------------- */

/** Body fat at which the sheet recommends a cut whatever the goal (AW10 category 1). */
const CUT_THRESHOLD: Record<Sex, number> = { male: 25, female: 30 };

/**
 * Recommended phase (AW10, AY4–AY6). A `maintain` goal always maintains; otherwise men at 25%+
 * and women at 30%+ are told to cut, and everyone else follows their goal.
 */
export function recommendPhase(input: { sex: Sex; bodyFatPct: number; goal: Goal }): Phase {
  const { sex, bodyFatPct, goal } = input;
  if (goal === 'maintain') return 'maintain';
  if (bodyFatPct >= CUT_THRESHOLD[sex]) return 'cut';
  return goal === 'build_muscle' ? 'lean_bulk' : 'cut';
}

/** Cut tiers (AX13 men, AY13 women): above `high` → -0.7, above `mid` → -0.5, else -0.3. */
const CUT_TIERS: Record<Sex, { high: number; mid: number }> = {
  male: { high: 15, mid: 12 },
  female: { high: 25, mid: 22 },
};

/** Weekly weight change as a percent of bodyweight; negative = loss (AX13 / AY13). */
export function weeklyRatePct(input: {
  sex: Sex;
  experience: Experience;
  bodyFatPct: number;
  phase: Phase;
}): number {
  const { sex, experience, bodyFatPct, phase } = input;
  if (phase === 'maintain') return 0;
  if (phase === 'lean_bulk') return experience === 'beginner' ? 1.5 / 4 : 1 / 4;
  const tiers = CUT_TIERS[sex];
  if (bodyFatPct > tiers.high) return -0.7;
  if (bodyFatPct > tiers.mid) return -0.5;
  return -0.3;
}

/* ---------------- Calories ---------------- */

const ACTIVITY_MULTIPLIER: Record<Sex, number> = { male: 1.5, female: 1.55 };
const CALORIE_FLOOR: Record<Sex, number> = { male: 1500, female: 1200 };

/** Starting maintenance (AN22): (370 + 9.8 × lean mass in lb) × 1.5 men / 1.55 women. */
export function startingMaintenance(input: {
  sex: Sex;
  weightKg: number;
  bodyFatPct: number;
}): number {
  const leanLb = kgToLb(input.weightKg) * (1 - input.bodyFatPct / 100);
  return (370 + 9.8 * leanLb) * ACTIVITY_MULTIPLIER[input.sex];
}

/** Excel MROUND for positive numbers. */
const mround = (x: number, multiple: number) => Math.floor(x / multiple + 0.5) * multiple;

/**
 * Daily calories (AW17, AW24) with the floor, plus the ±100 range rounded to 50 (Q28).
 * When the low end would fall under the floor, the range starts at the target instead.
 */
export function dailyCalories(input: {
  sex: Sex;
  maintenanceKcal: number;
  weightKg: number;
  weeklyRatePct: number;
}): { kcal: number; low: number; high: number; floored: boolean } {
  const floor = CALORIE_FLOOR[input.sex];
  const dailyDelta = ((input.weeklyRatePct / 100) * kgToLb(input.weightKg) * KCAL_PER_LB) / 7;
  const unfloored = input.maintenanceKcal + dailyDelta;
  const kcal = Math.max(floor, unfloored);
  const low = kcal - 100 < floor ? mround(kcal, 50) : mround(kcal - 100, 50);
  return { kcal, low, high: mround(kcal + 100, 50), floored: unfloored < floor };
}

/* ---------------- Macros ---------------- */

/** Protein in g per lb of bodyweight (BV36). */
function proteinPerLb(sex: Sex, bodyFatPct: number): number {
  if (sex === 'male') {
    if (bodyFatPct < 20) return 1;
    if (bodyFatPct <= 25) return 0.8;
    return 0.73;
  }
  return bodyFatPct <= 25 ? 1 : 0.8;
}

/** Share of calories from fat (BD21). */
function fatShare(sex: Sex, bodyFatPct: number): number {
  if (sex === 'female') return 0.3;
  return bodyFatPct < 25 ? 0.22 : 0.25;
}

/** Protein, fat and carbs in grams (Q29–Q31). Carbs take the remaining calories. */
export function macroTargets(input: {
  sex: Sex;
  kcal: number;
  weightKg: number;
  bodyFatPct: number;
}): { proteinG: number; fatG: number; carbsG: number } {
  const proteinG = proteinPerLb(input.sex, input.bodyFatPct) * kgToLb(input.weightKg);
  const fatG = (fatShare(input.sex, input.bodyFatPct) * input.kcal) / 9;
  const carbsG = (input.kcal - proteinG * 4 - fatG * 9) / 4;
  return { proteinG, fatG, carbsG };
}

/* ---------------- Targets ---------------- */

export type Targets = {
  phase: Phase;
  weeklyRatePct: number;
  /** Rounded to whole numbers, matching the int columns on `weekly_targets`. */
  maintenanceKcal: number;
  kcalTarget: number;
  kcalLow: number;
  kcalHigh: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  /** True when the calorie floor raised the target. */
  floored: boolean;
  /** Unrounded values, for tests and display math. */
  raw: {
    maintenanceKcal: number;
    kcalTarget: number;
    proteinG: number;
    fatG: number;
    carbsG: number;
  };
};

export type TargetInputs = {
  sex: Sex;
  experience: Experience;
  goal: Goal;
  /** Current (latest) bodyweight. */
  weightKg: number;
  /** Current (latest) body fat. */
  bodyFatPct: number;
  /** Defaults to `startingMaintenance` for this weight and body fat. */
  maintenanceKcal?: number;
  /** Chosen phase; defaults to `recommendPhase`. */
  phase?: Phase;
  /** Manual weekly rate (rate_mode = manual); overrides the auto rate. */
  rateOverridePct?: number;
};

/** Every target for the given stats: phase, rate, calories with range, and macros. */
export function computeTargets(input: TargetInputs): Targets {
  const { sex, experience, goal, weightKg, bodyFatPct } = input;
  const phase = input.phase ?? recommendPhase({ sex, bodyFatPct, goal });
  const ratePct = input.rateOverridePct ?? weeklyRatePct({ sex, experience, bodyFatPct, phase });
  const maintenanceKcal =
    input.maintenanceKcal ?? startingMaintenance({ sex, weightKg, bodyFatPct });
  const cal = dailyCalories({ sex, maintenanceKcal, weightKg, weeklyRatePct: ratePct });
  const macros = macroTargets({ sex, kcal: cal.kcal, weightKg, bodyFatPct });
  return {
    phase,
    weeklyRatePct: ratePct,
    maintenanceKcal: Math.round(maintenanceKcal),
    kcalTarget: Math.round(cal.kcal),
    kcalLow: cal.low,
    kcalHigh: cal.high,
    proteinG: Math.round(macros.proteinG),
    fatG: Math.round(macros.fatG),
    carbsG: Math.round(macros.carbsG),
    floored: cal.floored,
    raw: { maintenanceKcal, kcalTarget: cal.kcal, ...macros },
  };
}

/* ---------------- Weekly adaptive update ---------------- */

/** One day of logs. `null` = nothing logged that day. */
export type DayLog = {
  weightKg: number | null;
  kcal: number | null;
  /** Body fat from that day's measurements (Navy), if any. */
  bodyFatPct?: number | null;
};
/** Seven days, Monday first. Week 1 is the week of the start date. */
export type WeekLog = DayLog[];

export type WeekSummary = {
  /** Average of the weigh-ins actually logged this week, or null if none (L). */
  loggedAvgWeightKg: number | null;
  /** Average weight with missed days carried forward (AW, weight row). */
  avgWeightKg: number;
  /** Average intake with missed days carried forward; null until something is logged (AW). */
  avgKcal: number | null;
  /** Days with an intake value after carry-forward (AL, calorie row). */
  daysLogged: number;
  /** Days with a weight after carry-forward (AL, weight row). */
  weightDays: number;
  /** Change in average weight vs the previous week, or vs the start weight in week 1 (AZ). */
  weightChangeKg: number;
  /** This week's maintenance estimate (BE). */
  estimateKcal: number;
  /** Running maintenance: mean of the weekly estimates from week 2 on (BD). */
  runningKcal: number;
  /** Body fat carried into this week (BT; the start value for weeks 1–4). */
  bodyFatPct: number;
  /** Protein target carried into this week, before rounding (BW). */
  proteinG: number;
};

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * The sheet's fill for one week row (AP–AV): nothing when the row is empty; otherwise each missed
 * day takes the previous day's value, from the week's first entry through Sunday. A missed
 * Monday stays empty (`monday` is only used for week 1's weight, which takes the start weight).
 * The sheet's Monday cell reads an unrelated cell from week 4 on; that bug is not reproduced.
 */
function fillWeek(values: (number | null)[], monday: number | null): number[] {
  if (values.every((v) => v === null)) return [];
  const out: number[] = [];
  let last: number | null = values[0] ?? monday;
  if (last !== null) out.push(last);
  for (const v of values.slice(1)) {
    if (v !== null) last = v;
    if (last !== null) out.push(last);
  }
  return out;
}

/** Weeks of weigh-ins needed before maintenance adapts (Q23: count(U) > 3). */
export const ADAPT_AFTER_WEEKS = 4;
/** Weeks that use the start weight and body fat for protein and body fat (BP36:BP39, BT36:BT39). */
export const FIXED_WEEKS = 4;
/** Protein only changes when it moves at least this much (BW40). */
export const PROTEIN_STEP_G = 5;

/**
 * Adaptive maintenance and the protein and body-fat chains from weekly logs, as the sheet does:
 * - weight and intake are filled within each week (fillWeek) and averaged (AW); a week with no
 *   weigh-ins or no food logs repeats the previous week's estimate and running value;
 * - each week's estimate = avg kcal + (−Δ avg weight × 3,500 kcal/lb) ÷ days with intake (BE);
 * - the running value is the mean of the estimates from week 2 on (BD);
 * - once 4 weeks have weigh-ins, maintenance = the running value of the second-to-last of those
 *   weeks (Q23); before that the starting maintenance stands;
 * - body fat is the start value for weeks 1–4, then the week's measurement or the last one (BT);
 * - protein uses the start weight for weeks 1–4, then the latest week of weigh-ins, and only
 *   changes by 5 g or more (BP/BW).
 */
export function adaptiveMaintenance(input: {
  sex: Sex;
  startWeightKg: number;
  startBodyFatPct: number;
  /** AN22: starting maintenance at the start weight and start body fat. */
  startingMaintenanceKcal: number;
  weeks: WeekLog[];
}): { weeks: WeekSummary[]; maintenanceKcal: number; adaptive: boolean } {
  const { sex, startWeightKg, startBodyFatPct, startingMaintenanceKcal, weeks } = input;
  const summaries: WeekSummary[] = [];
  const estimates: number[] = [];
  const history: number[] = []; // running value for each week with a weigh-in (U column)
  let lastLoggedKg = startWeightKg; // BP
  let bodyFat = startBodyFatPct; // BT

  weeks.forEach((week, i) => {
    const prev = summaries[i - 1];
    const w = fillWeek(
      week.map((d) => d.weightKg),
      i === 0 ? startWeightKg : null,
    );
    const k = fillWeek(
      week.map((d) => d.kcal),
      null,
    );
    const logged = week.map((d) => d.weightKg).filter((v): v is number => v !== null);
    const loggedAvgWeightKg = logged.length ? mean(logged) : null;

    const prevAvgKg = i === 0 ? startWeightKg : prev.avgWeightKg;
    const avgWeightKg = w.length ? mean(w) : prevAvgKg;
    const avgKcal = k.length ? mean(k) : i === 0 ? null : prev.avgKcal;
    const weightChangeKg = avgWeightKg - prevAvgKg;

    const hasData = w.length > 0 && k.length > 0;
    const estimateKcal = hasData
      ? mean(k) + (-kgToLb(weightChangeKg) * KCAL_PER_LB) / k.length
      : i === 0
        ? startingMaintenanceKcal
        : estimates[i - 1];
    estimates.push(estimateKcal);

    let runningKcal: number;
    if (!hasData) runningKcal = i === 0 ? startingMaintenanceKcal : prev.runningKcal;
    else if (i < 2) runningKcal = estimateKcal;
    else runningKcal = mean(estimates.slice(1, i + 1));
    if (loggedAvgWeightKg !== null) history.push(runningKcal);

    // Body fat (BT) and protein (BP/BV/BW) chains.
    let proteinG: number;
    if (i < FIXED_WEEKS) {
      proteinG = proteinPerLb(sex, startBodyFatPct) * kgToLb(startWeightKg);
    } else {
      const measured = week.map((d) => d.bodyFatPct ?? null).filter((v): v is number => v !== null);
      if (measured.length) bodyFat = measured[measured.length - 1];
      if (loggedAvgWeightKg !== null) lastLoggedKg = loggedAvgWeightKg;
      const next = proteinPerLb(sex, bodyFat) * kgToLb(lastLoggedKg);
      proteinG = Math.abs(next - prev.proteinG) >= PROTEIN_STEP_G ? next : prev.proteinG;
    }

    summaries.push({
      loggedAvgWeightKg,
      avgWeightKg,
      avgKcal,
      daysLogged: k.length,
      weightDays: w.length,
      weightChangeKg,
      estimateKcal,
      runningKcal,
      bodyFatPct: i < FIXED_WEEKS ? startBodyFatPct : bodyFat,
      proteinG,
    });
  });

  const adaptive = history.length >= ADAPT_AFTER_WEEKS;
  return {
    weeks: summaries,
    maintenanceKcal: adaptive ? history[history.length - 2] : startingMaintenanceKcal,
    adaptive,
  };
}

/**
 * The weekly check-in: every target recalculated as the sheet does after the latest week.
 * - Weight for the rate: the latest week's average of actual weigh-ins (BY14), or the start
 *   weight; a manual rate is a fixed amount per week, so it's based on the start weight (P16).
 * - Body fat: the carried value (BY15), which only moves from week 5.
 * - Maintenance: adaptive from week 4; before that the starting formula at the start weight
 *   and the current body fat (Q23).
 * - Protein: the carried protein (BY17); fat and carbs from the calories (Q30, Q31).
 */
export function weeklyUpdate(input: {
  sex: Sex;
  experience: Experience;
  goal: Goal;
  /** Chosen phase; defaults to the recommendation for the current body fat. */
  phase?: Phase;
  /** Manual weekly rate, % of the start weight (rate_mode = manual). */
  rateOverridePct?: number;
  startWeightKg: number;
  startBodyFatPct: number;
  weeks: WeekLog[];
}): Targets & { adaptive: boolean; week: WeekSummary; weeks: WeekSummary[] } {
  const { sex, experience, goal, startWeightKg, startBodyFatPct, weeks } = input;
  if (weeks.length === 0) throw new Error('weeklyUpdate: needs at least one week of logs');
  const a = adaptiveMaintenance({
    sex,
    startWeightKg,
    startBodyFatPct,
    startingMaintenanceKcal: startingMaintenance({
      sex,
      weightKg: startWeightKg,
      bodyFatPct: startBodyFatPct,
    }),
    weeks,
  });
  const last = a.weeks[a.weeks.length - 1];
  const bodyFatPct = last.bodyFatPct;
  const latestKg =
    [...a.weeks].reverse().find((w) => w.loggedAvgWeightKg !== null)?.loggedAvgWeightKg ??
    startWeightKg;
  const maintenanceKcal = a.adaptive
    ? a.maintenanceKcal
    : startingMaintenance({ sex, weightKg: startWeightKg, bodyFatPct });
  const phase = input.phase ?? recommendPhase({ sex, bodyFatPct, goal });
  const manual = input.rateOverridePct !== undefined;
  const ratePct = input.rateOverridePct ?? weeklyRatePct({ sex, experience, bodyFatPct, phase });
  const cal = dailyCalories({
    sex,
    maintenanceKcal,
    weightKg: manual ? startWeightKg : latestKg,
    weeklyRatePct: ratePct,
  });
  const proteinG = last.proteinG;
  const fatG = (fatShare(sex, bodyFatPct) * cal.kcal) / 9;
  const carbsG = (cal.kcal - proteinG * 4 - fatG * 9) / 4;
  return {
    phase,
    weeklyRatePct: ratePct,
    maintenanceKcal: Math.round(maintenanceKcal),
    kcalTarget: Math.round(cal.kcal),
    kcalLow: cal.low,
    kcalHigh: cal.high,
    proteinG: Math.round(proteinG),
    fatG: Math.round(fatG),
    carbsG: Math.round(carbsG),
    floored: cal.floored,
    raw: { maintenanceKcal, kcalTarget: cal.kcal, proteinG, fatG, carbsG },
    adaptive: a.adaptive,
    week: last,
    weeks: a.weeks,
  };
}
