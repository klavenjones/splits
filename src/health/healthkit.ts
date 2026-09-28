/**
 * The one file that talks to HealthKit (@kingstinct/react-native-healthkit). Everything else
 * uses the `HealthSource` shape from importer.ts. The library is loaded lazily so a build
 * without the native module (Expo Go, web, Jest) just reports HealthKit as unavailable.
 */
import type * as HK from '@kingstinct/react-native-healthkit';

import type { HealthSource, HealthWorkout } from './importer';
import { pausesFrom } from './splits';

let lib: typeof HK | null | undefined;
function hk(): typeof HK | null {
  if (lib === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      lib = require('@kingstinct/react-native-healthkit') as typeof HK;
      if (!lib.isHealthDataAvailable()) lib = null;
    } catch {
      lib = null;
    }
  }
  return lib;
}

export const isAvailable = () => hk() !== null;

const WORKOUTS = 'HKWorkoutTypeIdentifier';
const DISTANCE = 'HKQuantityTypeIdentifierDistanceWalkingRunning';
const HEART_RATE = 'HKQuantityTypeIdentifierHeartRate';
const BODY_MASS = 'HKQuantityTypeIdentifierBodyMass';
const READ = [WORKOUTS, DISTANCE, HEART_RATE, BODY_MASS] as const;
/** Only the dev-only sample run writes (simulator testing). */
const WRITE = [WORKOUTS, DISTANCE, HEART_RATE, BODY_MASS] as const;

/**
 * Shows Apple's Health permission sheet (once; later calls return straight away). HealthKit
 * never says whether read access was granted, so this only fails when the sheet couldn't show.
 */
export async function requestAccess(): Promise<boolean> {
  const h = hk();
  if (!h) return false;
  return h.requestAuthorization({
    toRead: READ,
    ...(__DEV__ ? { toShare: WRITE } : {}),
  });
}

/**
 * Background delivery: HealthKit relaunches the app when a workout or weight is saved. The
 * library registers the observers at launch (as Apple requires) and queues the event until
 * `onWorkoutsChanged` subscribes. Resolves false when the entitlement isn't granted.
 */
export async function enableBackground(): Promise<boolean> {
  const h = hk();
  if (!h) return false;
  try {
    return await h.configureBackgroundTypes([WORKOUTS, BODY_MASS], h.UpdateFrequency.immediate);
  } catch {
    return false;
  }
}

export async function disableBackground() {
  const h = hk();
  if (!h) return;
  try {
    await h.clearBackgroundTypes();
    await h.disableAllBackgroundDelivery();
  } catch {
    // Nothing to turn off.
  }
}

/** Calls back when workouts or weights change in Health. Returns an unsubscribe. */
export function onHealthChanged(cb: () => void): () => void {
  const h = hk();
  if (!h) return () => {};
  const subs = ([WORKOUTS, BODY_MASS] as const).map((id) =>
    h.subscribeToChanges(id, (e: { errorMessage?: string }) => {
      if (!e.errorMessage) cb();
    }),
  );
  return () => subs.forEach((s) => s.remove());
}

type WorkoutProxy = HK.WorkoutProxyTyped;
type Workout = HealthWorkout & { proxy: WorkoutProxy };

const time = (d: Date | string) => new Date(d).getTime();

function toWorkout(w: WorkoutProxy): Workout {
  const h = hk()!;
  const end = time(w.endDate);
  const events = (w.events ?? []).flatMap((e): { type: 'pause' | 'resume'; t: number }[] =>
    e.type === h.WorkoutEventType.pause || e.type === h.WorkoutEventType.motionPaused
      ? [{ type: 'pause' as const, t: time(e.startDate) }]
      : e.type === h.WorkoutEventType.resume || e.type === h.WorkoutEventType.motionResumed
        ? [{ type: 'resume' as const, t: time(e.startDate) }]
        : [],
  );
  const elevation = (w.metadata as Record<string, unknown> | undefined)?.HKElevationAscended;
  return {
    uuid: w.uuid,
    start: time(w.startDate),
    end,
    duration_s: w.duration.quantity,
    distance_m: w.totalDistance ? w.totalDistance.quantity : null,
    elevation_gain_m:
      elevation && typeof elevation === 'object' && 'quantity' in elevation
        ? Number((elevation as { quantity: number }).quantity)
        : null,
    pauses: pausesFrom(events, end),
    proxy: w,
  };
}

