/**
 * Progress: weeks, trends and changes for the Strength, Running and Body views and exercise
 * charts. Derived from logs on every read (docs/data-model.md: derived, not stored). Pure: today
 * is passed in; days are local `YYYY-MM-DD`; weeks start on Monday; units are kg, m, s.
 */
import { addDays, daysBetween, fromLocalDate, mondayOf } from './calendar';

/** The last `n` week starts (Mondays), oldest first; the current week is last. */
export function weekStarts(today: string, n: number): string[] {
  const monday = mondayOf(today);
  return Array.from({ length: n }, (_, i) => addDays(monday, (i - n + 1) * 7));
}

/** (to − from) / from as a whole percent; null without a baseline. */
export function percentChange(from: number, to: number): number | null {
  return from > 0 ? Math.round(((to - from) / from) * 100) : null;
}

const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "9/21", for week axes. */
export function shortDate(day: string): string {
  const d = fromLocalDate(day);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** "Sep 21". */
export function monthDay(day: string): string {
  const d = fromLocalDate(day);
  return `${MONTH[d.getMonth()]} ${d.getDate()}`;
}

/** "today", "yesterday", "Mon" within the week, else "Sep 7". */
export function relativeDay(day: string, today: string): string {
  const diff = daysBetween(day, today);
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff > 1 && diff < 7) return WEEKDAY[fromLocalDate(day).getDay()];
  return monthDay(day);
}

/* ---------------- Strength ---------------- */

/** One completed session of one exercise (exercise_session_bests). */
export type SessionBest = {
  session_id: string;
  exercise_id: string;
  performed_on: string;
  session_name: string;
  best_weight_kg: number | null;
  best_reps: number | null;
  best_e1rm_kg: number;
  volume_kg: number;
  working_sets: number;
  total_reps: number;
  prev_best_e1rm_kg: number | null;
};

/** Volume per week (working sets, all exercises); weeks with nothing are 0. */
export function weeklyVolume(
  rows: readonly SessionBest[],
  weeks: readonly string[],
): { week: string; kg: number }[] {
  const byWeek = new Map(weeks.map((w) => [w, 0]));
  for (const r of rows) {
    const w = mondayOf(r.performed_on);
    if (byWeek.has(w)) byWeek.set(w, byWeek.get(w)! + r.volume_kg);
  }
  return weeks.map((week) => ({ week, kg: byWeek.get(week)! }));
}

export const isPR = (r: SessionBest) =>
  r.prev_best_e1rm_kg !== null && r.best_e1rm_kg > r.prev_best_e1rm_kg;

/** Sessions that set an e1RM PR, newest first. */
export function recentPRs(rows: readonly SessionBest[], n: number): SessionBest[] {
  return rows
    .filter(isPR)
    .sort((a, b) => b.performed_on.localeCompare(a.performed_on))
    .slice(0, n);
}

export type KeyLift = {
  exercise_id: string;
  sessions: number;
  /** Best e1RM of the last 4 weeks (or the latest session's when there's none). */
  e1rm_kg: number;
  from: { weight_kg: number; reps: number; performed_on: string };
  /** Against the best of the 4 weeks before; null without one. */
  change_kg: number | null;
};

const best = (rows: readonly SessionBest[]) =>
  rows.reduce<SessionBest | null>((b, r) => (!b || r.best_e1rm_kg > b.best_e1rm_kg ? r : b), null);

