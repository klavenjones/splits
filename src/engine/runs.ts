/**
 * Target vs actual for imported runs. The target comes from the planned session's template
 * segments (docs/data-model.md: derived, not stored). Pure.
 */
import {
  expand,
  segmentDistance,
  segmentDuration,
  toBlocks,
  type SegmentRow,
} from '../templates/runSegments';
import { formatDuration, secPerKmToSecPerMi, type UnitSystem } from '../units';

export type RunTarget = {
  /** How the pace was set: a pace target, or estimated from efforts. */
  kind: 'pace' | 'effort';
  /** Expected average pace over the whole run, s/km. */
  pace_s_per_km: number;
  /** ± s/km that still counts as on target. */
  tolerance_s: number;
  distance_m: number | null;
};

export type TargetState = 'on_target' | 'faster' | 'slower' | 'none';

/** Pace targets with no tolerance set get this much room (s/km). */
export const DEFAULT_PACE_TOLERANCE_S = 10;
/** Effort targets are looser: the expected pace is only an estimate (s/km). */
export const EFFORT_TOLERANCE_S = 30;

/**
 * The run's target: the distance-weighted expected pace of the expanded segments, using pace
 * targets where set and default effort paces elsewhere. Null with no segments, or when every
 * target is a heart-rate zone or none (zones aren't set up yet).
 */
export function runTarget(
  rows: readonly SegmentRow[],
  estDistanceM: number | null,
): RunTarget | null {
  const seq = expand(toBlocks(rows)).map((e) => e.segment);
  if (!seq.length) return null;
  const paced = seq.filter((s) => s.target_type === 'pace' && s.target_pace_s_per_km);
  const kind = paced.length
    ? 'pace'
    : seq.some((s) => s.target_type === 'effort')
      ? 'effort'
      : null;
  if (!kind) return null;

  let meters = 0;
  let seconds = 0;
  for (const s of seq) {
    meters += segmentDistance(s);
    seconds += segmentDuration(s);
  }
  if (meters <= 0) return null;

  let tolerance = EFFORT_TOLERANCE_S;
  if (kind === 'pace') {
    let w = 0;
    let sum = 0;
    for (const s of paced) {
      const d = segmentDistance(s);
      w += d;
      sum += d * (s.target_pace_tolerance_s || DEFAULT_PACE_TOLERANCE_S);
    }
    tolerance = w ? Math.round(sum / w) : DEFAULT_PACE_TOLERANCE_S;
  }
  return {
    kind,
    pace_s_per_km: Math.round((seconds * 1000) / meters),
    tolerance_s: tolerance,
    distance_m: estDistanceM ?? Math.round(meters),
  };
}

export function paceOf(distanceM: number, durationS: number): number | null {
  return distanceM > 0 && durationS > 0 ? (durationS * 1000) / distanceM : null;
}

export function targetState(actualSPerKm: number | null, target: RunTarget | null): TargetState {
  if (actualSPerKm === null || !target) return 'none';
  const diff = actualSPerKm - target.pace_s_per_km;
  if (Math.abs(diff) <= target.tolerance_s) return 'on_target';
  return diff < 0 ? 'faster' : 'slower';
}

/** Actual minus target, in seconds per mile or km (the user's units). Negative is faster. */
export function paceDelta(actualSPerKm: number, targetSPerKm: number, units: UnitSystem): number {
  const d = actualSPerKm - targetSPerKm;
  return Math.round(units === 'imperial' ? secPerKmToSecPerMi(d) : d);
}

/** "+0:11", "−0:02", "0:00". */
export function signedTime(sec: number): string {
  if (sec === 0) return '0:00';
  return `${sec < 0 ? '−' : '+'}${formatDuration(Math.abs(sec))}`;
}

/** "4 sec faster than target", "1:05 slower than target", "right on target". */
export function deltaSentence(sec: number): string {
  if (sec === 0) return 'right on target';
  const abs = Math.abs(sec);
  const amount = abs < 60 ? `${abs} sec` : formatDuration(abs);
  return `${amount} ${sec < 0 ? 'faster' : 'slower'} than target`;
}

/** A split against the target: "−0:08" and "faster", "on pace" or "slower". */
export function splitVsTarget(
  splitSPerKm: number,
  target: RunTarget,
  units: UnitSystem,
): { delta: string; word: 'faster' | 'on pace' | 'slower' } {
  const state = targetState(splitSPerKm, target);
  return {
    delta: signedTime(paceDelta(splitSPerKm, target.pace_s_per_km, units)),
    word: state === 'faster' ? 'faster' : state === 'slower' ? 'slower' : 'on pace',
  };
}
