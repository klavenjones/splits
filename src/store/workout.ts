/**
 * The live workout. Every action writes SQLite first (synchronously), then updates this store,
 * then asks for a sync, so a set is never lost to a crash, a kill or a dead zone. The store is
 * rebuilt from SQLite at launch (`load`).
 */
import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';

import type { TemplateDetail } from '@/db/queries/templates';
import { findPRs, volume, type Best, type PR } from '@/engine/metrics';
import { cancelRestEnd, scheduleRestEnd } from '@/lib/restNotifications';
import { trace } from '@/lib/sentry';
import { localDb } from '@/local/db';
import { requestSync } from '@/local/syncService';
import {
  clearAll,
  loadActive,
  loadBests,
  loadLocalSummaries,
  loadPrevious,
  loadWorkout,
  markDiscarded,
  recordFinished,
  saveWorkout,
  type LocalSummary,
} from '@/local/workoutRepo';
import { formatWeight } from '@/units';
import type { UnitSystem } from '@/units';
import * as M from '@/workout/model';

export type Summary = {
  workout: M.Workout;
  prs: PR[];
  volume_kg: number;
  sets: number;
  changes: M.TemplateChanges;
};

type State = {
  userId: string | null;
  units: UnitSystem;
  active: M.Workout | null;
  summary: Summary | null;
  previous: M.Previous;
  lastDone: ReadonlyMap<string, string>;
  bests: ReadonlyMap<string, Best>;
  /** Workouts on this phone, for the Today / Plan overlay. */
  local: LocalSummary[];
};

type Actions = {
  load(userId: string, units: UnitSystem): void;
  reloadCaches(): void;
  refreshLocal(): void;
  startPlanned(
    s: { id: string; name: string; scheduled_date: string; template_id: string },
    template: TemplateDetail,
  ): string;
  startEmpty(scheduledDate: string): string;
  updateSet(
    exId: string,
    setId: string,
    patch: Partial<Pick<M.WSet, 'weight_kg' | 'reps' | 'rpe' | 'set_type'>>,
  ): void;
  toggleSet(exId: string, setId: string): void;
  addSet(exId: string): void;
  removeSet(exId: string, setId: string): void;
  addExercises(items: M.ExerciseInfo[]): void;
  swap(exId: string, to: M.ExerciseInfo, alsoTemplate: boolean): void;
  adjustRest(deltaS: number): void;
  skipRest(): void;
  finish(nameOf: (exerciseId: string) => string | undefined): string | null;
  saveSummary(p: { feel: M.Workout['feel']; notes: string; updateTemplate: boolean }): void;
  discard(): void;
  /** Wipes every workout on this phone and empties the store (a training reset). */
  reset(): void;
};

const now = () => new Date().toISOString();

export class ActiveWorkoutError extends Error {}

