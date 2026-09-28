import { memoryDb } from '@/local/testDb';
import { migrate } from '@/local/sql';
import { syncPending, toPayload, backoffMs, type SyncApi } from '@/local/sync';
import {
  loadActive,
  loadBests,
  loadPending,
  loadPrevious,
  loadWorkout,
  markDiscarded,
  recordFinished,
  replacePrevious,
  saveWorkout,
  setTemplateUpdate,
} from '@/local/workoutRepo';

import {
  addExercises,
  addSet,
  completeSet,
  currentSet,
  finish,
  previousFor,
  removeSet,
  restAfter,
  startEmpty,
  startFromTemplate,
  swapExercise,
  templateChanges,
  uncompleteSet,
  updateSet,
  type Previous,
  type TemplateExercise,
  type Workout,
} from './model';
import { suggestForWorkout, swapCandidates, yourEquipment } from './suggest';
import { updatedTemplateRows } from './templateUpdate';

let n = 0;
const uuid = () => `id${++n}`;
const NOW = '2026-10-05T17:00:00Z';

const ex = (id: string, primary_muscle: string, equipment: string) => ({
  id,
  name: id.replace(/-/g, ' '),
  primary_muscle,
  equipment,
});
const bench = ex('bench-press', 'chest', 'barbell');
const pullup = ex('pull-up', 'lats', 'bodyweight');
const incline = ex('incline-db-press', 'upper chest', 'dumbbell');
const lateral = ex('lateral-raise', 'side delts', 'dumbbell');
const dbBench = ex('db-bench', 'chest', 'dumbbell');
const pushup = ex('push-up', 'chest', 'bodyweight');
const curl = ex('hammer-curl', 'biceps', 'dumbbell');
const facepull = ex('face-pull', 'rear delts', 'cable');
const library = [bench, pullup, incline, lateral, dbBench, pushup, curl, facepull];

const row = (
  e: typeof bench,
  target_sets: number,
  rep_min: number,
  rep_max: number,
  rest_sec: number,
  superset_group: number | null = null,
): TemplateExercise => ({
  ...e,
  exercise_id: e.id,
  superset_group,
  target_sets,
  rep_min,
  rep_max,
  rest_sec,
  notes: null,
});

// Upper A: bench 4 × 6–8, pull-up + incline superset, lateral raise.
const upperA = [
  row(bench, 4, 6, 8, 150),
  row(pullup, 3, 6, 10, 0, 1),
  row(incline, 3, 8, 10, 120, 1),
  row(lateral, 3, 12, 15, 60),
];

const previous: Previous = new Map([
  [
    bench.id,
    [
      { set_type: 'warmup', weight_kg: 43, reps: 10 },
      { set_type: 'working', weight_kg: 84, reps: 8 },
      { set_type: 'working', weight_kg: 84, reps: 8 },
      { set_type: 'working', weight_kg: 84, reps: 7 },
    ],
  ],
]);

const start = () =>
  startFromTemplate(
    {
      id: 'w1',
      user_id: 'u1',
      template_id: 't1',
      name: 'upper A',
      scheduled_date: '2026-10-05',
      now: NOW,
    },
    upperA,
    previous,
    uuid,
  );

