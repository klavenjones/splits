import { useSyncExternalStore } from 'react';

import type { SyncStatus } from '@/components';
import { localDb } from '@/local/db';
import { onSyncChange, pendingWorkouts, syncState } from '@/local/syncService';
import type { SyncOverview } from '@/local/syncSummary';
import { loadWorkout } from '@/local/workoutRepo';
import { useWorkout } from '@/store/workout';

let version = 0;
const subscribe = (cb: () => void) => {
  const bump = () => {
    version++;
    cb();
  };
  const a = onSyncChange(bump);
  const b = useWorkout.subscribe(bump);
  return () => {
    a();
    b();
  };
};

/**
 * Where a workout's data is: 'local' (only on this phone), 'saving' (sync in flight) or 'synced'.
 * A workout that's no longer in SQLite has been synced and cleaned up.
 */
export function useSyncStatus(id: string | undefined): { status: SyncStatus; online: boolean } {
  useSyncExternalStore(subscribe, () => version);
  const { online, running } = syncState();
  if (!id) return { status: 'synced', online };
  const w = loadWorkout(localDb(), id);
  if (!w || (w.synced_rev >= w.rev && w.update_template !== 'pending'))
    return { status: 'synced', online };
  return { status: running ? 'saving' : 'local', online };
}

/** Everything unsent on this phone, for Settings and diagnostics. */
export function useSyncOverview(): SyncOverview {
  useSyncExternalStore(subscribe, () => version);
  return { ...syncState(), pending: pendingWorkouts() };
}
