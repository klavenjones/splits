/**
 * Whether this phone imports from Apple Health. HealthKit permission is per device, so the flag
 * lives on the phone (read synchronously, even on a background launch); `integrations` mirrors it
 * on the server with the last import time.
 */
import { useSyncExternalStore } from 'react';

import { supabase } from '@/db/client';
import { withStep } from '@/lib/errors';

import {
  disableBackground,
  enableBackground,
  healthSource,
  isAvailable,
  requestAccess,
} from './healthkit';
import { importRuns, resetImport, type ImportApi, type KeyValue } from './importer';

const kv = (): KeyValue | null => (globalThis as { localStorage?: Storage }).localStorage ?? null;
const key = (userId: string) => `splits.health.${userId}.connected`;
const dismissedKey = (userId: string) => `splits.health.${userId}.prompt-dismissed`;
const backgroundKey = (userId: string) => `splits.health.${userId}.background`;

/** Whether HealthKit accepted background delivery when connecting (null: not connected here). */
export function backgroundGranted(userId: string | undefined): boolean | null {
  if (!userId) return null;
  try {
    const v = kv()?.getItem(backgroundKey(userId));
    return v === null || v === undefined ? null : v === '1';
  } catch {
    return null;
  }
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

export function isConnected(userId: string | undefined): boolean {
  if (!userId) return false;
  try {
    return kv()?.getItem(key(userId)) === '1';
  } catch {
    return false;
  }
}

export function useHealthConnected(userId: string | undefined): boolean {
  return useSyncExternalStore(subscribe, () => isConnected(userId));
}

export function isPromptDismissed(userId: string | undefined): boolean {
  if (!userId) return true;
  try {
    return kv()?.getItem(dismissedKey(userId)) === '1';
  } catch {
    return true;
  }
}

export function usePromptDismissed(userId: string | undefined): boolean {
  return useSyncExternalStore(subscribe, () => isPromptDismissed(userId));
}

export function dismissPrompt(userId: string) {
  kv()?.setItem(dismissedKey(userId), '1');
  notify();
}

/** The server's record of this connection: status and the last import. */
export async function fetchIntegration(userId: string) {
  const { data, error } = await supabase
    .from('integrations')
    .select('status, last_synced_at')
    .eq('user_id', userId)
    .eq('provider', 'apple_health')
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function saveIntegration(
  userId: string,
  status: 'connected' | 'disconnected',
  synced?: boolean,
) {
  const { error } = await supabase.from('integrations').upsert(
    {
      user_id: userId,
      provider: 'apple_health',
      status,
      ...(synced ? { last_synced_at: new Date().toISOString() } : {}),
    },
    { onConflict: 'user_id,provider' },
  );
  if (error) throw error;
}

export function importApi(userId: string): ImportApi {
  return {
    importRun: (p) =>
      withStep('import_run', async () => {
        const { data, error } = await supabase.rpc('import_run', { p });
        if (error) throw error;
        return data as { session_id: string; match: string; created: boolean };
      }),
    removeRun: (externalId) =>
      withStep('remove_imported_run', async () => {
        const { data, error } = await supabase.rpc('remove_imported_run', {
          p_external_id: externalId,
        });
        if (error) throw error;
        return data;
      }),
    importWeights: (days) =>
      withStep('import_body_mass', async () => {
        const { data, error } = await supabase.rpc('import_body_mass', { p: days });
        if (error) throw error;
        return data;
      }),
    touch: () => withStep('save_integration', () => saveIntegration(userId, 'connected', true)),
  };
}

/**
 * Imports now (one at a time; see importRuns). Needs a live session for this user: a stale or
 * expired one fails as 42501 (no execute on the RPCs) or 23503 (no users row for the id).
 */
export async function importNow(userId: string, units: 'imperial' | 'metric') {
  const store = kv();
  if (!store || !isConnected(userId) || !isAvailable()) return null;
  const { data } = await supabase.auth.getSession();
  if (data.session?.user.id !== userId) return null;
  return importRuns({ userId, units, hk: healthSource, api: importApi(userId), kv: store });
}

/**
 * Asks for Health access (Apple's sheet), turns on background delivery and remembers the
 * connection. Returns whether background delivery was granted.
 */
export async function connectHealth(userId: string): Promise<{ background: boolean }> {
  if (!isAvailable()) throw new Error('Apple Health isn’t available on this device.');
  await requestAccess();
  kv()?.setItem(key(userId), '1');
  notify();
  const background = await enableBackground();
  kv()?.setItem(backgroundKey(userId), background ? '1' : '0');
  notify();
  await saveIntegration(userId, 'connected').catch(() => {});
  return { background };
}

export async function disconnectHealth(userId: string) {
  const store = kv();
  store?.removeItem(key(userId));
  store?.removeItem(backgroundKey(userId));
  if (store) resetImport(userId, store);
  notify();
  await disableBackground();
  await saveIntegration(userId, 'disconnected').catch(() => {});
}
