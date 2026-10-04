import type { QueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';

import { supabase } from '@/db/client';
import { clearPersistedQueryCache } from '@/db/persist';
import { resetRunCutoff } from '@/health/importer';
import { pauseSync } from '@/local/syncService';
import { useWorkout } from '@/store/workout';

import { resetTraining } from './resetTraining';

/** Resets the signed-in user's training data on the server and on this phone. */
export function runResetTraining(userId: string, qc: QueryClient) {
  return resetTraining({
    pauseSync,
    async resetServer() {
      const { data, error } = await supabase.rpc('reset_training');
      if (error) throw error;
      return data;
    },
    // The live workout and its SQLite store are native only.
    wipeLocal: () => {
      if (Platform.OS !== 'web') useWorkout.getState().reset();
    },
    cutoffHealth: () => {
      const kv = (globalThis as { localStorage?: Storage }).localStorage;
      if (kv) resetRunCutoff(userId, kv, Date.now());
    },
    clearCache: () => {
      qc.clear();
      clearPersistedQueryCache();
    },
  });
}
