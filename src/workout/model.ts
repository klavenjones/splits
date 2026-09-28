/**
 * The active workout, as the logger edits it. Pure: every edit returns a new Workout; the store
 * persists it to SQLite and syncs it. Times are ISO strings passed in; ids come from `uuid`.
 */
import { DEFAULT_TARGETS } from '@/templates/liftTemplate';

export type SetType = 'warmup' | 'working' | 'drop' | 'failure';

export type WSet = {
  id: string;
  set_number: number;
  set_type: SetType;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  completed_at: string | null;
};

export type WExercise = {
  id: string;
  exercise_id: string;
  superset_group: number | null;
  rest_sec: number | null;
  notes: string | null;
  swapped_from_exercise_id: string | null;
  /** Local-only snapshot for display and template updates. */
  name: string;
  primary_muscle: string | null;
  equipment: string | null;
  rep_min: number | null;
  rep_max: number | null;
  /** From the template (vs added during the workout). */
  from_template: boolean;
  sets: WSet[];
};

export type Rest = { ends_at: number; total_s: number };

export type Workout = {
  id: string;
  user_id: string;
  template_id: string | null;
  /** 'planned' sessions go back on the plan if discarded; 'empty' ones are deleted. */
  origin: 'planned' | 'empty';
  kind: 'lift';
  name: string;
  scheduled_date: string;
  status: 'in_progress' | 'completed';
  started_at: string;
  ended_at: string | null;
  feel: 'easy' | 'solid' | 'hard' | 'all_out' | null;
  notes: string | null;
  rest: Rest | null;
  update_template: null | 'pending' | 'done' | 'skipped';
  exercises: WExercise[];
};

export type ExerciseInfo = {
  id: string;
  name: string;
  primary_muscle: string | null;
  equipment: string | null;
};

/** Last time's completed sets per exercise, in set order. */
export type PreviousSet = { set_type: SetType; weight_kg: number | null; reps: number | null };
export type Previous = ReadonlyMap<string, readonly PreviousSet[]>;

export type TemplateExercise = ExerciseInfo & {
  exercise_id: string;
  superset_group: number | null;
  target_sets: number;
  rep_min: number | null;
  rep_max: number | null;
  rest_sec: number | null;
  notes: string | null;
};

type Uuid = () => string;

const isWarmup = (t: SetType) => t === 'warmup';

/** The previous set that lines up with `set`: same kind (warm-up or not), same index within it. */
export function previousFor(
  previous: Previous,
  exerciseId: string,
  sets: readonly WSet[],
  set: WSet,
): PreviousSet | null {
  const list = previous.get(exerciseId) ?? [];
  const warm = isWarmup(set.set_type);
  const same = list.filter((p) => isWarmup(p.set_type) === warm);
  const index = sets.filter((s) => isWarmup(s.set_type) === warm).findIndex((s) => s.id === set.id);
  return same[index] ?? null;
}

function prefilledSets(
  exerciseId: string,
  count: number,
  repMax: number | null,
  previous: Previous,
  uuid: Uuid,
): WSet[] {
  const working = (previous.get(exerciseId) ?? []).filter((p) => !isWarmup(p.set_type));
  return Array.from({ length: count }, (_, i) => {
    const p = working[i] ?? working[working.length - 1];
    return {
      id: uuid(),
      set_number: i + 1,
      set_type: 'working',
      weight_kg: p?.weight_kg ?? null,
      reps: p?.reps ?? repMax,
      rpe: null,
      completed_at: null,
    };
  });
}

/** Starts a planned session: the template's exercises are copied in (the snapshot rule). */
export function startFromTemplate(
  s: {
    id: string;
    user_id: string;
    template_id: string;
    name: string;
    scheduled_date: string;
    now: string;
  },
  template: readonly TemplateExercise[],
  previous: Previous,
  uuid: Uuid,
): Workout {
  return {
    id: s.id,
    user_id: s.user_id,
    template_id: s.template_id,
    origin: 'planned',
    kind: 'lift',
    name: s.name,
    scheduled_date: s.scheduled_date,
    status: 'in_progress',
    started_at: s.now,
    ended_at: null,
    feel: null,
    notes: null,
    rest: null,
    update_template: null,
    exercises: template.map((t) => ({
      id: uuid(),
      exercise_id: t.exercise_id,
      superset_group: t.superset_group,
      rest_sec: t.rest_sec,
      notes: t.notes,
      swapped_from_exercise_id: null,
      name: t.name,
      primary_muscle: t.primary_muscle,
      equipment: t.equipment,
      rep_min: t.rep_min,
      rep_max: t.rep_max,
      from_template: true,
      sets: prefilledSets(t.exercise_id, t.target_sets, t.rep_max, previous, uuid),
    })),
  };
}