/** The best e1RM of one exercise now (last 4 weeks) and its change over 4 weeks. */
export function currentE1rm(
  rows: readonly SessionBest[],
  today: string,
): Omit<KeyLift, 'exercise_id' | 'sessions'> | null {
  const weighted = rows.filter((r) => r.best_e1rm_kg > 0);
  if (!weighted.length) return null;
  const ago = (r: SessionBest) => daysBetween(r.performed_on, today);
  const recent = weighted.filter((r) => ago(r) < 28);
  const before = weighted.filter((r) => ago(r) >= 28 && ago(r) < 56);
  const latest = [...weighted].sort((a, b) => b.performed_on.localeCompare(a.performed_on))[0];
  const now = best(recent) ?? latest;
  const then = best(before);
  return {
    e1rm_kg: now.best_e1rm_kg,
    from: {
      weight_kg: now.best_weight_kg ?? 0,
      reps: now.best_reps ?? 0,
      performed_on: now.performed_on,
    },
    change_kg: then ? now.best_e1rm_kg - then.best_e1rm_kg : null,
  };
}

/**
 * Key lifts: the `n` weighted exercises with the most sessions in the last 12 weeks (ties: the
 * higher e1RM), with their current e1RM and 4-week change.
 */
export function keyLifts(rows: readonly SessionBest[], today: string, n = 3): KeyLift[] {
  const byExercise = new Map<string, SessionBest[]>();
  for (const r of rows)
    if (r.best_e1rm_kg > 0 && daysBetween(r.performed_on, today) < 84)
      byExercise.set(r.exercise_id, [...(byExercise.get(r.exercise_id) ?? []), r]);
  return [...byExercise.entries()]
    .map(([exercise_id, list]) => ({
      exercise_id,
      sessions: new Set(list.map((r) => r.session_id)).size,
      ...currentE1rm(list, today)!,
    }))
    .sort((a, b) => b.sessions - a.sessions || b.e1rm_kg - a.e1rm_kg)
    .slice(0, n);
}

export type Point = { x: number; y: number };

