/**
 * Rule-based hybrid coaching notes (docs/flows.md → Hybrid coaching rules). Pure.
 * - Warn when a heavy lower-body session is the day before a hard or long run.
 * - Warn on two upper-body days in a row.
 */
import { muscleGroup } from '@/exercises/vocab';

import { addDays, shortDay, type PlanSession, type PlanTemplate } from './week';

/** A run counts as long from 12 km or 75 minutes (estimated). */
export const LONG_RUN_M = 12_000;
export const LONG_RUN_S = 75 * 60;

export type SessionTraits = {
  heavyLower: boolean;
  upper: boolean;
  hardRun: boolean;
  longRun: boolean;
};

const NONE: SessionTraits = { heavyLower: false, upper: false, hardRun: false, longRun: false };
const UPPER_GROUPS = new Set(['chest', 'back', 'shoulders', 'arms']);

export function classify(t: PlanTemplate | null): SessionTraits {
  if (!t) return NONE;
  if (t.kind === 'lift') {
    const total = t.exercises.reduce((n, e) => n + e.target_sets, 0);
    if (total === 0) return NONE;
    const share = (test: (g: string | null) => boolean) =>
      t.exercises
        .filter((e) => test(muscleGroup(e.primary_muscle)))
        .reduce((n, e) => n + e.target_sets, 0) / total;
    return {
      ...NONE,
      heavyLower: share((g) => g === 'legs') >= 0.5,
      upper: share((g) => g != null && UPPER_GROUPS.has(g)) >= 0.5,
    };
  }
  return {
    ...NONE,
    hardRun: t.segments.some(
      (s) =>
        s.segment_type === 'interval' ||
        (s.target_type === 'effort' && s.target_effort === 'hard') ||
        (s.target_type === 'heart_rate_zone' && (s.target_hr_zone ?? 0) >= 4),
    ),
    longRun: (t.est_distance_m ?? 0) >= LONG_RUN_M || (t.est_duration_s ?? 0) >= LONG_RUN_S,
  };
}

const runWord = (t: SessionTraits) => (t.hardRun ? 'hard run' : 'long run');

/**
 * Notes for `moving` landing on `date`, given the other sessions nearby. Skipped sessions and
 * the moving session itself are ignored.
 */
export function notesFor(
  moving: Pick<PlanSession, 'id' | 'name' | 'template'>,
  date: string,
  others: readonly Pick<PlanSession, 'id' | 'name' | 'scheduled_date' | 'status' | 'template'>[],
): string[] {
  const me = classify(moving.template);
  const on = (day: string) =>
    others.filter((s) => s.id !== moving.id && s.status !== 'skipped' && s.scheduled_date === day);
  const before = on(addDays(date, -1));
  const after = on(addDays(date, 1));
  const notes: string[] = [];

  if (me.heavyLower)
    for (const s of after) {
      const t = classify(s.template);
      if (t.hardRun || t.longRun)
        notes.push(
          `${moving.name} lands the day before ${s.name}. Heavy legs can flatten a ${runWord(t)}; ` +
            `try to leave a day between them.`,
        );
    }
  if (me.hardRun || me.longRun)
    for (const s of before)
      if (classify(s.template).heavyLower)
        notes.push(
          `${s.name} is the day before, on ${shortDay(s.scheduled_date)}. Heavy legs can flatten ` +
            `a ${runWord(me)}; try to leave a day between them.`,
        );
  if (me.upper) {
    const other = [...before, ...after].find((s) => classify(s.template).upper);
    if (other)
      notes.push(
        `${other.name} is on ${shortDay(other.scheduled_date)}, so that's two upper-body days in a ` +
          `row. Your shoulders and elbows may not be fresh.`,
      );
  }
  return notes;
}
