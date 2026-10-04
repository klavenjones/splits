/** Pure helpers for deciding what's worth reporting. */

const OFFLINE =
  /network request failed|failed to fetch|fetch failed|network ?error|network connection was lost|internet connection appears to be offline|the request timed out|timeout|aborted|abort ?error|load failed/i;

/** HealthKit Code 6: Health data is encrypted while the phone is locked. */
const PROTECTED_DATA =
  /protected health data is inaccessible|com\.apple\.healthkit.{0,20}code=6\b/i;

const text = (e: unknown): string => {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  if (e && typeof e === 'object') {
    const o = e as { message?: unknown; name?: unknown };
    return `${String(o.name ?? '')}: ${String(o.message ?? '')}`;
  }
  return String(e);
};

/** Offline and timeouts are expected (the work is retried), so they aren't reported. */
export function isOfflineError(e: unknown): boolean {
  return OFFLINE.test(text(e));
}

/**
 * Reading Health while the phone is locked (a background launch) fails by design. The import
 * is retried when the app next opens, so it isn't reported.
 */
export function isProtectedDataError(e: unknown): boolean {
  return PROTECTED_DATA.test(text(e));
}

/** A short, stable identity for de-duplicating reports: the Postgres/PostgREST code or the name. */
export function errorCode(e: unknown): string {
  if (e && typeof e === 'object') {
    const o = e as { code?: unknown; name?: unknown };
    if (typeof o.code === 'string' && o.code) return o.code;
    if (typeof o.name === 'string' && o.name) return o.name;
  }
  return 'Error';
}

/**
 * Turns anything thrown into an Error so Sentry gets a stack trace and a message. Supabase
 * returns plain objects ({ code, message, details, hint }); details and hint are scrubbed later.
 */
export function asError(e: unknown): Error {
  if (e instanceof Error) return e;
  const o = (e && typeof e === 'object' ? e : {}) as { message?: unknown; code?: unknown };
  const err = new Error(typeof o.message === 'string' ? o.message : String(e)) as Error & {
    code?: string;
    cause?: unknown;
  };
  const code = typeof o.code === 'string' && o.code ? o.code : undefined;
  err.name = code ? `PostgrestError ${code}` : 'NonError';
  // Keep the original (details and hint are dropped by scrub.ts before anything is sent).
  err.cause = e;
  if (code) err.code = code;
  return err;
}

const STEP = Symbol.for('splits.errorStep');

/** Runs `fn`; a failure is tagged with `step`, so reports say which call failed. */
export async function withStep<T>(step: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e && typeof e === 'object' && !(STEP in e)) {
      try {
        (e as Record<symbol, string>)[STEP] = step;
      } catch {
        // Frozen: reported without a step.
      }
    }
    throw e;
  }
}

/** The step set by `withStep` (the first one that saw the error), or `fallback`. */
export function errorStep(e: unknown, fallback = 'import'): string {
  const s = e && typeof e === 'object' ? (e as Record<symbol, unknown>)[STEP] : undefined;
  return typeof s === 'string' ? s : fallback;
}

/**
 * Reports each (key, code) once until it succeeds, so backoff retries don't flood Sentry.
 * `clear(key)` after a success; a different code for the same key reports again.
 */
export function reportOnce() {
  const seen = new Map<string, string>();
  return {
    should(key: string, code: string): boolean {
      if (seen.get(key) === code) return false;
      seen.set(key, code);
      return true;
    },
    clear(key: string) {
      seen.delete(key);
    },
    clearAll() {
      seen.clear();
    },
  };
}
