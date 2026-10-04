/** Web has no HealthKit: every call is a no-op (see healthkit.ts). */
import type { HealthSource, HealthWorkout } from './importer';

export const isAvailable = () => false;
export const isProtectedDataAvailable = () => true;
export const requestAccess = async () => false;
export const enableBackground = async () => false;
export const disableBackground = async () => {};
export const onHealthChanged = (_cb: () => void) => () => {};
export const healthSource: HealthSource<HealthWorkout> = {
  runs: async (anchor) => ({ workouts: [], deleted: [], anchor: anchor ?? '' }),
  distance: async () => [],
  heartRate: async () => [],
  weights: async () => [],
};
export const addSampleRun = async (_opts: {
  start: Date;
  meters: number;
  pace: number;
  kg?: number;
}) => {};
