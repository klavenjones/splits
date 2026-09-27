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
export type DayLog = { weightKg: number | null; kcal: number | null };
/** Seven days, Monday first. */
export type WeekLog = DayLog[];

export type WeekSummary = {
  /** Average weight with missed days carried forward (AW, weight row). */
  avgWeightKg: number;
  /** Average of the weigh-ins actually logged this week, or null if none (L column). */
  loggedAvgWeightKg: number | null;
  /** Average intake with missed days carried forward, or null if nothing to carry (AW, calorie row). */
  avgKcal: number | null;
  /** Days with an intake value after carry-forward (AL, calorie row). */
  daysLogged: number;
  /** Change in average weight vs the previous week, or vs the start weight in week 1 (AZ). */
  weightChangeKg: number;
  /** This week's maintenance estimate (BE). */
  estimateKcal: number;
  /** Running maintenance: mean of the weekly estimates from week 2 on (BD). */
  runningKcal: number;
};

/** Fills each null with the most recent earlier value, across week boundaries. */
function carryForward(values: (number | null)[], seed: number | null): (number | null)[] {
  let last = seed;
  return values.map((v) => {
    if (v !== null) last = v;
    return last;
  });
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Weeks of weigh-ins needed before maintenance adapts (Q23: count(U) > 3). */
export const ADAPT_AFTER_WEEKS = 4;

/**
 * Adaptive maintenance from weekly logs, as in the sheet:
 * - each week's estimate = avg kcal + (−Δ avg weight × 3,500 kcal/lb) ÷ days logged (BD36, BE38);
 *   a week without weight or intake data repeats the previous estimate;
 * - the running value is the mean of the estimates from week 2 on (BD40…);
 * - once 4 weeks have weigh-ins, maintenance = the running value of the second-to-last of those
 *   weeks (Q23); before that the starting maintenance stands.
 */
export function adaptiveMaintenance(input: {
  startWeightKg: number;
  startingMaintenanceKcal: number;
  weeks: WeekLog[];
}): { weeks: WeekSummary[]; maintenanceKcal: number; adaptive: boolean } {
  const { startWeightKg, startingMaintenanceKcal, weeks } = input;
  const weights = carryForward(
    weeks.flatMap((w) => w.map((d) => d.weightKg)),
    startWeightKg,
  );
  const kcals = carryForward(
    weeks.flatMap((w) => w.map((d) => d.kcal)),
    null,
  );

  const summaries: WeekSummary[] = [];
  const estimates: number[] = [];
  const history: number[] = []; // running value for each week with a weigh-in (U column)

  weeks.forEach((week, i) => {
    const filledW = weights.slice(i * 7, i * 7 + 7).filter((v): v is number => v !== null);
    const filledK = kcals.slice(i * 7, i * 7 + 7).filter((v): v is number => v !== null);
    const logged = week.map((d) => d.weightKg).filter((v): v is number => v !== null);

    const prevAvgKg = i === 0 ? startWeightKg : summaries[i - 1].avgWeightKg;
    const avgWeightKg = filledW.length ? mean(filledW) : prevAvgKg;
    const avgKcal = filledK.length ? mean(filledK) : null;
    const weightChangeKg = avgWeightKg - prevAvgKg;

    const hasData = filledW.length > 0 && avgKcal !== null;
    const previousEstimate = i === 0 ? startingMaintenanceKcal : estimates[i - 1];
    const estimateKcal = hasData
      ? avgKcal + (-kgToLb(weightChangeKg) * KCAL_PER_LB) / filledK.length
      : previousEstimate;
    estimates.push(estimateKcal);

    let runningKcal: number;
    if (!hasData) runningKcal = i === 0 ? startingMaintenanceKcal : summaries[i - 1].runningKcal;
    else if (i < 2) runningKcal = estimateKcal;
    else runningKcal = mean(estimates.slice(1, i + 1));

    summaries.push({
      avgWeightKg,
      loggedAvgWeightKg: logged.length ? mean(logged) : null,
      avgKcal,
      daysLogged: filledK.length,
      weightChangeKg,
      estimateKcal,
      runningKcal,
    });
    if (logged.length) history.push(runningKcal);
  });

  const adaptive = history.length >= ADAPT_AFTER_WEEKS;
  return {
    weeks: summaries,
    maintenanceKcal: adaptive ? history[history.length - 2] : startingMaintenanceKcal,
    adaptive,
  };
}

/**
 * The weekly check-in: adaptive maintenance, then every target recalculated from the latest
 * logged weight (the most recent week's average of actual weigh-ins) and the latest body fat.
 * Before week 4, maintenance is the starting value for the start weight and latest body fat (Q23).
 */
export function weeklyUpdate(
  input: Omit<TargetInputs, 'weightKg' | 'maintenanceKcal'> & {
    startWeightKg: number;
    weeks: WeekLog[];
    /** Defaults to `startingMaintenance(startWeightKg, bodyFatPct)`. */
    startingMaintenanceKcal?: number;
  },
): Targets & { adaptive: boolean; week: WeekSummary } {
  const { startWeightKg, weeks, ...rest } = input;
  if (weeks.length === 0) throw new Error('weeklyUpdate: needs at least one week of logs');
  const startingMaintenanceKcal =
    input.startingMaintenanceKcal ??
    startingMaintenance({ sex: rest.sex, weightKg: startWeightKg, bodyFatPct: rest.bodyFatPct });

  const a = adaptiveMaintenance({ startWeightKg, startingMaintenanceKcal, weeks });
  const latestKg =
    [...a.weeks].reverse().find((w) => w.loggedAvgWeightKg !== null)?.loggedAvgWeightKg ??
    startWeightKg;

  const targets = computeTargets({
    ...rest,
    weightKg: latestKg,
    maintenanceKcal: a.maintenanceKcal,
  });
  return { ...targets, adaptive: a.adaptive, week: a.weeks[a.weeks.length - 1] };
}
