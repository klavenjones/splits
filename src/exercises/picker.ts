/**
 * Opens the exercise picker sheet and resolves with the chosen ids (null if dismissed).
 * One request at a time: opening a new one cancels the previous.
 *
 *   const ids = await pickExercises({ title: 'add exercises' });
 */
import { router } from 'expo-router';

export type PickOptions = {
  title?: string;
  /** Already in the workout or template; shown checked and locked. */
  excludeIds?: string[];
  /** Pick exactly one (swap). Default is multi-select. */
  single?: boolean;
  /** "suggested for this workout": shown first, with a one-line reason. */
  suggested?: { note: string; ids: string[] };
  /** exercise id → "40 lb × 15", shown as each row's "last" line. */
  last?: Record<string, string>;
};

type Pending = { options: PickOptions; resolve: (ids: string[] | null) => void };
let pending: Pending | null = null;

/** Registers a request without navigating. Exported for tests and for pickExercises. */
export function openPickRequest(options: PickOptions = {}): Promise<string[] | null> {
  pending?.resolve(null);
  return new Promise((resolve) => {
    pending = { options, resolve };
  });
}

export function pickExercises(options: PickOptions = {}): Promise<string[] | null> {
  const result = openPickRequest(options);
  router.push('/sheets/pick-exercises');
  return result;
}

/** What the sheet renders for. Null when opened directly (e.g. a reload). */
export function currentPickOptions(): PickOptions | null {
  return pending?.options ?? null;
}

/** Called by the sheet: with ids on confirm, null on cancel or dismiss. Safe to call twice. */
export function settlePick(ids: string[] | null) {
  const p = pending;
  pending = null;
  p?.resolve(ids);
}
