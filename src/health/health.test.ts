import {
  buildRun,
  dailyWeights,
  importOnce,
  importRuns,
  type HealthSource,
  type HealthWorkout,
  type ImportApi,
  type KeyValue,
  type RunPayload,
} from './importer';
import { activeMs, computeSplits, pausesFrom, type DistanceSample } from './splits';

const T0 = Date.parse('2026-10-05T10:00:00Z');
const MI = 1609.344;

/** Steady samples of `every` seconds at `pace` s/km from `start`, for `meters`. */
function steady(start: number, meters: number, pace: number, every = 10): DistanceSample[] {
  const out: DistanceSample[] = [];
  const perSec = 1000 / pace;
  let t = start;
  let left = meters;
  while (left > 1e-9) {
    const m = Math.min(left, perSec * every);
    const secs = m / perSec;
    out.push({ start: t, end: t + secs * 1000, meters: m });
    t += secs * 1000;
    left -= m;
  }
  return out;
}

describe('computeSplits', () => {
  it('splits a steady 4.1 mi run into 4 miles plus the remainder', () => {
    const pace = 352; // 9:26 /mi
    const samples = steady(T0, 4.1 * MI, pace);
    const end = samples[samples.length - 1].end;
    const splits = computeSplits(samples, { start: T0, end, splitM: MI });
    expect(splits.map((s) => s.split_index)).toEqual([1, 2, 3, 4, 5]);
    expect(splits.slice(0, 4).every((s) => s.distance_m === 1609)).toBe(true);
    for (const s of splits.slice(0, 4)) expect(s.duration_s).toBeCloseTo((pace * MI) / 1000, -0.5);
    expect(splits[4].distance_m).toBe(161);
    expect(splits[4].duration_s).toBe(Math.round((0.1 * MI * pace) / 1000));
  });

  it('places a boundary inside the sample that crosses it', () => {
    // Two 600 m samples over 100 s each: the 1 km mark is 2/3 into the second.
    const samples = [
      { start: T0, end: T0 + 100_000, meters: 600 },
      { start: T0 + 100_000, end: T0 + 200_000, meters: 600 },
    ];
    const splits = computeSplits(samples, { start: T0, end: T0 + 200_000, splitM: 1000 });
    expect(splits[0]).toMatchObject({ distance_m: 1000, duration_s: 167 });
    expect(splits[1]).toMatchObject({ distance_m: 200, duration_s: 33 });
  });

  it('leaves paused time out of the split it falls in', () => {
    const samples = [
      ...steady(T0, 500, 300),
      ...steady(T0 + 150_000 + 60_000, 500, 300), // 60 s stopped at a light
    ];
    const end = samples[samples.length - 1].end;
    const pauses = [{ start: T0 + 150_000, end: T0 + 210_000 }];
    const [km] = computeSplits(samples, { start: T0, end, splitM: 1000, pauses });
    expect(km.duration_s).toBe(300);
  });

  it('works in km, drops a tiny remainder, and averages heart rate per split', () => {
    const samples = steady(T0, 2020, 300);
    const end = samples[samples.length - 1].end;
    const hr = [
      { t: T0 + 10_000, bpm: 140 },
      { t: T0 + 200_000, bpm: 150 },
      { t: T0 + 400_000, bpm: 160 },
    ];
    const splits = computeSplits(samples, { start: T0, end, splitM: 1000, hr });
    expect(splits).toHaveLength(2);
    expect(splits.map((s) => s.avg_hr)).toEqual([145, 160]);
  });

  it('returns nothing without distance', () => {
    expect(computeSplits([], { start: T0, end: T0 + 60_000, splitM: 1000 })).toEqual([]);
  });
});

describe('pauses', () => {
  it('pairs pause and resume, and an open pause runs to the end', () => {
    expect(
      pausesFrom(
        [
          { type: 'resume', t: 50 },
          { type: 'pause', t: 10 },
          { type: 'pause', t: 80 },
        ],
        100,
      ),
    ).toEqual([
      { start: 10, end: 50 },
      { start: 80, end: 100 },
    ]);
    expect(activeMs(0, 100, [{ start: 10, end: 50 }])).toBe(60);
  });
});

describe('dailyWeights', () => {
  it('keeps the earliest reading of each local day', () => {
    const at = (s: string) => new Date(s).getTime();
    expect(
      dailyWeights([
        { t: at('2026-10-05T20:00:00'), kg: 93.2 },
        { t: at('2026-10-05T06:30:00'), kg: 92.44 },
        { t: at('2026-10-06T07:00:00'), kg: 92.1 },
      ]),
    ).toEqual([
      { date: '2026-10-05', kg: 92.44 },
      { date: '2026-10-06', kg: 92.1 },
    ]);
  });
});

/* ---------------- importer ---------------- */

function memoryKv(): KeyValue & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const run = (uuid: string, start = T0, meters = 3 * MI): HealthWorkout => ({
  uuid,
  start,
  end: start + ((meters / 1000) * 360 + 30) * 1000,
  duration_s: (meters / 1000) * 360,
  distance_m: meters,
  elevation_gain_m: 12.4,
  pauses: [],
});

