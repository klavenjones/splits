/**
 * Workouts in local SQLite. Every edit rewrites the workout's rows in one transaction and bumps
 * `rev`; a sync records the rev it sent in `synced_rev`. A workout needs syncing while
 * `rev > synced_rev` (or it's discarded, or a template update is pending).
 */
import type { Best } from '@/engine/metrics';
import { bestSet, e1rm } from '@/engine/metrics';
import type { Previous, PreviousSet, SetType, WExercise, Workout } from '@/workout/model';

import type { SqlDb } from './sql';

export type StoredWorkout = Workout & {
  rev: number;
  synced_rev: number;
  discarded: boolean;
  synced_at: string | null;
};

type SessionRow = {
  id: string;
  user_id: string;
  template_id: string | null;
  origin: Workout['origin'];
  kind: 'lift';
  name: string;
  scheduled_date: string;
  status: Workout['status'];
  started_at: string;
  ended_at: string | null;
  feel: Workout['feel'];
  notes: string | null;
  rest_ends_at: number | null;
  rest_total_s: number | null;
  update_template: Workout['update_template'];
  discarded: number;
  rev: number;
  synced_rev: number;
  synced_at: string | null;
};

type ExerciseRow = Omit<WExercise, 'sets' | 'from_template'> & {
  session_id: string;
  position: number;
  from_template: number;
};

type SetRow = {
  id: string;
  session_id: string;
  session_exercise_id: string;
  set_number: number;
  set_type: SetType;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  completed_at: string | null;
};

/** Saves the whole workout and returns its new rev. */
export function saveWorkout(db: SqlDb, w: Workout): number {
  let rev = 0;
  db.transaction(() => {
    const prev = db.all<{ rev: number }>('select rev from l_sessions where id = ?', [w.id])[0];
    rev = (prev?.rev ?? 0) + 1;
    db.run(
      `insert into l_sessions (id, user_id, template_id, origin, kind, name, scheduled_date, status,
         started_at, ended_at, feel, notes, rest_ends_at, rest_total_s, update_template, rev)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       on conflict (id) do update set
         template_id = excluded.template_id, origin = excluded.origin, kind = excluded.kind,
         name = excluded.name, scheduled_date = excluded.scheduled_date, status = excluded.status,
         started_at = excluded.started_at, ended_at = excluded.ended_at, feel = excluded.feel,
         notes = excluded.notes, rest_ends_at = excluded.rest_ends_at,
         rest_total_s = excluded.rest_total_s, update_template = excluded.update_template,
         rev = excluded.rev`,
      [
        w.id,
        w.user_id,
        w.template_id,
        w.origin,
        w.kind,
        w.name,
        w.scheduled_date,
        w.status,
        w.started_at,
        w.ended_at,
        w.feel,
        w.notes,
        w.rest?.ends_at ?? null,
        w.rest?.total_s ?? null,
        w.update_template,
        rev,
      ],
    );
    db.run('delete from l_set_logs where session_id = ?', [w.id]);
    db.run('delete from l_session_exercises where session_id = ?', [w.id]);
    w.exercises.forEach((e, position) => {
      db.run(
        `insert into l_session_exercises (id, session_id, position, exercise_id, superset_group,
           rest_sec, notes, swapped_from_exercise_id, name, primary_muscle, equipment, rep_min,
           rep_max, from_template)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          e.id,
          w.id,
          position,
          e.exercise_id,
          e.superset_group,
          e.rest_sec,
          e.notes,
          e.swapped_from_exercise_id,
          e.name,
          e.primary_muscle,
          e.equipment,
          e.rep_min,
          e.rep_max,
          e.from_template ? 1 : 0,
        ],
      );
      for (const s of e.sets)
        db.run(
          `insert into l_set_logs (id, session_id, session_exercise_id, set_number, set_type,
             weight_kg, reps, rpe, completed_at)
           values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [s.id, w.id, e.id, s.set_number, s.set_type, s.weight_kg, s.reps, s.rpe, s.completed_at],
        );
    });
  });
  return rev;
}

