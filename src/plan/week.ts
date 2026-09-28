/**
 * Week planner helpers. Pure: callers pass today's date in. Days are local `YYYY-MM-DD` strings;
 * weeks start on Monday.
 */
import { fromLocalDate, mondayOf, toLocalDate } from '@/engine/calendar';
import type { SegmentType, TargetType } from '@/templates/runSegments';

export type SessionStatus = 'planned' | 'in_progress' | 'completed' | 'skipped';
export type WorkoutKind = 'lift' | 'run';

/** What the planner needs from a session's template: estimates, and enough to classify it. */
export type PlanTemplate = {
  id: string;
  name: string;
  kind: WorkoutKind;
  est_duration_s: number | null;
  est_distance_m: number | null;
  exercises: { target_sets: number; primary_muscle: string | null }[];
  segments: {
    segment_type: SegmentType;
    target_type: TargetType;
    target_effort: string | null;
    target_hr_zone: number | null;
  }[];
};

export type PlanSession = {
  id: string;
  kind: WorkoutKind;
  name: string;
  scheduled_date: string;
  status: SessionStatus;
  skip_reason: string | null;
  template_id: string | null;
  template: PlanTemplate | null;
};

export const SKIP_REASONS = ['tired', 'sore', 'busy', 'sick', 'injury'] as const;
export type SkipReason = (typeof SKIP_REASONS)[number];

export function addDays(day: string, n: number): string {
  const d = fromLocalDate(day);
  d.setDate(d.getDate() + n);
  return toLocalDate(d);
}

/** The 7 days, Monday first. */
export function weekDays(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Sep 21 to 27", or "Sep 28 to Oct 4" across a month. */
export function weekLabel(monday: string): string {
  const a = fromLocalDate(monday);
  const b = fromLocalDate(addDays(monday, 6));
  const start = `${MONTH[a.getMonth()]} ${a.getDate()}`;
  return a.getMonth() === b.getMonth()
    ? `${start} to ${b.getDate()}`
    : `${start} to ${MONTH[b.getMonth()]} ${b.getDate()}`;
}

/** "this week", "next week", "last week", or '' further out. */
export function relativeWeek(monday: string, today: string): string {
  const diff = Math.round(
    (fromLocalDate(monday).getTime() - fromLocalDate(mondayOf(today)).getTime()) / (7 * 86_400_000),
  );
  return diff === 0 ? 'this week' : diff === 1 ? 'next week' : diff === -1 ? 'last week' : '';
}

/** "Thu 24" */
export function shortDay(day: string): string {
  const d = fromLocalDate(day);
  return `${WEEKDAY[d.getDay()]} ${d.getDate()}`;
}

/** "Fri Sep 25" */
export function longDay(day: string): string {
  const d = fromLocalDate(day);
  return `${WEEKDAY[d.getDay()]} ${MONTH[d.getMonth()]} ${d.getDate()}`;
}

/** "MON", "TUE"… */
export function weekdayCode(day: string): string {
  return WEEKDAY[fromLocalDate(day).getDay()].toUpperCase();
}

const STATUS_ORDER: Record<SessionStatus, number> = {
  in_progress: 0,
  completed: 1,
  planned: 2,
  skipped: 3,
};

/** Sessions grouped by day, in a stable order within the day (lifts before runs, then name). */
export function byDay(sessions: readonly PlanSession[]): Map<string, PlanSession[]> {
  const map = new Map<string, PlanSession[]>();
  for (const s of sessions) {
    const list = map.get(s.scheduled_date) ?? [];
    list.push(s);
    map.set(s.scheduled_date, list);
  }
  for (const list of map.values())
    list.sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        a.kind.localeCompare(b.kind) ||
        a.name.localeCompare(b.name) ||
        a.id.localeCompare(b.id),
    );
  return map;
}

export type WeekTotals = {
  runs: number;
  runsDone: number;
  lifts: number;
  liftsDone: number;
  runMeters: number;
  runMetersDone: number;
};

/** Planned vs done for the week. Skipped sessions don't count. */
export function weekTotals(sessions: readonly PlanSession[]): WeekTotals {
  const t: WeekTotals = {
    runs: 0,
    runsDone: 0,
    lifts: 0,
    liftsDone: 0,
    runMeters: 0,
    runMetersDone: 0,
  };
  for (const s of sessions) {
    if (s.status === 'skipped') continue;
    const done = s.status === 'completed';
    if (s.kind === 'lift') {
      t.lifts++;
      if (done) t.liftsDone++;
    } else {
      const m = s.template?.est_distance_m ?? 0;
      t.runs++;
      t.runMeters += m;
      if (done) {
        t.runsDone++;
        t.runMetersDone += m;
      }
    }
  }
  return t;
}

export type RackDay = {
  label: string;
  date: number;
  sessions: { kind: WorkoutKind; done: boolean }[];
};

const LONG_WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** The PlateRack's 7 days, Monday first. Skipped sessions leave no plate. */
export function rackDays(monday: string, sessions: readonly PlanSession[]): RackDay[] {
  const days = byDay(sessions);
  return weekDays(monday).map((day) => {
    const d = fromLocalDate(day);
    return {
      label: LONG_WEEKDAY[d.getDay()],
      date: d.getDate(),
      sessions: (days.get(day) ?? [])
        .filter((s) => s.status !== 'skipped')
        .map((s) => ({ kind: s.kind, done: s.status === 'completed' })),
    };
  });
}

/** The session and every later planned session through that week's Sunday move a day later. */
export function shiftDates<T extends Pick<PlanSession, 'id' | 'scheduled_date' | 'status'>>(
  sessions: readonly T[],
  id: string,
): T[] {
  const from = sessions.find((s) => s.id === id);
  if (!from || from.status !== 'planned') return [...sessions];
  const sunday = addDays(mondayOf(from.scheduled_date), 6);
  return sessions.map((s) =>
    s.status === 'planned' &&
    (s.id === id || (s.scheduled_date > from.scheduled_date && s.scheduled_date <= sunday))
      ? { ...s, scheduled_date: addDays(s.scheduled_date, 1) }
      : s,
  );
}

/** Total target sets in a lift template. */
export const setCount = (t: Pick<PlanTemplate, 'exercises'>) =>
  t.exercises.reduce((n, e) => n + e.target_sets, 0);