function fakeHealth(workouts: HealthWorkout[], deleted: string[] = []) {
  const calls: { anchor: string | null; since: Date }[] = [];
  let n = 0;
  const hk: HealthSource = {
    runs: async (anchor, since) => {
      calls.push({ anchor, since });
      // An anchored query only returns what's new since the anchor.
      const fresh = anchor ? [] : workouts;
      return { workouts: fresh, deleted: anchor ? deleted : [], anchor: `a${++n}` };
    },
    distance: async (w) => steady(w.start, w.distance_m ?? 0, 360),
    heartRate: async (w) => [
      { t: w.start + 1000, bpm: 140 },
      { t: w.start + 60_000, bpm: 160 },
    ],
    weights: async () => [{ t: T0, kg: 92.4 }],
  };
  return { hk, calls };
}

function fakeApi(fail?: (p: RunPayload) => unknown) {
  const imported = new Map<string, RunPayload>();
  const removed: string[] = [];
  const weights: { date: string; kg: number }[][] = [];
  const api: ImportApi = {
    importRun: async (p) => {
      const err = fail?.(p);
      if (err) throw err;
      const created = !imported.has(p.external_id);
      imported.set(p.external_id, p);
      return { session_id: `s-${p.external_id}`, match: 'auto', created };
    },
    removeRun: async (id) => {
      removed.push(id);
      return imported.delete(id);
    },
    importWeights: async (days) => {
      weights.push(days);
      return days.length;
    },
    touch: async () => {},
  };
  return { api, imported, removed, weights };
}

const NOW = T0 + 3 * 3600_000;

describe('buildRun', () => {
  it('fills the payload: local date, recent, splits in the user unit, heart rate', async () => {
    const { hk } = fakeHealth([]);
    const p = await buildRun(run('HK-1'), hk, 'imperial', NOW);
    expect(p).toMatchObject({
      external_id: 'HK-1',
      local_date: '2026-10-05',
      distance_m: 4828,
      avg_hr: 150,
      max_hr: 160,
      elevation_gain_m: 12,
      recent: true,
    });
    expect(p.splits).toHaveLength(3);
    const metric = await buildRun(run('HK-1'), hk, 'metric', NOW);
    expect(metric.splits.map((s) => s.distance_m)).toEqual([1000, 1000, 1000, 1000, 828]);
    const old = await buildRun(run('HK-1'), hk, 'metric', NOW + 8 * 86_400_000);
    expect(old.recent).toBe(false);
  });
});

describe('importOnce', () => {
  it('imports the first window, then only what changed, and keeps the window fixed', async () => {
    const kv = memoryKv();
    const { hk, calls } = fakeHealth([run('HK-1'), run('HK-2', T0 + 3600_000)], ['HK-1']);
    const { api, imported, removed, weights } = fakeApi();
    const deps = { userId: 'u1', units: 'imperial' as const, hk, api, kv, now: NOW };

    const first = await importOnce(deps);
    expect(first).toMatchObject({ runs: 2, weights: 1 });
    expect(calls[0].anchor).toBeNull();
    expect(calls[0].since.getTime()).toBe(NOW - 56 * 86_400_000);
    expect(imported.size).toBe(2);
    expect(weights[0]).toEqual([{ date: '2026-10-05', kg: 92.4 }]);

    const second = await importOnce({ ...deps, now: NOW + 60_000 });
    expect(calls[1]).toEqual({ anchor: 'a1', since: calls[0].since });
    expect(second).toMatchObject({ runs: 0, removed: 1 });
    expect(removed).toEqual(['HK-1']);
  });

  it('keeps the anchor when an import fails, so the next try sends it again', async () => {
    const kv = memoryKv();
    const { hk, calls } = fakeHealth([run('HK-1')]);
    let offline = true;
    const { api, imported } = fakeApi(() => (offline ? new Error('Network request failed') : null));
    const deps = { userId: 'u1', units: 'imperial' as const, hk, api, kv, now: NOW };

    await expect(importOnce(deps)).rejects.toThrow('Network');
    expect(kv.getItem('splits.health.u1.runs-anchor')).toBeNull();
    offline = false;
    await importOnce(deps);
    expect(calls[1].anchor).toBeNull();
    expect(imported.has('HK-1')).toBe(true);
    // Re-sending an imported run is harmless.
    kv.removeItem('splits.health.u1.runs-anchor');
    expect((await importOnce(deps)).runs).toBe(0);
  });

  it('skips a run the server rejects as invalid instead of stalling', async () => {
    const kv = memoryKv();
    const { hk } = fakeHealth([run('BAD'), run('HK-2')]);
    const { api, imported } = fakeApi((p) =>
      p.external_id === 'BAD' ? Object.assign(new Error('invalid run'), { code: '22023' }) : null,
    );
    const r = await importOnce({ userId: 'u1', units: 'metric', hk, api, kv, now: NOW });
    expect(r).toMatchObject({ runs: 1, skipped: 1 });
    expect([...imported.keys()]).toEqual(['HK-2']);
    expect(kv.getItem('splits.health.u1.runs-anchor')).toBe('a1');
  });
});

describe('importRuns', () => {
  it('runs one import at a time and once more for a call made mid-import', async () => {
    const kv = memoryKv();
    const { hk, calls } = fakeHealth([run('HK-1')]);
    const { api } = fakeApi();
    const deps = { userId: 'u1', units: 'imperial' as const, hk, api, kv, now: () => NOW };
    const a = importRuns(deps);
    const b = importRuns(deps);
    const c = importRuns(deps);
    expect(a).toBe(b);
    await Promise.all([a, b, c]);
    expect(calls).toHaveLength(2);
  });
});
