/** What Settings shows about unsent workouts. Pure. */
export type SyncOverview = {
  pending: number;
  online: boolean;
  running: boolean;
  failures: number;
  lastError: string | null;
};

export type SyncSummary = {
  label: string;
  status: 'saving' | 'local';
  detail: string;
};

/** Null when everything has reached the server. */
export function syncSummary(o: SyncOverview): SyncSummary | null {
  if (o.pending === 0) return null;
  const label = `${o.pending} ${o.pending === 1 ? 'workout' : 'workouts'} to sync`;
  if (o.running) return { label, status: 'saving', detail: 'now' };
  const detail = !o.online
    ? 'offline'
    : o.failures > 0 && o.lastError && o.lastError !== 'offline'
      ? 'retrying · tap to try now'
      : 'tap to sync now';
  return { label, status: 'local', detail };
}
