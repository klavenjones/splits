/** Search and filters for the exercise library and picker. Runs on the device over the cached list. Pure. */
import { muscleGroup, type Equipment, type MuscleGroup } from './vocab';

/** The fields filtering and sectioning need; database rows satisfy it. */
export type ExerciseLike = {
  id: string;
  name: string;
  owner_id: string | null;
  primary_muscle: string | null;
  secondary_muscles: string[];
  equipment: string | null;
};

export type ExerciseFilter = {
  query?: string;
  /** Match any of these groups (by primary muscle). Empty = all. */
  groups?: readonly MuscleGroup[];
  /** Match any of these. Empty = all. */
  equipment?: readonly Equipment[];
};

/** Gym shorthand typed into search. */
const ALIASES: Record<string, string> = {
  db: 'dumbbell',
  dbs: 'dumbbell',
  bb: 'barbell',
  kb: 'kettlebell',
  ez: 'ez bar',
  rdl: 'romanian deadlift',
  ohp: 'overhead press',
  bw: 'bodyweight',
};

/** Lowercase, no accents, punctuation → spaces, single spaces. */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Query → words, with shorthand expanded ("press db" → ["press", "dumbbell"]). */
export function queryTerms(query: string): string[] {
  return normalize(query)
    .split(' ')
    .filter(Boolean)
    .flatMap((t) => (ALIASES[t] ? ALIASES[t].split(' ') : [t]));
}

function haystack(e: ExerciseLike): { spaced: string; compact: string } {
  const spaced = normalize([e.name, e.equipment ?? '', e.primary_muscle ?? ''].join(' '));
  return { spaced, compact: spaced.replace(/ /g, '') };
}

/** Every word must appear somewhere, in any order ("pullup" also finds "pull-up"). */
export function matchesQuery(e: ExerciseLike, terms: readonly string[]): boolean {
  if (terms.length === 0) return true;
  const h = haystack(e);
  return terms.every((t) => h.spaced.includes(t) || h.compact.includes(t));
}

export function filterExercises<T extends ExerciseLike>(
  list: readonly T[],
  f: ExerciseFilter,
): T[] {
  const terms = queryTerms(f.query ?? '');
  const groups = f.groups ?? [];
  const equipment = f.equipment ?? [];
  return list.filter(
    (e) =>
      (groups.length === 0 || groups.includes(muscleGroup(e.primary_muscle) as MuscleGroup)) &&
      (equipment.length === 0 || equipment.includes(e.equipment as Equipment)) &&
      matchesQuery(e, terms),
  );
}