/** An empty workout for today (no template). */
export function startEmpty(s: {
  id: string;
  user_id: string;
  scheduled_date: string;
  now: string;
}): Workout {
  return {
    id: s.id,
    user_id: s.user_id,
    template_id: null,
    origin: 'empty',
    kind: 'lift',
    name: 'workout',
    scheduled_date: s.scheduled_date,
    status: 'in_progress',
    started_at: s.now,
    ended_at: null,
    feel: null,
    notes: null,
    rest: null,
    update_template: null,
    exercises: [],
  };
}

const mapExercise = (w: Workout, exId: string, fn: (e: WExercise) => WExercise): Workout => ({
  ...w,
  exercises: w.exercises.map((e) => (e.id === exId ? fn(e) : e)),
});

const mapSet = (w: Workout, exId: string, setId: string, fn: (s: WSet) => WSet): Workout =>
  mapExercise(w, exId, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? fn(s) : s)) }));

const renumber = (sets: readonly WSet[]): WSet[] =>
  sets.map((s, i) => ({ ...s, set_number: i + 1 }));

export function updateSet(
  w: Workout,
  exId: string,
  setId: string,
  patch: Partial<Pick<WSet, 'weight_kg' | 'reps' | 'rpe' | 'set_type'>>,
): Workout {
  return mapSet(w, exId, setId, (s) => ({ ...s, ...patch }));
}

/**
 * The rest to start after completing a set of `ex`: its rest, except inside a superset, where
 * the rest comes after the round (so only the last member rests).
 */
export function restAfter(w: Workout, exId: string): number {
  const i = w.exercises.findIndex((e) => e.id === exId);
  const e = w.exercises[i];
  if (!e) return 0;
  const next = w.exercises[i + 1];
  if (e.superset_group != null && next?.superset_group === e.superset_group) return 0;
  return e.rest_sec ?? 0;
}

/** Marks a set done. A set needs reps; returns the workout unchanged otherwise. */
export function completeSet(
  w: Workout,
  exId: string,
  setId: string,
  now: string,
): { workout: Workout; rest: number } {
  const set = w.exercises.find((e) => e.id === exId)?.sets.find((s) => s.id === setId);
  if (!set || set.completed_at || !set.reps) return { workout: w, rest: 0 };
  const workout = mapSet(w, exId, setId, (s) => ({ ...s, completed_at: now }));
  return { workout, rest: set.set_type === 'warmup' ? 0 : restAfter(w, exId) };
}

export function uncompleteSet(w: Workout, exId: string, setId: string): Workout {
  return mapSet(w, exId, setId, (s) => ({ ...s, completed_at: null }));
}

/** Adds a set at the end, copying the last set's weight and reps. */
export function addSet(w: Workout, exId: string, uuid: Uuid): Workout {
  return mapExercise(w, exId, (e) => {
    const last = e.sets[e.sets.length - 1];
    return {
      ...e,
      sets: [
        ...e.sets,
        {
          id: uuid(),
          set_number: e.sets.length + 1,
          set_type: 'working',
          weight_kg: last?.weight_kg ?? null,
          reps: last?.reps ?? e.rep_max,
          rpe: null,
          completed_at: null,
        },
      ],
    };
  });
}

export function removeSet(w: Workout, exId: string, setId: string): Workout {
  return mapExercise(w, exId, (e) => ({
    ...e,
    sets: renumber(e.sets.filter((s) => s.id !== setId)),
  }));
}

