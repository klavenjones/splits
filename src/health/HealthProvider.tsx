import { useQueryClient } from '@tanstack/react-query';
import { addNetworkStateListener } from 'expo-network';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { useAuth } from '@/auth';
import { sessionsRoot } from '@/db/queries/sessions';

import { importNow, useHealthConnected } from './connection';
import { onHealthChanged } from './healthkit';

/**
 * Signed in, native, connected: imports from Apple Health at launch (including a background
 * launch by HealthKit), when the app comes back to the foreground, when the connection returns,
 * and whenever Health reports a new workout or weight.
 */
export function HealthProvider() {
  const { userId, profile } = useAuth();
  const qc = useQueryClient();
  const units = profile?.unit_system ?? 'imperial';
  const connected = useHealthConnected(userId);

  useEffect(() => {
    if (!userId || !connected || Platform.OS !== 'ios') return;
    const run = () =>
      void importNow(userId, units)
        .then((r) => {
          if (!r) return;
          qc.invalidateQueries({ queryKey: ['integration', userId] });
          if (r.runs || r.removed) {
            qc.invalidateQueries({ queryKey: sessionsRoot(userId) });
            qc.invalidateQueries({ queryKey: ['session'] });
            qc.invalidateQueries({ queryKey: ['run'] });
          }
          if (r.runs || r.removed || r.weights) {
            qc.invalidateQueries({ queryKey: ['progress', userId] });
          }
        })
        .catch(() => {
          // Offline or signed out: the next trigger tries again from the same anchor.
        });
    // Subscribe first, so an event queued by a background launch is delivered.
    const offHealth = onHealthChanged(run);
    run();
    const app = AppState.addEventListener('change', (s) => s === 'active' && run());
    const net = addNetworkStateListener((s) => s.isConnected && run());
    return () => {
      offHealth();
      app.remove();
      net.remove();
    };
  }, [userId, connected, units, qc]);

  return null;
}
