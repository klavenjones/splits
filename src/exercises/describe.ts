/** Display strings for exercises. Pure. */
import type { ExerciseLike } from './filter';

/** Row subtitle: "rear delts · cable · rear delt / upper back". */
export function rowSubtitle(
  e: Pick<ExerciseLike, 'primary_muscle' | 'equipment'> & { movement_pattern?: string | null },
): string {
  return [e.primary_muscle, e.equipment, e.movement_pattern].filter(Boolean).join(' · ');
}

/** Detail subtitle: "barbell · chest, triceps · horizontal press". */
export function detailSubtitle(
  e: Pick<ExerciseLike, 'primary_muscle' | 'secondary_muscles' | 'equipment'> & {
    movement_pattern?: string | null;
  },
): string {
  const muscles = [e.primary_muscle, ...e.secondary_muscles].filter(Boolean).join(', ');
  return [e.equipment, muscles, e.movement_pattern].filter(Boolean).join(' · ');
}

/** The instructions jsonb, with anything missing or malformed read as empty. */
export type Instructions = { steps: string[]; cues: string[]; mistakes: string[] };

export function readInstructions(json: unknown): Instructions {
  const o = (json && typeof json === 'object' ? json : {}) as Record<string, unknown>;
  const list = (v: unknown) =>
    Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s.trim() !== '') : [];
  return { steps: list(o.steps), cues: list(o.cues), mistakes: list(o.mistakes) };
}

/** Credit for third-party media (exercises.media_credit), or null when missing or malformed. */
export type MediaCredit = {
  author: string;
  authorUrl: string | null;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
};

const httpsUrl = (v: unknown): string | null =>
  typeof v === 'string' && /^https?:\/\//.test(v) ? v : null;

export function readCredit(json: unknown): MediaCredit | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  const o = json as Record<string, unknown>;
  const author = typeof o.author === 'string' ? o.author.trim() : '';
  const license = typeof o.license === 'string' ? o.license.trim() : '';
  const licenseUrl = httpsUrl(o.license_url);
  const sourceUrl = httpsUrl(o.source_url);
  if (!author || !license || !licenseUrl || !sourceUrl) return null;
  return { author, authorUrl: httpsUrl(o.author_url), license, licenseUrl, sourceUrl };
}
