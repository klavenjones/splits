/**
 * Apple Health → Supabase. Reads running workouts added (or deleted) since the last import and
 * sends each one to `import_run`, which matches it to the plan; then the day's weight. HealthKit
 * is the durable source, so nothing is queued on the phone: the anchor only moves forward after
 * every call succeeded, and a re-send is harmless (unique on the HealthKit UUID).
 */
import { toLocalDate } from '@/engine/calendar';
import { withStep } from '@/lib/errors';
import { M_PER_MI, type UnitSystem } from '@/units';

import { computeSplits, type DistanceSample, type HeartRateSample, type Interval } from './splits';

export type HealthWorkout = {
  uuid: string;
  start: number;
  end: number;
  /** Moving time, seconds (HealthKit's duration leaves pauses out). */
  duration_s: number;
  distance_m: number | null;
  elevation_gain_m: number | null;
  pauses: Interval[];
};

export type WeightSample = { t: number; kg: number };

/** What the importer needs from HealthKit (src/health/healthkit.ts, or a fake in tests). */
export type HealthSource<W extends HealthWorkout = HealthWorkout> = {
  runs(
    anchor: string | null,
    since: Date,
  ): Promise<{ workouts: W[]; deleted: string[]; anchor: string }>;
  distance(w: W): Promise<DistanceSample[]>;
  heartRate(w: W): Promise<HeartRateSample[]>;
  weights(since: Date): Promise<WeightSample[]>;
  release?(w: W): void;
};

export type RunPayload = {
  external_id: string;
  started_at: string;
  ended_at: string;
  local_date: string;
  distance_m: number;
  duration_s: number;
  avg_hr: number | null;
  max_hr: number | null;
  elevation_gain_m: number | null;
  recent: boolean;
  splits: ReturnType<typeof computeSplits>;
};

export type ImportApi = {
  importRun(p: RunPayload): Promise<{ session_id: string; match: string; created: boolean }>;
  removeRun(externalId: string): Promise<boolean>;
  importWeights(days: { date: string; kg: number }[]): Promise<number>;
  touch(): Promise<void>;
};

/** Small key/value store for the anchor and the import window (localStorage on the phone). */
export type KeyValue = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export const FIRST_IMPORT_DAYS = 56;
export const RECENT_DAYS = 7;
const DAY_MS = 86_400_000;

const keys = (userId: string) => ({
  anchor: `splits.health.${userId}.runs-anchor`,
  since: `splits.health.${userId}.since`,
  weightsThrough: `splits.health.${userId}.weights-through`,
});

/** An error the server won't ever accept for this run (bad data): skip it rather than stall. */
const permanent = (e: unknown) => (e as { code?: string } | null)?.code === '22023';

export async function buildRun<W extends HealthWorkout>(
  w: W,
  hk: HealthSource<W>,
  units: UnitSystem,
  now: number,
): Promise<RunPayload> {
  const [samples, hr] = await withStep('healthkit_read', () =>
    Promise.all([hk.distance(w), hk.heartRate(w)]),
  );
  const summed = samples.reduce((m, s) => m + s.meters, 0);
  const distance = Math.round(w.distance_m ?? summed);
  const moving = hr.filter((h) => !w.pauses.some((p) => h.t >= p.start && h.t < p.end));
  const bpm = moving.map((h) => h.bpm);
  return {
    external_id: w.uuid,
    started_at: new Date(w.start).toISOString(),
    ended_at: new Date(w.end).toISOString(),
    local_date: toLocalDate(new Date(w.start)),
    distance_m: distance,
    duration_s: Math.round(w.duration_s),
    avg_hr: bpm.length ? Math.round(bpm.reduce((a, b) => a + b, 0) / bpm.length) : null,
    max_hr: bpm.length ? Math.round(Math.max(...bpm)) : null,
    elevation_gain_m: w.elevation_gain_m === null ? null : Math.round(w.elevation_gain_m),
    recent: w.start >= now - RECENT_DAYS * DAY_MS,
    splits: computeSplits(samples, {
      start: w.start,
      end: w.end,
      splitM: units === 'imperial' ? M_PER_MI : 1000,
      pauses: w.pauses,
      hr: moving,
    }),
  };
}

