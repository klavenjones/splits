/**
 * Progress reads: one round trip per view, aggregated on the server where it's per-set work.
 * Keys start with 'progress' so the persisted cache (src/db/persist.ts) keeps them and the
 * views draw immediately at launch.
 */
import { useQuery } from '@tanstack/react-query';

import { supabase } from '../client';

import { addDays, mondayOf } from '@/engine/calendar';
import type { Checkin, RunEntry, SessionBest } from '@/engine/progress';
import { isEasyRun } from '@/engine/runs';

import { SESSION_SELECT, type SessionRow } from './sessions';

const STALE = 5 * 60_000;

export const progressRoot = (userId: string | undefined) => ['progress', userId] as const;

/** Session bests for every exercise over the last 12 weeks (Strength). */
export function useStrengthProgress(userId: string | undefined, today: string) {
  const since = addDays(mondayOf(today), -11 * 7);
  return useQuery({
    queryKey: [...progressRoot(userId), 'strength', since],
    enabled: !!userId,
    staleTime: STALE,
    queryFn: async (): Promise<SessionBest[]> => {
      const { data, error } = await supabase.rpc('exercise_session_bests', { p_since: since });
      if (error) throw error;
      return data as SessionBest[];
    },
  });
}

export type ProgressRun = RunEntry & { started_at: string };

/** Completed runs since the earlier of 8 full weeks ago and the 1st of the month (Running). */
export function useRunningProgress(userId: string | undefined, today: string) {
  const eight = addDays(mondayOf(today), -8 * 7);
  const month = `${today.slice(0, 7)}-01`;
  const since = eight < month ? eight : month;
  return useQuery({
    queryKey: [...progressRoot(userId), 'running', since],
    enabled: !!userId,
    staleTime: STALE,
    queryFn: async (): Promise<ProgressRun[]> => {
      const { data, error } = await supabase
        .from('sessions')
        .select(SESSION_SELECT.replace('run_logs(', 'run_logs!inner('))
        .eq('kind', 'run')
        .eq('status', 'completed')
        .gte('scheduled_date', since)
        .order('scheduled_date', { ascending: false });
      if (error) throw error;
      return (data as unknown as SessionRow[]).map((s) => ({
        id: s.id,
        name: s.template_id ? s.name : 'run',
        date: s.scheduled_date,
        started_at: s.run_logs!.started_at,
        distance_m: s.run_logs!.distance_m,
        duration_s: s.run_logs!.duration_s,
        easy:
          !!s.templates &&
          isEasyRun({
            est_distance_m: s.templates.est_distance_m,
            est_duration_s: s.templates.est_duration_s,
            segments: s.templates.template_run_segments,
          }),
      }));
    },
  });
}

export type BodyProgress = {
  checkins: Checkin[];
  start: { weight_kg: number | null; body_fat_pct: number | null; date: string | null };
};

/** Every check-in (one a day) and the starting weight and body fat (Body). */
export function useBodyProgress(userId: string | undefined) {
  return useQuery({
    queryKey: [...progressRoot(userId), 'body'],
    enabled: !!userId,
    staleTime: STALE,
    queryFn: async (): Promise<BodyProgress> => {
      const [checkins, profile] = await Promise.all([
        supabase
          .from('body_checkins')
          .select('checkin_date, weight_kg, waist_cm, neck_cm, hip_cm, body_fat_pct')
          .order('checkin_date'),
        supabase
          .from('nutrition_profiles')
          .select('start_weight_kg, start_body_fat_pct, start_date')
          .maybeSingle(),
      ]);
      if (checkins.error) throw checkins.error;
      if (profile.error) throw profile.error;
      return {
        checkins: checkins.data as Checkin[],
        start: {
          weight_kg: profile.data?.start_weight_kg ?? null,
          body_fat_pct: profile.data?.start_body_fat_pct ?? null,
          date: profile.data?.start_date ?? null,
        },
      };
    },
  });
}

/** One exercise's session bests, all history (exercise Charts, PR chips in History). */
export function useExerciseBests(userId: string | undefined, exerciseId: string | undefined) {
  return useQuery({
    queryKey: [...progressRoot(userId), 'exercise', exerciseId],
    enabled: !!userId && !!exerciseId,
    staleTime: STALE,
    queryFn: async (): Promise<SessionBest[]> => {
      const { data, error } = await supabase.rpc('exercise_session_bests', {
        p_since: '1970-01-01',
        p_exercise_id: exerciseId!,
      });
      if (error) throw error;
      return data as SessionBest[];
    },
  });
}

export type HistorySet = {
  set_number: number;
  set_type: 'warmup' | 'working' | 'drop' | 'failure';
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
};

export type HistorySession = {
  session_id: string;
  performed_on: string;
  session_name: string;
  sets: HistorySet[];
};

/** The latest sessions of one exercise with their sets (exercise History). */
export function useExerciseHistory(userId: string | undefined, exerciseId: string | undefined) {
  return useQuery({
    queryKey: [...progressRoot(userId), 'history', exerciseId],
    enabled: !!userId && !!exerciseId,
    staleTime: STALE,
    queryFn: async (): Promise<HistorySession[]> => {
      const { data, error } = await supabase.rpc('exercise_history', {
        p_exercise_id: exerciseId!,
        p_limit: 30,
      });
      if (error) throw error;
      return data as unknown as HistorySession[];
    },
  });
}
