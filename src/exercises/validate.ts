/** Create/edit form rules for custom exercises. Pure. */
import { normalize, type ExerciseLike } from './filter';
import { isEquipment, isMovementPattern, isMuscle, type TrackingType } from './vocab';

export const NAME_MAX = 60;
export const NOTES_MAX = 500;

export type ExerciseDraft = {
  name: string;
  primaryMuscle: string | null;
  secondaryMuscles: string[];
  equipment: string | null;
  movementPattern: string | null;
  trackingType: TrackingType;
  notes: string;
};

export type DraftErrors = Partial<
  Record<'name' | 'primaryMuscle' | 'equipment' | 'movementPattern' | 'notes', string>
>;

/**
 * The visible exercise with the same name, ignoring case, spacing and punctuation. The database
 * only forbids exact case-insensitive duplicates within one owner; this also catches
 * "Landmine-Press" vs "landmine press" and a custom that repeats a built-in.
 */
export function findSameName<T extends ExerciseLike>(
  list: readonly T[],
  name: string,
  exceptId?: string,
): T | null {
  const n = normalize(name);
  if (!n) return null;
  return list.find((e) => e.id !== exceptId && normalize(e.name) === n) ?? null;
}

export function validateDraft(
  d: ExerciseDraft,
  list: readonly ExerciseLike[],
  exceptId?: string,
): DraftErrors {
  const errors: DraftErrors = {};
  const name = d.name.trim();
  if (!name) errors.name = 'Give it a name.';
  else if (name.length > NAME_MAX) errors.name = `Keep it under ${NAME_MAX} characters.`;
  else if (findSameName(list, name, exceptId))
    errors.name = 'That’s already in your library. Open it instead, or pick another name.';
  if (!isMuscle(d.primaryMuscle)) errors.primaryMuscle = 'Pick the main muscle it works.';
  if (d.equipment !== null && !isEquipment(d.equipment)) errors.equipment = 'Pick equipment.';
  if (d.movementPattern !== null && !isMovementPattern(d.movementPattern))
    errors.movementPattern = 'Pick a movement.';
  if (d.notes.length > NOTES_MAX) errors.notes = `Keep notes under ${NOTES_MAX} characters.`;
  return errors;
}

/** Secondary muscles without the primary, duplicates or unknown values. */
export function cleanSecondary(primary: string | null, secondary: readonly string[]): string[] {
  return [...new Set(secondary)].filter((m) => isMuscle(m) && m !== primary);
}
