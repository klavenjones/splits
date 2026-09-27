/** Groups a list into the library's sections: your custom exercises first, then A–Z, then #. Pure. */
import type { ExerciseLike } from './filter';

export const CUSTOM_SECTION = 'custom';
export const ALPHABET = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#'] as const;
export type SectionKey = typeof CUSTOM_SECTION | (typeof ALPHABET)[number];

export type ExerciseSection<T> = { key: SectionKey; title: string; data: T[] };

const byName = (a: ExerciseLike, b: ExerciseLike) =>
  a.name.localeCompare(b.name, 'en', { sensitivity: 'base', numeric: true });

/** The index letter for a name: its first letter (accents dropped), or # for digits and symbols. */
export function sectionLetter(name: string): (typeof ALPHABET)[number] {
  const first = name.trim().normalize('NFD').charAt(0).toUpperCase();
  return first >= 'A' && first <= 'Z' ? (first as (typeof ALPHABET)[number]) : '#';
}

/**
 * `userId` decides what counts as custom. Each exercise appears once: customs sit in their own
 * section, and `letters` (the scrubber's active letters) covers only the A–Z sections.
 */
export function toSections<T extends ExerciseLike>(
  list: readonly T[],
  userId: string | null,
): { sections: ExerciseSection<T>[]; letters: Set<(typeof ALPHABET)[number]> } {
  const sorted = [...list].sort(byName);
  const custom = sorted.filter((e) => userId !== null && e.owner_id === userId);
  const rest = sorted.filter((e) => !(userId !== null && e.owner_id === userId));

  const byLetter = new Map<(typeof ALPHABET)[number], T[]>();
  for (const e of rest) {
    const l = sectionLetter(e.name);
    const bucket = byLetter.get(l);
    if (bucket) bucket.push(e);
    else byLetter.set(l, [e]);
  }

  const sections: ExerciseSection<T>[] = [];
  if (custom.length)
    sections.push({ key: CUSTOM_SECTION, title: 'your custom exercises', data: custom });
  for (const l of ALPHABET) {
    const data = byLetter.get(l);
    if (data) sections.push({ key: l, title: l, data });
  }
  return { sections, letters: new Set(byLetter.keys()) };
}
