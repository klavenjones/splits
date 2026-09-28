/**
 * Training metrics derived from logged sets (docs/data-model.md: derived, not stored). Pure.
 * Weights are kilograms.
 */

export type LoggedSet = {
  set_type: 'warmup' | 'working' | 'drop' | 'failure';
  weight_kg: number | null;
  reps: number | null;
  completed_at: string | null;
};

/** Estimated one-rep max (Epley): weight × (1 + reps / 30). A single is the weight itself. */
export function e1rm(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30);
}

const counts = (s: LoggedSet) =>
  s.completed_at != null && s.set_type !== 'warmup' && (s.reps ?? 0) > 0;

/** Completed working sets (warm-ups excluded). */
export const workingSets = <T extends LoggedSet>(sets: readonly T[]): T[] => sets.filter(counts);

/** Σ weight × reps over completed working sets. */
export function volume(sets: readonly LoggedSet[]): number {
  return workingSets(sets).reduce((v, s) => v + (s.weight_kg ?? 0) * (s.reps ?? 0), 0);
}

/** The completed working set with the highest e1RM (ties: the heavier, then the first). */
export function bestSet<T extends LoggedSet>(sets: readonly T[]): T | null {
  let best: T | null = null;
  let bestScore = 0;
  for (const s of workingSets(sets)) {
    const score = e1rm(s.weight_kg ?? 0, s.reps ?? 0);
    if (
      score > bestScore ||
      (best && score === bestScore && (s.weight_kg ?? 0) > (best.weight_kg ?? 0))
    ) {
      best = s;
      bestScore = score;
    }
  }
  return best && bestScore > 0 ? best : null;
}

export type Best = { e1rm_kg: number; weight_kg: number; reps: number };

export type PR = {
  exercise_id: string;
  name: string;
  weight_kg: number;
  reps: number;
  e1rm_kg: number;
  was: { weight_kg: number; reps: number; e1rm_kg: number };
};

/**
 * A PR is a completed working set whose e1RM beats the exercise's previous best. The first time
 * an exercise is logged sets the baseline and isn't a PR. One PR per exercise (its best set).
 */
export function findPRs(
  exercises: readonly { exercise_id: string; name: string; sets: readonly LoggedSet[] }[],
  bests: ReadonlyMap<string, Best>,
): PR[] {
  const byExercise = new Map<string, { name: string; sets: LoggedSet[] }>();
  for (const e of exercises) {
    const entry = byExercise.get(e.exercise_id) ?? { name: e.name, sets: [] };
    entry.sets.push(...e.sets);
    byExercise.set(e.exercise_id, entry);
  }
  const prs: PR[] = [];
  for (const [exercise_id, { name, sets }] of byExercise) {
    const best = bestSet(sets);
    const was = bests.get(exercise_id);
    if (!best || !was) continue;
    const score = e1rm(best.weight_kg ?? 0, best.reps ?? 0);
    if (score > was.e1rm_kg + 1e-6)
      prs.push({
        exercise_id,
        name,
        weight_kg: best.weight_kg ?? 0,
        reps: best.reps ?? 0,
        e1rm_kg: score,
        was: { weight_kg: was.weight_kg, reps: was.reps, e1rm_kg: was.e1rm_kg },
      });
  }
  return prs;
}

/** Updates bests with a finished workout's sets (so the next workout sees them offline). */
export function mergeBests(
  bests: ReadonlyMap<string, Best>,
  exercises: readonly { exercise_id: string; sets: readonly LoggedSet[] }[],
): Map<string, Best> {
  const next = new Map(bests);
  for (const e of exercises) {
    const b = bestSet(e.sets);
    if (!b) continue;
    const score = e1rm(b.weight_kg ?? 0, b.reps ?? 0);
    if (score > (next.get(e.exercise_id)?.e1rm_kg ?? 0))
      next.set(e.exercise_id, { e1rm_kg: score, weight_kg: b.weight_kg ?? 0, reps: b.reps ?? 0 });
  }
  return next;
}
