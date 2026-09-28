/** Display text for planned sessions. Pure. */
import { aboutMinutes } from '@/templates/liftTemplate';
import { formatDistance, formatPace, M_PER_MI, type UnitSystem } from '@/units';

import { setCount, type PlanSession, type PlanTemplate } from './week';

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** "6 exercises · 45 min" or "4.5 mi · 40 min"; "template deleted" when it's gone. */
export function sessionMeta(s: Pick<PlanSession, 'template'>, units: UnitSystem): string {
  const t = s.template;
  if (!t) return 'template deleted';
  const minutes = t.est_duration_s ? `${aboutMinutes(t.est_duration_s)} min` : null;
  const first =
    t.kind === 'lift'
      ? plural(t.exercises.length, 'exercise')
      : t.est_distance_m
        ? formatDistance(t.est_distance_m, units)
        : null;
  return [first, minutes].filter(Boolean).join(' · ');
}

/** Library meta for a template row: "6 exercises · 45 min" or "4.5 mi · 40 min". */
export function templateMeta(
  t: {
    kind: 'lift' | 'run';
    exercise_count: number;
    est_distance_m: number | null;
    est_duration_s: number | null;
  },
  units: UnitSystem,
): string {
  const minutes = t.est_duration_s ? `${aboutMinutes(t.est_duration_s)} min` : null;
  const first =
    t.kind === 'lift'
      ? plural(t.exercise_count, 'exercise')
      : t.est_distance_m
        ? formatDistance(t.est_distance_m, units)
        : null;
  return [first, minutes].filter(Boolean).join(' · ');
}

/** "6 exercises · 22 sets" */
export function liftCounts(t: Pick<PlanTemplate, 'exercises'>): string {
  return `${plural(t.exercises.length, 'exercise')} · ${plural(setCount(t), 'set')}`;
}

/** Average pace from the estimates, e.g. "9:45" (no unit), or null. */
export function averagePace(
  t: Pick<PlanTemplate, 'est_distance_m' | 'est_duration_s'>,
  units: UnitSystem,
) {
  if (!t.est_distance_m || !t.est_duration_s) return null;
  return formatPace((t.est_duration_s * 1000) / t.est_distance_m, units, false);
}

/** "4.0" style distance number for stat tiles, in mi or km. */
export function distanceNumber(m: number, units: UnitSystem): string {
  const v = units === 'imperial' ? m / M_PER_MI : m / 1000;
  return v.toFixed(1);
}
