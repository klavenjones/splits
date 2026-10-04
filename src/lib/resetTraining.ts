/**
 * Reset training data ("start from scratch"). The order is the safety: sync is paused so a
 * workout waiting on this phone can't re-create sessions, the server goes first so a failed call
 * (offline) loses nothing here, and only then is this phone cleared. Each step is safe to repeat,
 * so after a partial failure the user just tries again.
 */
export type ResetDeps = {
  /** Holds syncing and returns the function that resumes it. */
  pauseSync(): Promise<() => void>;
  /** Deletes the signed-in user's sessions on the server; returns how many. */
  resetServer(): Promise<number>;
  /** Clears the on-device workouts, caches and the live workout. */
  wipeLocal(): void;
  /** Stops older Apple Health runs from importing again. */
  cutoffHealth(): void;
  /** Drops cached server data, in memory and saved. */
  clearCache(): void;
};

/** The server is cleared but this phone didn't finish; trying again completes it. */
export class ResetIncompleteError extends Error {
  constructor(cause: unknown) {
    super('Reset on the server, but this phone couldn’t finish. Try again.', { cause });
  }
}

export const RESET_PHRASE = 'RESET';

/** The typed confirmation: exactly RESET (surrounding spaces from autocomplete are fine). */
export const confirmsReset = (text: string) => text.trim() === RESET_PHRASE;

export async function resetTraining(deps: ResetDeps): Promise<{ deleted: number }> {
  const resume = await deps.pauseSync();
  try {
    const deleted = await deps.resetServer();
    try {
      deps.wipeLocal();
      deps.cutoffHealth();
      deps.clearCache();
    } catch (e) {
      throw new ResetIncompleteError(e);
    }
    return { deleted };
  } finally {
    resume();
  }
}