export const useWorkout = create<State & Actions>()((set, get) => {
  /** Persist, publish, and schedule a sync. */
  const commit = (w: M.Workout, syncDelay = 3000) => {
    saveWorkout(localDb(), w);
    set({ active: w.status === 'in_progress' ? w : null });
    get().refreshLocal();
    requestSync(syncDelay);
  };

  const edit = (fn: (w: M.Workout) => M.Workout) => {
    const w = get().active;
    if (w) commit(fn(w));
  };

  const restNote = (w: M.Workout) => {
    const cur = M.currentSet(w);
    if (!cur) return 'last set done: finish when you’re ready';
    const e = w.exercises.find((x) => x.id === cur.exId)!;
    const s = e.sets.find((x) => x.id === cur.setId)!;
    const weight = s.weight_kg != null ? `${formatWeight(s.weight_kg, get().units)} × ` : '';
    return `next: ${e.name} · set ${s.set_number} · ${weight}${s.reps ?? ''}`;
  };

  const startRest = (w: M.Workout, seconds: number): M.Workout => {
    if (seconds <= 0) {
      void cancelRestEnd();
      return { ...w, rest: null };
    }
    const rest = { ends_at: Date.now() + seconds * 1000, total_s: seconds };
    void scheduleRestEnd(rest.ends_at, restNote(w));
    return { ...w, rest };
  };

  return {
    userId: null,
    units: 'imperial',
    active: null,
    summary: null,
    previous: new Map(),
    lastDone: new Map(),
    bests: new Map(),
    local: [],

    refreshLocal() {
      const { userId } = get();
      if (userId) set({ local: loadLocalSummaries(localDb(), userId) });
    },

    load(userId, units) {
      const db = localDb();
      const active = loadActive(db, userId);
      set({ userId, units, active });
      get().reloadCaches();
      get().refreshLocal();
    },

    reloadCaches() {
      const db = localDb();
      const { previous, lastDone } = loadPrevious(db);
      set({ previous, lastDone, bests: loadBests(db) });
    },

    startPlanned(s, template) {
      const { userId, active, previous } = get();
      if (!userId) throw new Error('Not signed in.');
      if (active && active.id !== s.id) throw new ActiveWorkoutError(active.name);
      if (active) return active.id;
      const existing = loadWorkout(localDb(), s.id);
      if (existing?.status === 'completed') return existing.id;
      const w = M.startFromTemplate(
        { ...s, user_id: userId, now: now() },
        template.exercises
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((r) => ({
            ...r,
            id: r.exercise_id,
            target_sets: r.target_sets,
          })),
        previous,
        randomUUID,
      );
      commit(w, 0);
      return w.id;
    },

    startEmpty(scheduledDate) {
      const { userId, active } = get();
      if (!userId) throw new Error('Not signed in.');
      if (active) throw new ActiveWorkoutError(active.name);
      const w = M.startEmpty({
        id: randomUUID(),
        user_id: userId,
        scheduled_date: scheduledDate,
        now: now(),
      });
      commit(w, 0);
      return w.id;
    },

    updateSet: (exId, setId, patch) => edit((w) => M.updateSet(w, exId, setId, patch)),

    toggleSet(exId, setId) {
      const w = get().active;
      const s = w?.exercises.find((e) => e.id === exId)?.sets.find((x) => x.id === setId);
      if (!w || !s) return;
      if (s.completed_at) return commit(M.uncompleteSet(w, exId, setId));
      // Traced: the SQLite write and store update behind the check must stay instant.
      trace('logger.set', { set_number: s.set_number }, () => {
        const r = M.completeSet(w, exId, setId, now());
        if (r.workout !== w) commit(startRest(r.workout, r.rest));
      });
    },

    addSet: (exId) => edit((w) => M.addSet(w, exId, randomUUID)),
    removeSet: (exId, setId) => edit((w) => M.removeSet(w, exId, setId)),
    addExercises: (items) => edit((w) => M.addExercises(w, items, get().previous, randomUUID)),
    swap: (exId, to, alsoTemplate) =>
      edit((w) => ({
        ...M.swapExercise(w, exId, to, get().previous, randomUUID),
        update_template: alsoTemplate ? 'pending' : w.update_template,
      })),

    adjustRest(deltaS) {
      const w = get().active;
      if (!w?.rest) return;
      const ends_at = Math.max(Date.now(), w.rest.ends_at + deltaS * 1000);
      const total_s = Math.max(1, w.rest.total_s + deltaS);
      void scheduleRestEnd(ends_at, restNote(w));
      commit({ ...w, rest: { ends_at, total_s } });
    },

    skipRest() {
      const w = get().active;
      if (!w?.rest) return;
      void cancelRestEnd();
      commit({ ...w, rest: null });
    },

    finish(nameOf) {
      const { active, bests } = get();
      if (!active) return null;
      void cancelRestEnd();
      const w = M.finish(active, now());
      const changes = M.templateChanges(w, nameOf);
      const sets = w.exercises.flatMap((e) => e.sets);
      const summary: Summary = {
        workout: w,
        prs: findPRs(w.exercises, bests),
        volume_kg: volume(sets),
        sets: sets.filter((s) => s.set_type !== 'warmup').length,
        changes,
      };
      // A swap with "also update the template" already asked; otherwise the summary asks.
      commit(w, 0);
      recordFinished(localDb(), w);
      get().reloadCaches();
      set({ summary });
      return w.id;
    },

    saveSummary({ feel, notes, updateTemplate }) {
      const s = get().summary;
      if (!s) return;
      const w: M.Workout = {
        ...s.workout,
        feel,
        notes: notes.trim() || null,
        update_template:
          s.workout.update_template === 'pending' || updateTemplate ? 'pending' : 'skipped',
      };
      saveWorkout(localDb(), w);
      set({ summary: { ...s, workout: w } });
      requestSync(0);
    },

    discard() {
      const w = get().active;
      if (!w) return;
      void cancelRestEnd();
      markDiscarded(localDb(), w.id);
      set({ active: null });
      get().refreshLocal();
      requestSync(0);
    },

    reset() {
      void cancelRestEnd();
      clearAll(localDb());
      set({
        active: null,
        summary: null,
        previous: new Map(),
        lastDone: new Map(),
        bests: new Map(),
        local: [],
      });
    },
  };
});
