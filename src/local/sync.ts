/**
 * Sync: send each local workout that changed, as a whole, to sync_workout (idempotent, so a
 * retry or a duplicate send is harmless). Discards go to discard_workout. A finished workout that
 * is fully synced leaves SQLite. No timers here; src/local/syncService.ts decides when to run.
 */
import type { Workout } from '@/workout/model';

import type { SqlDb } from './sql';
import {
  deleteWorkout,
  loadPending,
  loadWorkout,
  markSynced,
  setTemplateUpdate,
  type StoredWorkout,
} from './workoutRepo';

export type SyncPayload = {
  session: {
    id: string;
    template_id: string | null;
    kind: 'lift';
    name: string;
    scheduled_date: string;
    status: Workout['status'];
    started_at: string;
    ended_at: string | null;
    feel: Workout['feel'];
    notes: string | null;
  };
  exercises: {
    id: string;
    exercise_id: string;
    position: number;
    superset_group: number | null;
    rest_sec: number | null;
    notes: string | null;
    swapped_from_exercise_id: string | null;
  }[];
  sets: {
    id: string;
    session_exercise_id: string;
    set_number: number;
    set_type: string;
    weight_kg: number | null;
    reps: number | null;
    rpe: number | null;
    completed_at: string | null;
  }[];
};

/** The server's view of a workout: local-only display fields are left out. */
export function toPayload(w: Workout): SyncPayload {
  return {
    session: {
      id: w.id,
      template_id: w.template_id,
      kind: w.kind,
      name: w.name,
      scheduled_date: w.scheduled_date,
      status: w.status,
      started_at: w.started_at,
      ended_at: w.ended_at,
      feel: w.feel,
      notes: w.notes,
    },
    exercises: w.exercises.map((e, position) => ({
      id: e.id,
      exercise_id: e.exercise_id,
      position,
      superset_group: e.superset_group,
      rest_sec: e.rest_sec,
      notes: e.notes,
      swapped_from_exercise_id: e.swapped_from_exercise_id,
    })),
    sets: w.exercises.flatMap((e) =>
      e.sets.map((s) => ({
        id: s.id,
        session_exercise_id: e.id,
        set_number: s.set_number,
        set_type: s.set_type,
        weight_kg: s.weight_kg,
        reps: s.reps,
        rpe: s.rpe,
        completed_at: s.completed_at,
      })),
    ),
  };
}

export type SyncApi = {
  /** Returns the server time of the sync. */
  sync(payload: SyncPayload): Promise<string>;
  discard(id: string, backToPlanned: boolean): Promise<void>;
  updateTemplate(w: StoredWorkout): Promise<void>;
};

export type SyncResult = {
  synced: string[];
  removed: string[];
  failed: { id: string; error: unknown }[];
};

/** One pass over everything pending, oldest first. Failures are reported, not thrown. */
export async function syncPending(db: SqlDb, userId: string, api: SyncApi): Promise<SyncResult> {
  const result: SyncResult = { synced: [], removed: [], failed: [] };
  for (const w of loadPending(db, userId)) {
    try {
      if (w.discarded) {
        await api.discard(w.id, w.origin === 'planned');
        deleteWorkout(db, w.id);
        result.removed.push(w.id);
        continue;
      }
      if (w.rev > w.synced_rev) {
        const rev = w.rev; // edits made while this is in flight bump rev and sync next time
        const at = await api.sync(toPayload(w));
        markSynced(db, w.id, rev, at);
        result.synced.push(w.id);
      }
      if (w.status === 'completed' && w.update_template === 'pending') {
        await api.updateTemplate(w);
        setTemplateUpdate(db, w.id, 'done');
      }
      const now = loadWorkout(db, w.id);
      if (
        now &&
        now.status === 'completed' &&
        now.synced_rev >= now.rev &&
        now.update_template !== 'pending'
      ) {
        deleteWorkout(db, w.id);
        result.removed.push(w.id);
      }
    } catch (error) {
      result.failed.push({ id: w.id, error });
    }
  }
  return result;
}

/** Retry delay after `failures` consecutive failed passes: 5 s doubling up to 5 min. */
export const backoffMs = (failures: number) =>
  Math.min(5_000 * 2 ** Math.max(0, failures - 1), 300_000);