function hydrate(db: SqlDb, row: SessionRow): StoredWorkout {
  const exercises = db.all<ExerciseRow>(
    'select * from l_session_exercises where session_id = ? order by position',
    [row.id],
  );
  const sets = db.all<SetRow>('select * from l_set_logs where session_id = ? order by set_number', [
    row.id,
  ]);
  return {
    id: row.id,
    user_id: row.user_id,
    template_id: row.template_id,
    origin: row.origin,
    kind: row.kind,
    name: row.name,
    scheduled_date: row.scheduled_date,
    status: row.status,
    started_at: row.started_at,
    ended_at: row.ended_at,
    feel: row.feel,
    notes: row.notes,
    rest:
      row.rest_ends_at != null
        ? { ends_at: row.rest_ends_at, total_s: row.rest_total_s ?? 0 }
        : null,
    update_template: row.update_template,
    rev: row.rev,
    synced_rev: row.synced_rev,
    discarded: !!row.discarded,
    synced_at: row.synced_at,
    exercises: exercises.map(({ session_id: _s, position: _p, from_template, ...e }) => ({
      ...e,
      from_template: !!from_template,
      sets: sets
        .filter((s) => s.session_exercise_id === e.id)
        .map(({ session_id: _x, session_exercise_id: _y, ...s }) => s),
    })),
  };
}

export function loadWorkout(db: SqlDb, id: string): StoredWorkout | null {
  const row = db.all<SessionRow>('select * from l_sessions where id = ?', [id])[0];
  return row ? hydrate(db, row) : null;
}

/** The user's in-progress workout, if any. */
export function loadActive(db: SqlDb, userId: string): StoredWorkout | null {
  const row = db.all<SessionRow>(
    `select * from l_sessions where user_id = ? and status = 'in_progress' and discarded = 0
     order by started_at desc limit 1`,
    [userId],
  )[0];
  return row ? hydrate(db, row) : null;
}

/** Workouts with something to send: edits, a discard, or a template update. */
export function loadPending(db: SqlDb, userId: string): StoredWorkout[] {
  return db
    .all<SessionRow>(
      `select * from l_sessions where user_id = ?
         and (rev > synced_rev or discarded = 1 or update_template = 'pending')
       order by started_at`,
      [userId],
    )
    .map((r) => hydrate(db, r));
}

export type LocalSummary = {
  id: string;
  name: string;
  template_id: string | null;
  origin: Workout['origin'];
  status: Workout['status'];
  scheduled_date: string;
  discarded: boolean;
};

/** Every workout still on this phone (for the Today and Plan overlay). */
export function loadLocalSummaries(db: SqlDb, userId: string): LocalSummary[] {
  return db
    .all<Omit<LocalSummary, 'discarded'> & { discarded: number }>(
      `select id, name, template_id, origin, status, scheduled_date, discarded
       from l_sessions where user_id = ?`,
      [userId],
    )
    .map((r) => ({ ...r, discarded: !!r.discarded }));
}

export function markSynced(db: SqlDb, id: string, rev: number, at: string) {
  db.run('update l_sessions set synced_rev = max(synced_rev, ?), synced_at = ? where id = ?', [
    rev,
    at,
    id,
  ]);
}

export function markDiscarded(db: SqlDb, id: string) {
  db.run('update l_sessions set discarded = 1, rev = rev + 1 where id = ?', [id]);
}

export function setTemplateUpdate(db: SqlDb, id: string, state: Workout['update_template']) {
  db.run('update l_sessions set update_template = ? where id = ?', [state, id]);
}

export function deleteWorkout(db: SqlDb, id: string) {
  db.transaction(() => {
    db.run('delete from l_set_logs where session_id = ?', [id]);
    db.run('delete from l_session_exercises where session_id = ?', [id]);
    db.run('delete from l_sessions where id = ?', [id]);
  });
}

