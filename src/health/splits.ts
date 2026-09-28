/**
 * Per-mile or per-km splits from a workout's distance samples. HealthKit has no split API (Apple
 * recommends summing `distanceWalkingRunning` samples), and the Watch writes many short samples,
 * so a boundary is placed by interpolating inside the sample that crosses it. Paused time is left
 * out of every split. Pure: times are epoch milliseconds.
 */

export type DistanceSample = { start: number; end: number; meters: number };
export type HeartRateSample = { t: number; bpm: number };
export type Interval = { start: number; end: number };

export type Split = {
  split_index: number;
  distance_m: number;
  duration_s: number;
  avg_hr: number | null;
};

/** A remainder shorter than this isn't shown as a final split. */
export const MIN_LAST_SPLIT_M = 50;

/** Milliseconds in [a, b] that aren't inside a pause. */
export function activeMs(a: number, b: number, pauses: readonly Interval[]): number {
  let ms = Math.max(0, b - a);
  for (const p of pauses) ms -= Math.max(0, Math.min(b, p.end) - Math.max(a, p.start));
  return Math.max(0, ms);
}

/**
 * Pause intervals from workout events: pause→resume and motion-paused→motion-resumed pairs. A
 * pause with no resume runs to the end of the workout.
 */
export function pausesFrom(
  events: readonly { type: 'pause' | 'resume'; t: number }[],
  end: number,
): Interval[] {
  const out: Interval[] = [];
  let open: number | null = null;
  for (const e of [...events].sort((a, b) => a.t - b.t)) {
    if (e.type === 'pause' && open === null) open = e.t;
    else if (e.type === 'resume' && open !== null) {
      out.push({ start: open, end: e.t });
      open = null;
    }
  }
  if (open !== null) out.push({ start: open, end });
  return out;
}

function avgHr(hr: readonly HeartRateSample[], a: number, b: number): number | null {
  let sum = 0;
  let n = 0;
  for (const s of hr)
    if (s.t >= a && s.t < b) {
      sum += s.bpm;
      n++;
    }
  return n ? Math.round(sum / n) : null;
}

/**
 * Splits of `splitM` meters (1,000 or 1,609.344) from the workout's start to its end. Each
 * sample's distance is spread evenly over its time; the last split is the remainder when it's at
 * least MIN_LAST_SPLIT_M.
 */
export function computeSplits(
  samples: readonly DistanceSample[],
  opts: {
    start: number;
    end: number;
    splitM: number;
    pauses?: readonly Interval[];
    hr?: readonly HeartRateSample[];
  },
): Split[] {
  const { start, end, splitM } = opts;
  const pauses = opts.pauses ?? [];
  const hr = opts.hr ?? [];
  const sorted = [...samples].filter((s) => s.meters > 0).sort((a, b) => a.start - b.start);

  const boundaries: number[] = [];
  let total = 0;
  for (const s of sorted) {
    const next = total + s.meters;
    let k = boundaries.length + 1;
    while (next >= k * splitM) {
      const frac = (k * splitM - total) / s.meters;
      boundaries.push(s.start + (s.end - s.start) * frac);
      k++;
    }
    total = next;
  }

  const splits: Split[] = [];
  let from = start;
  boundaries.forEach((t, i) => {
    splits.push({
      split_index: i + 1,
      distance_m: Math.round(splitM),
      duration_s: Math.round(activeMs(from, t, pauses) / 1000),
      avg_hr: avgHr(hr, from, t),
    });
    from = t;
  });
  const rest = total - boundaries.length * splitM;
  if (rest >= MIN_LAST_SPLIT_M) {
    const last = Math.max(from, sorted[sorted.length - 1]?.end ?? end);
    splits.push({
      split_index: splits.length + 1,
      distance_m: Math.round(rest),
      duration_s: Math.round(activeMs(from, Math.min(last, end), pauses) / 1000),
      avg_hr: avgHr(hr, from, Math.min(last, end) + 1),
    });
  }
  return splits;
}
