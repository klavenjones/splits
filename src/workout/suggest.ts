/**
 * Picker and swap suggestions (docs/flows.md → hybrid coaching rules). Pure.
 * - Suggested for this workout: exercises for muscles not trained today.
 * - Swap: same movement slot first, then same primary muscle, then the same group, filtered by
 *   the user's equipment.
 */
import { muscleGroup } from '@/exercises/vocab';

export type LibraryExercise = {
  id: string;
  name: string;
  primary_muscle: string | null;
  equipment: string | null;
  movement_pattern?: string | null;
};

export type Suggestions<T> = { muscles: string[]; exercises: T[] };

/**
 * Up to `limit` exercises whose primary muscle has no completed set today. Exercises you've done
 * before come first (most recent first), then the rest of the library by name. `muscles` names
 * the untrained muscles the suggestions cover.
 */
export function suggestForWorkout<T extends LibraryExercise>(
  library: readonly T[],
  opts: {
    trainedMuscles: ReadonlySet<string>;
    exclude: ReadonlySet<string>;
    /** exercise id → last performed (YYYY-MM-DD). */
    history: ReadonlyMap<string, string>;
    limit?: number;
  },
): Suggestions<T> {
  const limit = opts.limit ?? 5;
  const fresh = library.filter(
    (e) =>
      e.primary_muscle &&
      !opts.trainedMuscles.has(e.primary_muscle) &&
      !opts.exclude.has(e.id) &&
      muscleGroup(e.primary_muscle) !== 'full body',
  );
  const known = fresh
    .filter((e) => opts.history.has(e.id))
    .sort(
      (a, b) =>
        opts.history.get(b.id)!.localeCompare(opts.history.get(a.id)!) ||
        a.name.localeCompare(b.name),
    );
  const rest = fresh.filter((e) => !opts.history.has(e.id));
  const exercises = [...known, ...rest].slice(0, limit);
  const muscles = [...new Set(exercises.map((e) => e.primary_muscle!))];
  return { muscles, exercises };
}

/** Equipment you use: from your templates and what you've logged. */
export function yourEquipment(
  library: readonly LibraryExercise[],
  usedIds: Iterable<string>,
): Set<string> {
  const byId = new Map(library.map((e) => [e.id, e]));
  const set = new Set<string>();
  for (const id of usedIds) {
    const eq = byId.get(id)?.equipment;
    if (eq) set.add(eq);
  }
  return set;
}

/**
 * Swap candidates for `target`: the same movement slot first (when it has one), then the same
 * primary muscle, then the same muscle group; within each, ones you've done before first, then by name. `equipment` (when given) filters the list.
 */
export function swapCandidates<T extends LibraryExercise>(
  target: LibraryExercise,
  library: readonly T[],
  opts: {
    equipment: ReadonlySet<string> | null;
    exclude: ReadonlySet<string>;
    history: ReadonlyMap<string, string>;
    limit?: number;
  },
): T[] {
  const group = muscleGroup(target.primary_muscle);
  const sameSlot = (e: T) =>
    !!target.movement_pattern && e.movement_pattern === target.movement_pattern;
  const rank = (e: T) =>
    sameSlot(e)
      ? 0
      : e.primary_muscle === target.primary_muscle
        ? 1
        : group && muscleGroup(e.primary_muscle) === group
          ? 2
          : 3;
  return library
    .filter(
      (e) =>
        e.id !== target.id &&
        !opts.exclude.has(e.id) &&
        rank(e) < 3 &&
        (!opts.equipment || (e.equipment != null && opts.equipment.has(e.equipment))),
    )
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        Number(opts.history.has(b.id)) - Number(opts.history.has(a.id)) ||
        a.name.localeCompare(b.name),
    )
    .slice(0, opts.limit ?? 12);
}