describe('workout model', () => {
  it('copies the template and pre-fills from last time', () => {
    const w = start();
    expect(w.status).toBe('in_progress');
    expect(w.exercises.map((e) => e.sets.length)).toEqual([4, 3, 3, 3]);
    // Working sets line up with last time's working sets; the 4th repeats the last one.
    expect(w.exercises[0].sets.map((s) => [s.weight_kg, s.reps])).toEqual([
      [84, 8],
      [84, 8],
      [84, 7],
      [84, 7],
    ]);
    // No history: reps start at the top of the range, weight empty.
    expect(w.exercises[3].sets[0]).toMatchObject({ weight_kg: null, reps: 15 });
    const set = w.exercises[0].sets[0];
    expect(previousFor(previous, bench.id, w.exercises[0].sets, set)).toEqual(
      previous.get(bench.id)![1],
    );
  });

  it('rests after sets, but only after the round in a superset', () => {
    let w = start();
    const [b, p, i] = w.exercises;
    expect(restAfter(w, b.id)).toBe(150);
    expect(restAfter(w, p.id)).toBe(0);
    expect(restAfter(w, i.id)).toBe(120);
    const r = completeSet(w, b.id, b.sets[0].id, NOW);
    expect(r.rest).toBe(150);
    w = r.workout;
    expect(w.exercises[0].sets[0].completed_at).toBe(NOW);
    // A set with no reps can't be completed.
    const blank = updateSet(w, b.id, b.sets[1].id, { reps: null });
    expect(completeSet(blank, b.id, b.sets[1].id, NOW).workout).toBe(blank);
    expect(uncompleteSet(w, b.id, b.sets[0].id).exercises[0].sets[0].completed_at).toBeNull();
  });

  it('alternates superset members for the current set', () => {
    let w = start();
    const [b, p, i] = w.exercises;
    for (const s of b.sets) w = completeSet(w, b.id, s.id, NOW).workout;
    expect(currentSet(w)).toEqual({ exId: p.id, setId: p.sets[0].id });
    w = completeSet(w, p.id, p.sets[0].id, NOW).workout;
    expect(currentSet(w)).toEqual({ exId: i.id, setId: i.sets[0].id });
    w = completeSet(w, i.id, i.sets[0].id, NOW).workout;
    expect(currentSet(w)).toEqual({ exId: p.id, setId: p.sets[1].id });
  });

  it('adds and removes sets, renumbering', () => {
    let w = start();
    const b = w.exercises[0];
    w = addSet(w, b.id, uuid);
    expect(w.exercises[0].sets.map((s) => s.set_number)).toEqual([1, 2, 3, 4, 5]);
    expect(w.exercises[0].sets[4]).toMatchObject({ weight_kg: 84, reps: 7, completed_at: null });
    w = removeSet(w, b.id, b.sets[1].id);
    expect(w.exercises[0].sets.map((s) => s.set_number)).toEqual([1, 2, 3, 4]);
  });

  it('adds exercises and swaps in place or after done sets', () => {
    let w = addExercises(start(), [curl], previous, uuid);
    expect(w.exercises[4]).toMatchObject({ exercise_id: curl.id, from_template: false });
    expect(w.exercises[4].sets).toHaveLength(3);

    // Nothing done yet: replaced in place.
    const lat = w.exercises[3];
    w = swapExercise(w, lat.id, facepull, previous, uuid);
    expect(w.exercises[3]).toMatchObject({
      id: lat.id,
      exercise_id: facepull.id,
      swapped_from_exercise_id: lateral.id,
    });

    // Two bench sets done: they stay; the other two move to the new exercise after it.
    const b = w.exercises[0];
    w = completeSet(w, b.id, b.sets[0].id, NOW).workout;
    w = completeSet(w, b.id, b.sets[1].id, NOW).workout;
    w = swapExercise(w, b.id, dbBench, previous, uuid);
    expect(w.exercises.slice(0, 2).map((e) => [e.exercise_id, e.sets.length])).toEqual([
      [bench.id, 2],
      [dbBench.id, 2],
    ]);
    expect(w.exercises[1].swapped_from_exercise_id).toBe(bench.id);

    expect(templateChanges(w, (id) => library.find((e) => e.id === id)?.name)).toEqual({
      added: ['hammer curl'],
      swapped: [
        { from: 'bench press', to: 'db bench' },
        { from: 'lateral raise', to: 'face pull' },
      ],
    });
  });

  it('finishes by dropping what was not done', () => {
    let w = start();
    const b = w.exercises[0];
    w = completeSet(w, b.id, b.sets[0].id, NOW).workout;
    w = completeSet(w, b.id, b.sets[2].id, NOW).workout;
    const f = finish(w, '2026-10-05T18:00:00Z');
    expect(f.status).toBe('completed');
    expect(f.exercises).toHaveLength(1);
    expect(f.exercises[0].sets.map((s) => s.set_number)).toEqual([1, 2]);
  });

  it('rebuilds the template with swaps in place and additions at the end', () => {
    let w = addExercises(start(), [curl], previous, uuid);
    w = swapExercise(w, w.exercises[3].id, facepull, previous, uuid);
    const c = w.exercises[4];
    w = updateSet(w, c.id, c.sets[0].id, { weight_kg: 14, reps: 12 });
    w = completeSet(w, c.id, c.sets[0].id, NOW).workout;
    w = updateSet(w, c.id, c.sets[1].id, { weight_kg: 14, reps: 10 });
    w = completeSet(w, c.id, c.sets[1].id, NOW).workout;
    const rows = updatedTemplateRows(
      upperA.map((r, position) => ({ ...r, position })),
      w,
    );
    expect(rows.map((r) => r.exercise_id)).toEqual([
      bench.id,
      pullup.id,
      incline.id,
      facepull.id,
      curl.id,
    ]);
    expect(rows[3]).toMatchObject({ target_sets: 3, rep_min: 12, rep_max: 15, rest_sec: 60 });
    expect(rows[4]).toMatchObject({ target_sets: 2, rep_min: 10, rep_max: 12, position: 4 });
  });
});

