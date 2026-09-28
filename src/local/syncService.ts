/**
 * When to sync: a few seconds after each edit, on finish, when the connection comes back, when
 * the app returns to the foreground, and at launch. Failed passes back off (5 s → 5 min). The
 * work itself is src/local/sync.ts.
 */
import type { QueryClient } from '@tanstack/react-query';
import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';
import { AppState } from 'react-native';

import { supabase } from '@/db/client';
import { isOnline } from '@/db/persist';
import { sessionsRoot } from '@/db/queries/sessions';
import { fetchTemplate, saveTemplate, templateKey, templatesKey } from '@/db/queries/templates';
import type { Json } from '@/db/types';
import { estimateDuration, toBlocks } from '@/templates/liftTemplate';
import { updatedTemplateRows } from '@/workout/templateUpdate';

import { localDb } from './db';
import { backoffMs, syncPending, type SyncApi } from './sync';
import { loadPending, replaceBests, replacePrevious, type StoredWorkout } from './workoutRepo';

type Listener = () => void;

let userId: string | null = null;
let queryClient: QueryClient | null = null;
let online = true;
let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let again = false;
let failures = 0;
const listeners = new Set<Listener>();

export const syncState = () => ({ online, running, failures });
export function onSyncChange(l: Listener) {
  listeners.add(l);
  return () => void listeners.delete(l);
}
const emit = () => listeners.forEach((l) => l());

async function updateTemplate(w: StoredWorkout) {
  if (!w.template_id) return;
  const t = await fetchTemplate(w.template_id);
  if (t.kind !== 'lift') return;
  const rows = updatedTemplateRows(t.exercises, w);
  const lift = toBlocks(rows);
  await saveTemplate({
    id: t.id,
    name: t.name,
    kind: 'lift',
    notes: t.notes,
    est_duration_s: estimateDuration(lift),
    est_distance_m: null,
    lift,
  });
  queryClient?.invalidateQueries({ queryKey: templatesKey(userId ?? undefined) });
  queryClient?.invalidateQueries({ queryKey: templateKey(t.id) });
}

const api: SyncApi = {
  async sync(payload) {
    const { data, error } = await supabase.rpc('sync_workout', { p: payload as unknown as Json });
    if (error) throw error;
    return data;
  },
  async discard(id, backToPlanned) {
    const { error } = await supabase.rpc('discard_workout', {
      p_id: id,
      p_back_to_planned: backToPlanned,
    });
    if (error) throw error;
  },
  updateTemplate,
};

/** Refreshes "last time" and bests from the server, unless local workouts are still unsent. */
async function refreshCaches() {
  if (!userId || loadPending(localDb(), userId).length) return;
  const [prev, bests] = await Promise.all([
    supabase.rpc('previous_sets', {}),
    supabase.rpc('exercise_bests'),
  ]);
  if (prev.error || bests.error || loadPending(localDb(), userId).length) return;
  replacePrevious(
    localDb(),
    prev.data.map((r) => ({
      exercise_id: r.exercise_id,
      set_type: r.set_type,
      weight_kg: r.weight_kg,
      reps: r.reps,
      performed_on: r.performed_on,
    })),
  );
  replaceBests(
    localDb(),
    bests.data.map((b) => ({
      exercise_id: b.exercise_id,
      e1rm_kg: b.e1rm_kg,
      weight_kg: b.weight_kg,
      reps: b.reps,
    })),
  );
  emit();
}

/** While offline, check again this often (network events can be missed, e.g. in the simulator). */
const OFFLINE_POLL_MS = 15_000;

async function run() {
  timer = null;
  if (!userId) return;
  // Ask the OS rather than trusting the last event.
  const wasOnline = online;
  online = await getNetworkStateAsync()
    .then(isOnline)
    .catch(() => online);
  if (online !== wasOnline) emit();
  if (!online) {
    requestSync(OFFLINE_POLL_MS);
    return;
  }
  if (running) {
    again = true;
    return;
  }
  running = true;
  emit();
  try {
    const r = await syncPending(localDb(), userId, api);
    failures = r.failed.length ? failures + 1 : 0;
    if (r.synced.length || r.removed.length) {
      queryClient?.invalidateQueries({ queryKey: sessionsRoot(userId) });
      queryClient?.invalidateQueries({ queryKey: ['session'] });
      queryClient?.invalidateQueries({ queryKey: ['progress'] });
    }
    if (!r.failed.length) await refreshCaches().catch(() => undefined);
  } catch {
    failures += 1;
  } finally {
    running = false;
    emit();
  }
  if (again) {
    again = false;
    requestSync(0);
  } else if (failures) requestSync(backoffMs(failures));
}

/** Schedules a sync in `delayMs`, restarting the countdown (so edits settle before sending). */
export function requestSync(delayMs = 3000) {
  if (!userId) return;
  if (timer) {
    clearTimeout(timer);
  }
  timer = setTimeout(run, delayMs);
}

/** Starts syncing for the signed-in user. Returns a stop function. */
export function startSyncService(uid: string, qc: QueryClient): () => void {
  userId = uid;
  queryClient = qc;
  getNetworkStateAsync().then((s) => {
    online = isOnline(s);
    emit();
    requestSync(0);
  });
  const net = addNetworkStateListener((s) => {
    const was = online;
    online = isOnline(s);
    emit();
    if (online && !was) {
      failures = 0;
      requestSync(0);
    }
  });
  const app = AppState.addEventListener('change', (s) => {
    if (s === 'active') requestSync(500);
  });
  return () => {
    net.remove();
    app.remove();
    if (timer) clearTimeout(timer);
    timer = null;
    userId = null;
  };
}
