/**
 * Offline support for server data: the TanStack Query cache is saved to on-device storage and
 * restored at launch, and queries pause (instead of failing) while there's no connection. So the
 * app opens offline with your profile, templates, exercises and week.
 */
import {
  dehydrate,
  hydrate,
  onlineManager,
  type DehydratedState,
  type QueryClient,
} from '@tanstack/react-query';
import { addNetworkStateListener, getNetworkStateAsync, type NetworkState } from 'expo-network';
import { Platform } from 'react-native';

const KEY = 'splits.query-cache.v1';
/** Query key roots worth keeping; everything else is refetched. */
const KEEP = new Set([
  'profile',
  'exercises',
  'exercise',
  'templates',
  'template',
  'sessions',
  'session',
  'targets',
]);
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

const storage = () => (globalThis as { localStorage?: Storage }).localStorage;

export function restoreQueryCache(qc: QueryClient) {
  try {
    const raw = storage()?.getItem(KEY);
    if (!raw) return;
    const { savedAt, state } = JSON.parse(raw) as { savedAt: number; state: DehydratedState };
    if (Date.now() - savedAt > MAX_AGE_MS) return;
    hydrate(qc, state);
  } catch {
    storage()?.removeItem(KEY);
  }
}

/** Saves the cache (throttled) whenever a kept query changes. Returns an unsubscribe. */
export function persistQueryCache(qc: QueryClient): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const save = () => {
    timer = null;
    try {
      const state = dehydrate(qc, {
        shouldDehydrateQuery: (q) =>
          q.state.status === 'success' && KEEP.has(String(q.queryKey[0])),
      });
      storage()?.setItem(KEY, JSON.stringify({ savedAt: Date.now(), state }));
    } catch {
      // Storage full or unavailable: the app still works online.
    }
  };
  const unsubscribe = qc.getQueryCache().subscribe((e) => {
    if (e.type === 'updated' || e.type === 'removed') timer ??= setTimeout(save, 1000);
  });
  return () => {
    unsubscribe();
    if (timer) clearTimeout(timer);
  };
}

export const isOnline = (s: NetworkState) => !!s.isConnected && s.isInternetReachable !== false;

/** Tells TanStack Query when the device goes on and offline (native; the web uses the browser). */
export function wireOnlineManager() {
  if (Platform.OS === 'web') return;
  onlineManager.setEventListener((setOnline) => {
    getNetworkStateAsync().then((s) => setOnline(isOnline(s)));
    const sub = addNetworkStateListener((s) => setOnline(isOnline(s)));
    return () => sub.remove();
  });
}
