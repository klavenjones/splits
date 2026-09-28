/**
 * "Update the template?" after a workout with swaps or added exercises: the template's rows with
 * swapped exercises replaced in place and added exercises appended. Pure.
 */
import { DEFAULT_TARGETS, type LiftRow } from '@/templates/liftTemplate';

import type { Workout } from './model';

export type TemplateRow = LiftRow & {
  name: string;
  primary_muscle: string | null;
  equipment: string | null;
};

export function updatedTemplateRows(
  template: readonly TemplateRow[],
  w: Pick<Workout, 'exercises'>,
): TemplateRow[] {
  // original template exercise id → the exercise that replaced it
  const swaps = new Map(
    w.exercises
      .filter((e) => e.from_template && e.swapped_from_exercise_id)
      .map((e) => [e.swapped_from_exercise_id!, e]),
  );
  const rows: TemplateRow[] = [...template]
    .sort((a, b) => a.position - b.position)
    .map((r) => {
      const to = swaps.get(r.exercise_id);
      return to
        ? {
            ...r,
            exercise_id: to.exercise_id,
            name: to.name,
            primary_muscle: to.primary_muscle,
            equipment: to.equipment,
          }
        : r;
    });

  for (const e of w.exercises.filter((x) => !x.from_template)) {
    const reps = e.sets
      .filter((s) => s.completed_at && s.set_type !== 'warmup' && s.reps)
      .map((s) => s.reps!);
    rows.push({
      exercise_id: e.exercise_id,
      name: e.name,
      primary_muscle: e.primary_muscle,
      equipment: e.equipment,
      position: rows.length,
      superset_group: null,
      target_sets: Math.max(1, reps.length),
      rep_min: reps.length ? Math.min(...reps) : DEFAULT_TARGETS.rep_min,
      rep_max: reps.length ? Math.max(...reps) : DEFAULT_TARGETS.rep_max,
      rest_sec: e.rest_sec ?? DEFAULT_TARGETS.rest_sec,
      notes: null,
    });
  }
  return rows.map((r, i) => ({ ...r, position: i }));
}