/* ---------------- previous and bests (caches of derived server data) ---------------- */

export type PreviousRow = PreviousSet & { exercise_id: string; performed_on: string };

export function replacePrevious(db: SqlDb, rows: readonly PreviousRow[]) {
  db.transaction(() => {
    db.run('delete from l_previous');
    writePrevious(db, rows);
  });
}

function writePrevious(db: SqlDb, rows: readonly PreviousRow[]) {
  const idx = new Map<string, number>();
  for (const r of rows) {
    const i = idx.get(r.exercise_id) ?? 0;
    idx.set(r.exercise_id, i + 1);
    db.run(
      `insert into l_previous (exercise_id, idx, set_type, weight_kg, reps, performed_on)
       values (?, ?, ?, ?, ?, ?)`,
      [r.exercise_id, i, r.set_type, r.weight_kg, r.reps, r.performed_on],
    );
  }
}

export function loadPrevious(db: SqlDb): { previous: Previous; lastDone: Map<string, string> } {
  const rows = db.all<PreviousRow & { idx: number }>(
    'select * from l_previous order by exercise_id, idx',
  );
  const previous = new Map<string, PreviousSet[]>();
  const lastDone = new Map<string, string>();
  for (const r of rows) {
    const list = previous.get(r.exercise_id) ?? [];
    list.push({ set_type: r.set_type, weight_kg: r.weight_kg, reps: r.reps });
    previous.set(r.exercise_id, list);
    lastDone.set(r.exercise_id, r.performed_on);
  }
  return { previous, lastDone };
}

export function replaceBests(db: SqlDb, rows: readonly (Best & { exercise_id: string })[]) {
  db.transaction(() => {
    db.run('delete from l_bests');
    for (const b of rows)
      db.run('insert into l_bests (exercise_id, e1rm_kg, weight_kg, reps) values (?, ?, ?, ?)', [
        b.exercise_id,
        b.e1rm_kg,
        b.weight_kg,
        b.reps,
      ]);
  });
}

export function loadBests(db: SqlDb): Map<string, Best> {
  return new Map(
    db
      .all<Best & { exercise_id: string }>('select * from l_bests')
      .map(({ exercise_id, ...b }) => [exercise_id, b]),
  );
}

/**
 * A finished workout becomes "last time" for its exercises and can raise their bests, locally
 * and at once, so the next workout sees it even before the sync.
 */
export function recordFinished(db: SqlDb, w: Workout) {
  db.transaction(() => {
    const seen = new Set<string>();
    for (const e of w.exercises) {
      const done = e.sets.filter((s) => s.completed_at);
      if (!done.length) continue;
      if (!seen.has(e.exercise_id)) {
        db.run('delete from l_previous where exercise_id = ?', [e.exercise_id]);
        seen.add(e.exercise_id);
        writePrevious(
          db,
          done.map((s) => ({
            exercise_id: e.exercise_id,
            set_type: s.set_type,
            weight_kg: s.weight_kg,
            reps: s.reps,
            performed_on: w.scheduled_date,
          })),
        );
      }
      const b = bestSet(done);
      if (!b) continue;
      const score = e1rm(b.weight_kg ?? 0, b.reps ?? 0);
      const cur = db.all<{ e1rm_kg: number }>('select e1rm_kg from l_bests where exercise_id = ?', [
        e.exercise_id,
      ])[0];
      if (!cur || score > cur.e1rm_kg)
        db.run(
          `insert into l_bests (exercise_id, e1rm_kg, weight_kg, reps) values (?, ?, ?, ?)
           on conflict (exercise_id) do update set
             e1rm_kg = excluded.e1rm_kg, weight_kg = excluded.weight_kg, reps = excluded.reps`,
          [e.exercise_id, score, b.weight_kg ?? 0, b.reps ?? 0],
        );
    }
  });
}
