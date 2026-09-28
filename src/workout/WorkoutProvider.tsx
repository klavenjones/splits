import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/auth';
import { useExercises } from '@/db/queries/exercises';
import { useSessions } from '@/db/queries/sessions';
import { fetchTemplate, templateKey } from '@/db/queries/templates';
import { mondayOf, toLocalDate } from '@/engine/calendar';
import { onSyncChange, startSyncService } from '@/local/syncService';
import { addDays } from '@/plan/week';
import { useWorkout } from '@/store/workout';

/** The logger reopens by itself once per launch when a workout was in progress. */
let reopened = false;

/**
 * Signed-in, native only: restores the live workout from SQLite, runs the sync service, and keeps
 * what an offline workout needs cached (the exercise library, this week's templates).
 */
export function WorkoutProvider() {
  const { userId, profile } = useAuth();
  const qc = useQueryClient();
  const units = profile?.unit_system ?? 'imperial';
  const native = Platform.OS !== 'web';

  useEffect(() => {
    if (!userId || !native) return;
    const store = useWorkout.getState();
    store.load(userId, units);
    const stop = startSyncService(userId, qc);
    const off = onSyncChange(() => {
      useWorkout.getState().reloadCaches();
      useWorkout.getState().refreshLocal();
    });
    const active = useWorkout.getState().active;
    if (active && !reopened) {
      reopened = true;
      setTimeout(() => router.push({ pathname: '/workout/[id]', params: { id: active.id } }), 0);
    }
    return () => {
      stop();
      off();
    };
    // Units change without reloading the workout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, qc, native]);

  useEffect(() => {
    useWorkout.setState({ units });
  }, [units]);

  // Offline readiness: the library for add/swap, and this week's templates for Start.
  useExercises(native ? userId : undefined);
  const monday = mondayOf(toLocalDate(new Date()));
  const week = useSessions(native ? userId : undefined, monday, addDays(monday, 13));
  useEffect(() => {
    for (const s of week.data ?? [])
      if (s.status === 'planned' && s.kind === 'lift' && s.template_id) {
        const id = s.template_id;
        void qc.prefetchQuery({
          queryKey: templateKey(id),
          queryFn: () => fetchTemplate(id),
          staleTime: 5 * 60_000,
        });
      }
  }, [week.data, qc]);

  return null;
}