export const healthSource: HealthSource<Workout> = {
  async runs(anchor, since) {
    const h = hk();
    if (!h) return { workouts: [], deleted: [], anchor: anchor ?? '' };
    const query = (a: string | undefined) =>
      h.queryWorkoutSamplesWithAnchor({
        limit: 0,
        anchor: a,
        filter: {
          workoutActivityType: h.WorkoutActivityType.running,
          date: { startDate: since },
        },
      });
    let r;
    try {
      r = await query(anchor ?? undefined);
    } catch {
      // An anchor HealthKit can't read any more: start over (imports are idempotent).
      r = await query(undefined);
    }
    return {
      workouts: r.workouts.map(toWorkout),
      deleted: r.deletedSamples.map((d) => d.uuid),
      anchor: r.newAnchor,
    };
  },

  async distance(w) {
    const samples = await hk()!.queryQuantitySamples(DISTANCE, {
      limit: 0,
      ascending: true,
      unit: 'm',
      filter: { workout: w.proxy },
    });
    return samples.map((s) => ({
      start: time(s.startDate),
      end: time(s.endDate),
      meters: s.quantity,
    }));
  },

  async heartRate(w) {
    const samples = await hk()!.queryQuantitySamples(HEART_RATE, {
      limit: 0,
      ascending: true,
      unit: 'count/min',
      filter: { date: { startDate: new Date(w.start), endDate: new Date(w.end) } },
    });
    return samples.map((s) => ({ t: time(s.startDate), bpm: s.quantity }));
  },

  async weights(since) {
    const h = hk();
    if (!h) return [];
    const samples = await h.queryQuantitySamples(BODY_MASS, {
      limit: 0,
      ascending: true,
      unit: 'kg',
      filter: { date: { startDate: since } },
    });
    return samples.map((s) => ({ t: time(s.startDate), kg: s.quantity }));
  },

  release(w) {
    try {
      w.proxy.dispose();
    } catch {
      // Already released.
    }
  },
};

/**
 * Development only: writes a run (with distance and heart-rate samples every 10 s) and a weight
 * to Health, so the import can be tried in the simulator. `pace` is s/km.
 */
export async function addSampleRun(opts: {
  start: Date;
  meters: number;
  pace: number;
  kg?: number;
}): Promise<void> {
  const h = hk();
  if (!__DEV__ || !h) return;
  const seconds = Math.round((opts.meters / 1000) * opts.pace);
  const step = 10;
  const quantities: HK.QuantitySampleForSaving[] = [];
  for (let t = 0; t < seconds; t += step) {
    const len = Math.min(step, seconds - t);
    const a = new Date(opts.start.getTime() + t * 1000);
    const b = new Date(a.getTime() + len * 1000);
    // A little drift so splits differ: slower first mile, faster finish.
    const drift = 1 + 0.04 * Math.cos((Math.PI * t) / seconds);
    quantities.push({
      quantityType: DISTANCE,
      unit: 'm',
      quantity: ((1000 / opts.pace) * len) / drift,
      startDate: a,
      endDate: b,
    });
    quantities.push({
      quantityType: HEART_RATE,
      unit: 'count/min',
      quantity: Math.round(135 + (20 * t) / seconds),
      startDate: a,
      endDate: a,
    });
  }
  const meters = quantities
    .filter((q) => q.quantityType === DISTANCE)
    .reduce((m, q) => m + q.quantity, 0);
  await h.saveWorkoutSample(
    h.WorkoutActivityType.running,
    quantities,
    opts.start,
    new Date(opts.start.getTime() + seconds * 1000),
    { distance: meters },
  );
  if (opts.kg) await h.saveQuantitySample(BODY_MASS, 'kg', opts.kg, opts.start, opts.start);
}
