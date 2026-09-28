import { useSyncExternalStore } from 'react';

export type Status = { failed: boolean; code: string | null; at: number | null };

const OK: Status = { failed: false, code: null, at: null };

/**
 * The last outcome of a background job (Apple Health import, weekly check-in), so a screen can
 * say it failed and offer a retry. `fail` records a code (no values); `ok` clears it.
 */
export function createStatus() {
  let state = OK;
  const listeners = new Set<() => void>();
  const set = (s: Status) => {
    state = s;
    listeners.forEach((l) => l());
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => void listeners.delete(l);
  };
  return {
    get: () => state,
    fail: (code: string, at: number) => set({ failed: true, code, at }),
    ok: () => {
      if (state.failed) set(OK);
    },
    subscribe,
    use: () => useSyncExternalStore(subscribe, () => state),
  };
}