/** Adds exercises at the end with 3 sets pre-filled from last time. */
export function addExercises(
  w: Workout,
  items: readonly ExerciseInfo[],
  previous: Previous,
  uuid: Uuid,
): Workout {
  const added = items.map((x): WExercise => ({
    id: uuid(),
    exercise_id: x.id,
    superset_group: null,
    rest_sec: DEFAULT_TARGETS.rest_sec,
    notes: null,
    swapped_from_exercise_id: null,
    name: x.name,
    primary_muscle: x.primary_muscle,
    equipment: x.equipment,
    rep_min: DEFAULT_TARGETS.rep_min,
    rep_max: DEFAULT_TARGETS.rep_max,
    from_template: false,
    sets: prefilledSets(
      x.id,
      Math.max(
        1,
        (previous.get(x.id) ?? []).filter((p) => !isWarmup(p.set_type)).length ||
          DEFAULT_TARGETS.target_sets,
      ),
      DEFAULT_TARGETS.rep_max,
      previous,
      uuid,
    ),
  }));
  return { ...w, exercises: [...w.exercises, ...added] };
}

/**
 * Swaps an exercise. With nothing done yet it's replaced in place. Once sets are done, those stay
 * with the original exercise and the remaining sets move to the new one, placed right after.
 */
export function swapExercise(
  w: Workout,
  exId: string,
  to: ExerciseInfo,
  previous: Previous,
  uuid: Uuid,
): Workout {
  const i = w.exercises.findIndex((e) => e.id === exId);
  const e = w.exercises[i];
  if (!e || e.exercise_id === to.id) return w;
  const done = e.sets.filter((s) => s.completed_at);
  const remaining = e.sets.filter((s) => !s.completed_at);
  const fresh = prefilledSets(to.id, Math.max(1, remaining.length), e.rep_max, previous, uuid);
  const swapped: WExercise = {
    ...e,
    id: done.length ? uuid() : e.id,
    exercise_id: to.id,
    name: to.name,
    primary_muscle: to.primary_muscle,
    equipment: to.equipment,
    swapped_from_exercise_id: e.swapped_from_exercise_id ?? e.exercise_id,
    sets: fresh,
  };
  const exercises = [...w.exercises];
  if (done.length) exercises.splice(i, 1, { ...e, sets: renumber(done) }, swapped);
  else exercises.splice(i, 1, swapped);
  return { ...w, exercises };
}

/** The set the lifter is on: supersets alternate members round by round. */
export function currentSet(w: Workout): { exId: string; setId: string } | null {
  const blocks: WExercise[][] = [];
  for (const e of w.exercises) {
    const last = blocks[blocks.length - 1];
    if (e.superset_group != null && last?.[0].superset_group === e.superset_group) last.push(e);
    else blocks.push([e]);
  }
  for (const block of blocks) {
    const open = block.filter((e) => e.sets.some((s) => !s.completed_at));
    if (!open.length) continue;
    const doneCount = (e: WExercise) => e.sets.filter((s) => s.completed_at).length;
    const round = Math.min(...open.map(doneCount));
    const e = open.find((x) => doneCount(x) === round)!;
    const s = e.sets.find((x) => !x.completed_at)!;
    return { exId: e.id, setId: s.id };
  }
  return null;
}

export const completedSetCount = (w: Workout) =>
  w.exercises.reduce((n, e) => n + e.sets.filter((s) => s.completed_at).length, 0);

/** Finishing drops sets that weren't done and exercises with nothing done. */
export function finish(w: Workout, now: string): Workout {
  const exercises = w.exercises
    .map((e) => ({ ...e, sets: renumber(e.sets.filter((s) => s.completed_at)) }))
    .filter((e) => e.sets.length > 0);
  return { ...w, status: 'completed', ended_at: now, rest: null, exercises };
}

export type TemplateChanges = {
  added: string[];
  swapped: { from: string; to: string }[];
};

/** What the template doesn't have: exercises added during the workout, and swaps. */
export function templateChanges(
  w: Workout,
  nameOf: (exerciseId: string) => string | undefined,
): TemplateChanges {
  return {
    added: w.exercises.filter((e) => !e.from_template).map((e) => e.name),
    swapped: w.exercises
      .filter((e) => e.from_template && e.swapped_from_exercise_id)
      .map((e) => ({ from: nameOf(e.swapped_from_exercise_id!) ?? 'exercise', to: e.name })),
  };
}