/** Days since 1970-01-01 (local), a chart x value. */
export function dayNumber(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/** The inverse of dayNumber. */
export function dayFromNumber(n: number): string {
  return new Date(n * 86_400_000).toISOString().slice(0, 10);
}

/** Exercise chart: a dot per session's best e1RM, and a line through each week's best. */
export function e1rmSeries(rows: readonly SessionBest[]): { dots: Point[]; line: Point[] } {
  const weighted = rows.filter((r) => r.best_e1rm_kg > 0);
  const dots = weighted
    .map((r) => ({ x: dayNumber(r.performed_on), y: r.best_e1rm_kg }))
    .sort((a, b) => a.x - b.x);
  const weekly = new Map<string, SessionBest>();
  for (const r of weighted) {
    const w = mondayOf(r.performed_on);
    const cur = weekly.get(w);
    if (!cur || r.best_e1rm_kg > cur.best_e1rm_kg) weekly.set(w, r);
  }
  const line = [...weekly.values()]
    .map((r) => ({ x: dayNumber(r.performed_on), y: r.best_e1rm_kg }))
    .sort((a, b) => a.x - b.x);
  return { dots, line };
}

/* ---------------- Running ---------------- */

export type RunEntry = {
  id: string;
  name: string;
  date: string;
  distance_m: number;
  duration_s: number;
  easy: boolean;
};

export function weeklyMeters(
  runs: readonly RunEntry[],
  weeks: readonly string[],
): { week: string; m: number }[] {
  const byWeek = new Map(weeks.map((w) => [w, 0]));
  for (const r of runs) {
    const w = mondayOf(r.date);
    if (byWeek.has(w)) byWeek.set(w, byWeek.get(w)! + r.distance_m);
  }
  return weeks.map((week) => ({ week, m: byWeek.get(week)! }));
}

/** Distance this calendar month. */
export function monthMeters(runs: readonly RunEntry[], today: string): number {
  const month = today.slice(0, 7);
  return runs.filter((r) => r.date.startsWith(month)).reduce((m, r) => m + r.distance_m, 0);
}

/** Mean weekly distance over `weeks` (full weeks; empty weeks count as 0). */
export function weeklyAverage(runs: readonly RunEntry[], weeks: readonly string[]): number {
  if (!weeks.length) return 0;
  return weeklyMeters(runs, weeks).reduce((m, w) => m + w.m, 0) / weeks.length;
}

/** Distance-weighted easy-run pace per week (s/km); null for weeks without an easy run. */
export function easyPaceByWeek(
  runs: readonly RunEntry[],
  weeks: readonly string[],
): { week: string; pace: number | null }[] {
  const acc = new Map(weeks.map((w) => [w, { m: 0, s: 0 }]));
  for (const r of runs) {
    const a = acc.get(mondayOf(r.date));
    if (a && r.easy && r.distance_m > 0) {
      a.m += r.distance_m;
      a.s += r.duration_s;
    }
  }
  return weeks.map((week) => {
    const a = acc.get(week)!;
    return { week, pace: a.m > 0 ? (a.s * 1000) / a.m : null };
  });
}

/** Last minus first known weekly pace (s/km); negative is faster. */
export function paceChange(series: readonly { pace: number | null }[]): number | null {
  const known = series.map((s) => s.pace).filter((p): p is number => p !== null);
  return known.length >= 2 ? known[known.length - 1] - known[0] : null;
}

/* ---------------- Body ---------------- */

export type Checkin = {
  checkin_date: string;
  weight_kg: number | null;
  waist_cm: number | null;
  neck_cm: number | null;
  hip_cm: number | null;
  body_fat_pct: number | null;
};

export type Range = '1M' | '3M' | '6M' | 'All';
export const RANGES: readonly Range[] = ['1M', '3M', '6M', 'All'];

/** The first day shown for a range; null for All. */
export function rangeStart(range: Range, today: string): string | null {
  const days = { '1M': 30, '3M': 91, '6M': 182, All: null }[range];
  return days === null ? null : addDays(today, -(days - 1));
}

/**
 * The 7-day trend: for each weigh-in day, the mean of the weigh-ins in the 7 days ending that
 * day (missing days are skipped, not filled).
 */
export function rollingAverage(
  checkins: readonly Checkin[],
  days = 7,
): { date: string; kg: number }[] {
  const weighed = checkins
    .filter((c): c is Checkin & { weight_kg: number } => c.weight_kg !== null)
    .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
  return weighed.map((c, i) => {
    let sum = 0;
    let n = 0;
    for (let j = i; j >= 0 && daysBetween(weighed[j].checkin_date, c.checkin_date) < days; j--) {
      sum += weighed[j].weight_kg;
      n++;
    }
    return { date: c.checkin_date, kg: sum / n };
  });
}

export type Measure = 'waist_cm' | 'neck_cm' | 'hip_cm' | 'body_fat_pct';

export type Measurement = {
  key: Measure;
  value: number;
  date: string;
  /** Against the first reading (for body fat: the profile's start when there is one). */
  change: number | null;
};

/** The latest of each measurement with its change since the start. */
export function measurements(
  checkins: readonly Checkin[],
  start: { body_fat_pct: number | null },
): Measurement[] {
  const sorted = [...checkins].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
  const out: Measurement[] = [];
  for (const key of ['waist_cm', 'neck_cm', 'hip_cm', 'body_fat_pct'] as const) {
    const readings = sorted.filter((c) => c[key] !== null);
    if (!readings.length) continue;
    const last = readings[readings.length - 1];
    const first =
      key === 'body_fat_pct' && start.body_fat_pct !== null
        ? start.body_fat_pct
        : readings.length > 1
          ? readings[0][key]!
          : null;
    out.push({
      key,
      value: last[key]!,
      date: last.checkin_date,
      change: first === null ? null : last[key]! - first,
    });
  }
  return out;
}

/* ---------------- chart scales ---------------- */

/** A y domain padded by `pad` of the span (or ±1 for a flat line), for 3 evenly spaced lines. */
export function niceDomain(values: readonly number[], pad = 0.15): [number, number] {
  if (!values.length) return [0, 1];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || Math.max(1, Math.abs(hi) * 0.02);
  return [lo - span * pad, hi + span * pad];
}
