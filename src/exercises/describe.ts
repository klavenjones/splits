/** Display strings for exercises. Pure. */
import type { ExerciseLike } from './filter';

/** Row subtitle: "rear delts · cable". */
export function rowSubtitle(e: Pick<ExerciseLike, 'primary_muscle' | 'equipment'>): string {
  return [e.primary_muscle, e.equipment].filter(Boolean).join(' · ');
}

/** Detail subtitle: "barbell · chest, triceps". */
export function detailSubtitle(
  e: Pick<ExerciseLike, 'primary_muscle' | 'secondary_muscles' | 'equipment'>,
): string {
  const muscles = [e.primary_muscle, ...e.secondary_muscles].filter(Boolean).join(', ');
  return [e.equipment, muscles].filter(Boolean).join(' · ');
}

/** The instructions jsonb, with anything missing or malformed read as empty. */
export type Instructions = { steps: string[]; cues: string[]; mistakes: string[] };

export function readInstructions(json: unknown): Instructions {
  const o = (json && typeof json === 'object' ? json : {}) as Record<string, unknown>;
  const list = (v: unknown) =>
    Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s.trim() !== '') : [];
  return { steps: list(o.steps), cues: list(o.cues), mistakes: list(o.mistakes) };
}
