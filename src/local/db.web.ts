import type { SqlDb } from './sql';

/** The live workout is native only (it needs on-device SQLite). */
export function localDb(): SqlDb {
  throw new Error('Workout logging runs on iPhone, not the web preview.');
}
