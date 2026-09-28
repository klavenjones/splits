/**
 * The weekly check-in: when it's due, and the weeks of logs it runs on. Pure (the clock and the
 * logs are passed in); shared with the `weekly-checkin` Edge Function through
 * supabase/functions/_shared (scripts/sync-functions.mjs).
 */
import { addDays, mondayOf } from './calendar';
import {
  weeklyUpdate,
  type Experience,
  type Goal,
  type Phase,
  type Sex,
  type WeekLog,
} from './nutrition';

/** A check-in runs from this local time on the check-in day (late Sunday logs are in by then). */
export const CHECKIN_HOUR = 4;

export type LocalTime = { date: string; weekday: number; minutes: number };

/**
 * `now` in an IANA time zone: the local date (YYYY-MM-DD), ISO weekday (1 = Monday … 7 = Sunday)
 * and minutes past midnight. Unknown zones fall back to UTC.
 */
export function localTime(now: Date, timeZone: string): LocalTime {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      weekday: 'short',
    }).formatToParts(now);
  } catch {
    return localTime(now, 'UTC');
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday')) + 1;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    weekday,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

/**
 * Whether a check-in should be proposed now: on the check-in weekday from 04:00 local, or any
 * later day of the same week (a missed run catches up), when this week has no targets row yet.
 * Returns the week (Monday) the row is for, or null.
 */
export function dueWeek(input: {
  now: LocalTime;
  checkinWeekday: number;
  startDate: string;
  hasRow: (weekStart: string) => boolean;
}): string | null {
  const { now, checkinWeekday } = input;
  const weekStart = mondayOf(now.date);
  // The first check-in is the week after the start week (it reviews week 1).
  if (weekStart <= mondayOf(input.startDate)) return null;
  const reached =
    now.weekday > checkinWeekday ||
    (now.weekday === checkinWeekday && now.minutes >= CHECKIN_HOUR * 60);
  if (!reached || input.hasRow(weekStart)) return null;
  return weekStart;
}

export type DayRecord = {
  date: string;
  weightKg: number | null;
  kcal: number | null;
  bodyFatPct: number | null;
};

/**
 * Weeks of logs from the start week through the week before `weekStart`, Monday first. Days
 * before the start date are empty, as in the sheet (week 1 starts at the start date's Monday).
 */
export function buildWeeks(
  startDate: string,
  weekStart: string,
  days: readonly DayRecord[],
): WeekLog[] {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const weeks: WeekLog[] = [];
  for (let monday = mondayOf(startDate); monday < weekStart; monday = addDays(monday, 7)) {
    weeks.push(
      Array.from({ length: 7 }, (_, i) => {
        const day = addDays(monday, i);
        const d = day >= startDate ? byDate.get(day) : undefined;
        return {
          weightKg: d?.weightKg ?? null,
          kcal: d?.kcal ?? null,
          bodyFatPct: d?.bodyFatPct ?? null,
        };
      }),
    );
  }
  return weeks;
}

export type NutritionProfile = {
  sex: Sex;
  experience: Experience;
  goal: Goal;
  phase: Phase;
  rate_mode: 'auto' | 'manual';
  weekly_rate_pct: number;
  start_date: string;
  start_weight_kg: number;
  start_body_fat_pct: number;
};

/** The weekly_targets row a check-in proposes (propose_weekly_targets payload). */
export type Proposal = {
  week_start: string;
  days_logged: number;
  avg_weight_kg: number | null;
  avg_kcal: number | null;
  weight_change_kg: number | null;
  maintenance_kcal: number;
  kcal_target: number;
  kcal_low: number;
  kcal_high: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
};

/** Runs the engine for a check-in week and returns the row to propose, plus the engine output. */
export function proposeTargets(
  profile: NutritionProfile,
  weekStart: string,
  days: readonly DayRecord[],
): { proposal: Proposal; result: ReturnType<typeof weeklyUpdate> } | null {
  const weeks = buildWeeks(profile.start_date, weekStart, days);
  if (!weeks.length) return null;
  const result = weeklyUpdate({
    sex: profile.sex,
    experience: profile.experience,
    goal: profile.goal,
    phase: profile.phase,
    rateOverridePct: profile.rate_mode === 'manual' ? profile.weekly_rate_pct : undefined,
    startWeightKg: Number(profile.start_weight_kg),
    startBodyFatPct: Number(profile.start_body_fat_pct),
    weeks,
  });
  const w = result.week;
  return {
    result,
    proposal: {
      week_start: weekStart,
      days_logged: w.daysLogged,
      avg_weight_kg: w.weightDays ? Math.round(w.avgWeightKg * 100) / 100 : null,
      avg_kcal: w.avgKcal === null ? null : Math.round(w.avgKcal),
      weight_change_kg: w.weightDays ? Math.round(w.weightChangeKg * 100) / 100 : null,
      maintenance_kcal: result.maintenanceKcal,
      kcal_target: result.kcalTarget,
      kcal_low: result.kcalLow,
      kcal_high: result.kcalHigh,
      protein_g: result.proteinG,
      fat_g: result.fatG,
      carbs_g: result.carbsG,
    },
  };
}