/** The earliest reading of each local day (the morning weigh-in). */
export function dailyWeights(samples: readonly WeightSample[]): { date: string; kg: number }[] {
  const byDay = new Map<string, WeightSample>();
  for (const s of samples) {
    const day = toLocalDate(new Date(s.t));
    const cur = byDay.get(day);
    if (!cur || s.t < cur.t) byDay.set(day, s);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, s]) => ({ date, kg: Math.round(s.kg * 100) / 100 }));
}

export type ImportResult = { runs: number; removed: number; weights: number; skipped: number };

export async function importOnce<W extends HealthWorkout>(deps: {
  userId: string;
  units: UnitSystem;
  hk: HealthSource<W>;
  api: ImportApi;
  kv: KeyValue;
  now: number;
}): Promise<ImportResult> {
  const { hk, api, kv, now } = deps;
  const k = keys(deps.userId);
  const result: ImportResult = { runs: 0, removed: 0, weights: 0, skipped: 0 };

  // The window is fixed at the first import, so the anchored query keeps the same filter.
  let since = Number(kv.getItem(k.since));
  if (!since) {
    since = now - FIRST_IMPORT_DAYS * DAY_MS;
    kv.setItem(k.since, String(since));
  }

  const { workouts, deleted, anchor } = await withStep('healthkit_read', () =>
    hk.runs(kv.getItem(k.anchor), new Date(since)),
  );
  try {
    for (const w of workouts) {
      const p = await buildRun(w, hk, deps.units, now);
      try {
        const r = await api.importRun(p);
        if (r.created) result.runs++;
      } catch (e) {
        if (!permanent(e)) throw e;
        result.skipped++;
      }
    }
  } finally {
    for (const w of workouts) hk.release?.(w);
  }
  for (const id of deleted) if (await api.removeRun(id)) result.removed++;
  kv.setItem(k.anchor, anchor);

  // Weight: re-send from the day before the last import, so a later reading that day is seen.
  const through = kv.getItem(k.weightsThrough);
  const wSince = through ? Date.parse(`${through}T00:00:00`) - DAY_MS : since;
  const days = dailyWeights(await withStep('healthkit_read', () => hk.weights(new Date(wSince))));
  if (days.length) result.weights = await api.importWeights(days);
  kv.setItem(k.weightsThrough, toLocalDate(new Date(now)));

  await api.touch();
  return result;
}

/** Forgets the anchor and window (on disconnect), so reconnecting starts a fresh import. */
export function resetImport(userId: string, kv: KeyValue) {
  for (const key of Object.values(keys(userId))) kv.removeItem(key);
}

let running: Promise<ImportResult> | null = null;
let again = false;

/**
 * One import at a time. A call during an import runs once more right after it (a new run may
 * have landed mid-import); callers get the totals of the import that covers their call.
 */
export function importRuns<W extends HealthWorkout>(
  deps: Omit<Parameters<typeof importOnce<W>>[0], 'now'> & { now?: () => number },
): Promise<ImportResult> {
  if (running) {
    again = true;
    return running;
  }
  const clock = deps.now ?? Date.now;
  const loop = async (): Promise<ImportResult> => {
    // Totals across passes, so a caller sees the runs a repeat pass didn't find again.
    const total: ImportResult = { runs: 0, removed: 0, weights: 0, skipped: 0 };
    do {
      again = false;
      const r = await importOnce({ ...deps, now: clock() });
      total.runs += r.runs;
      total.removed += r.removed;
      total.weights += r.weights;
      total.skipped += r.skipped;
    } while (again);
    return total;
  };
  running = loop().finally(() => {
    running = null;
  });
  return running;
}
