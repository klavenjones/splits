/** Display text for planned sessions. Pure. */
import { paceOf, targetState, type TargetState } from '@/engine/runs';
import { aboutMinutes } from '@/templates/liftTemplate';
import {
  formatDistance,
  formatDuration,
  formatPace,
  M_PER_MI,
  paceUnit,
  type UnitSystem,
} from '@/units';

import {
  setCount,
  type PlanSession,
  type PlanTemplate,
  type RunMatch,
  type RunSummary,
} from './week';

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

/* ---------------- imported runs ---------------- */

/** "6:10 AM" in the phone's time zone. */
export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** Distance, time and pace tiles for an imported run. */
export function runStats(r: RunSummary, units: UnitSystem): { value: string; label: string }[] {
  const pace = r.avg_pace_s_per_km ?? paceOf(r.distance_m, r.duration_s);
  return [
    { value: distanceNumber(r.distance_m, units), label: units === 'imperial' ? 'mi' : 'km' },
    { value: formatDuration(r.duration_s), label: 'time' },
    { value: pace ? formatPace(pace, units, false) : '–', label: `pace ${paceUnit(units)}` },
  ];
}

/** "3.2 mi run at 5:45 PM". */
export function runTitle(r: RunSummary, units: UnitSystem): string {
  return `${formatDistance(r.distance_m, units)} run at ${clockTime(r.started_at)}`;
}

export const MATCH_LABEL: Record<RunMatch, string | null> = {
  auto: 'matched automatically',
  linked: 'linked to your plan',
  extra: 'extra run',
  needs_match: null,
};

/** Whether an imported run was on target (for the badge), from the session's derived target. */
export function runState(s: Pick<PlanSession, 'run' | 'target'>): TargetState {
  if (!s.run) return 'none';
  return targetState(
    s.run.avg_pace_s_per_km ?? paceOf(s.run.distance_m, s.run.duration_s),
    s.target ?? null,
  );
}