describe('suggestions', () => {
  it('suggests muscles not trained today, known exercises first', () => {
    const s = suggestForWorkout(library, {
      trainedMuscles: new Set(['chest', 'lats', 'upper chest', 'side delts']),
      exclude: new Set(),
      history: new Map([[facepull.id, '2026-09-30']]),
      limit: 2,
    });
    expect(s.exercises.map((e) => e.id)).toEqual([facepull.id, curl.id]);
    expect(s.muscles).toEqual(['rear delts', 'biceps']);
  });

  it('swaps within the muscle, filtered by your equipment', () => {
    const mine = yourEquipment(library, [bench.id, incline.id, lateral.id]);
    expect([...mine].sort()).toEqual(['barbell', 'dumbbell']);
    const opts = { exclude: new Set<string>(), history: new Map<string, string>() };
    expect(swapCandidates(bench, library, { ...opts, equipment: mine }).map((e) => e.id)).toEqual([
      dbBench.id,
      incline.id,
    ]);
    expect(swapCandidates(bench, library, { ...opts, equipment: null }).map((e) => e.id)).toEqual([
      dbBench.id,
      pushup.id,
      incline.id,
    ]);
  });
});

describe('local store and sync', () => {
  const setup = () => {
    const db = memoryDb();
    migrate(db);
    migrate(db); // idempotent
    return db;
  };
  const api = (overrides: Partial<SyncApi> = {}) => {
    const calls: string[] = [];
    const sent: ReturnType<typeof toPayload>[] = [];
    const a: SyncApi = {
      sync: async (p) => {
        calls.push(`sync:${p.session.id}:${p.session.status}`);
        sent.push(p);
        return '2026-10-05T18:00:01Z';
      },
      discard: async (id, back) => void calls.push(`discard:${id}:${back}`),
      updateTemplate: async (w) => void calls.push(`template:${w.id}`),
      ...overrides,
    };
    return { a, calls, sent };
  };

  it('round-trips a workout through SQLite and survives a "restart"', () => {
    const db = setup();
    let w: Workout = start();
    w = {
      ...completeSet(w, w.exercises[0].id, w.exercises[0].sets[0].id, NOW).workout,
      rest: { ends_at: 123, total_s: 150 },
    };
    expect(saveWorkout(db, w)).toBe(1);
    expect(saveWorkout(db, w)).toBe(2);
    const back = loadActive(db, 'u1')!;
    const { rev, synced_rev, discarded, synced_at, ...rest } = back;
    expect(rest).toEqual(w);
    expect([rev, synced_rev, discarded, synced_at]).toEqual([2, 0, false, null]);
  });

  it('syncs whole workouts, keeps edits made during a sync, and cleans up when done', async () => {
    const db = setup();
    let w = start();
    saveWorkout(db, w);
    // An edit lands while the first sync is in flight.
    const { a, calls, sent } = api({
      sync: async (p) => {
        calls.push(`sync:${p.session.status}`);
        sent.push(p);
        if (calls.length === 1) {
          w = completeSet(w, w.exercises[0].id, w.exercises[0].sets[0].id, NOW).workout;
          saveWorkout(db, w);
        }
        return 'now';
      },
    });
    await syncPending(db, 'u1', a);
    expect(loadWorkout(db, 'w1')).toMatchObject({ rev: 2, synced_rev: 1 });
    expect(loadPending(db, 'u1')).toHaveLength(1);
    await syncPending(db, 'u1', a);
    expect(sent[1].sets.find((s) => s.completed_at)).toBeTruthy();
    expect(loadPending(db, 'u1')).toHaveLength(0);

    // Finish with a template update: synced, template saved, then gone from SQLite.
    w = { ...finish(w, NOW), update_template: 'pending' };
    saveWorkout(db, w);
    const second = api();
    const r = await syncPending(db, 'u1', second.a);
    expect(second.calls).toEqual(['sync:w1:completed', 'template:w1']);
    expect(r.removed).toEqual(['w1']);
    expect(loadWorkout(db, 'w1')).toBeNull();
    // Payloads carry no local-only fields.
    expect(Object.keys(second.sent[0].exercises[0]).sort()).toEqual([
      'exercise_id',
      'id',
      'notes',
      'position',
      'rest_sec',
      'superset_group',
      'swapped_from_exercise_id',
    ]);
  });

  it('keeps everything when offline and retries later', async () => {
    const db = setup();
    saveWorkout(db, finish(start(), NOW));
    const offline = api({ sync: async () => Promise.reject(new Error('Network request failed')) });
    const r = await syncPending(db, 'u1', offline.a);
    expect(r.failed).toHaveLength(1);
    expect(loadWorkout(db, 'w1')).toMatchObject({ status: 'completed', synced_rev: 0 });
    expect((await syncPending(db, 'u1', api().a)).removed).toEqual(['w1']);
    expect([1, 2, 3, 7, 20].map(backoffMs)).toEqual([5000, 10000, 20000, 300000, 300000]);
  });

  it('reports failures with replay context (ids and counts, no values)', async () => {
    const db = setup();
    const w = finish(start(), NOW);
    saveWorkout(db, { ...w, update_template: 'pending' });
    const pg = { code: '23514', message: 'violates check constraint', details: 'Failing row…' };
    const r = await syncPending(db, 'u1', api({ sync: async () => Promise.reject(pg) }).a);
    const sets = w.exercises.flatMap((e) => e.sets);
    expect(r.failed).toEqual([
      {
        id: 'w1',
        error: pg,
        context: {
          session_id: 'w1',
          step: 'sync',
          origin: 'planned',
          status: 'completed',
          rev: 1,
          synced_rev: 0,
          discarded: false,
          update_template: 'pending',
          pending_exercises: w.exercises.length,
          pending_sets: sets.length,
          completed_sets: sets.filter((s) => s.completed_at !== null).length,
        },
      },
    ]);
    expect(JSON.stringify(r.failed[0].context)).not.toMatch(/weight|reps/);

    const templ = api({ updateTemplate: async () => Promise.reject(new Error('boom')) });
    const r2 = await syncPending(db, 'u1', templ.a);
    expect(r2.synced).toEqual(['w1']);
    expect(r2.failed[0].context).toMatchObject({ step: 'update_template', synced_rev: 1 });
  });

  it('sends discards and skips a pending template update when told', async () => {
    const db = setup();
    const e = startEmpty({ id: 'w2', user_id: 'u1', scheduled_date: '2026-10-05', now: NOW });
    saveWorkout(db, e);
    markDiscarded(db, 'w2');
    saveWorkout(db, start());
    markDiscarded(db, 'w1');
    const { a, calls } = api();
    await syncPending(db, 'u1', a);
    expect(calls.sort()).toEqual(['discard:w1:true', 'discard:w2:false']);
    expect(loadActive(db, 'u1')).toBeNull();

    saveWorkout(db, { ...finish(start(), NOW), update_template: 'pending' });
    setTemplateUpdate(db, 'w1', 'skipped');
    expect((await syncPending(db, 'u1', api().a)).removed).toEqual(['w1']);
  });

  it('records a finished workout as last time and as a best', () => {
    const db = setup();
    replacePrevious(db, [
      {
        exercise_id: bench.id,
        set_type: 'working',
        weight_kg: 80,
        reps: 8,
        performed_on: '2026-09-28',
      },
    ]);
    let w = start();
    const b = w.exercises[0];
    w = completeSet(w, b.id, b.sets[0].id, NOW).workout;
    recordFinished(db, finish(w, NOW));
    const { previous: p, lastDone } = loadPrevious(db);
    expect(p.get(bench.id)).toEqual([{ set_type: 'working', weight_kg: 84, reps: 8 }]);
    expect(lastDone.get(bench.id)).toBe('2026-10-05');
    expect(loadBests(db).get(bench.id)).toMatchObject({ weight_kg: 84, reps: 8 });
  });
});
