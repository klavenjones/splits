/** Pure helpers for deciding what's worth reporting. */

const OFFLINE =
  /network request failed|failed to fetch|network ?error|internet connection appears to be offline|the request timed out|timeout|aborted|abort ?error|load failed/i;

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
  const err = new Error(typeof o.message === 'string' ? o.message : String(e));
  err.name = typeof o.code === 'string' && o.code ? `PostgrestError ${o.code}` : 'NonError';
  return err;
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
  };
}
