import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../client';

import type { RunMatch } from '@/plan/week';

import { sessionsRoot, SESSION_SELECT, toSession, type SessionRow } from './sessions';

export type RunSplit = {
  split_index: number;
  distance_m: number;
  duration_s: number;
  avg_hr: number | null;
};

export type RunLog = {
  session_id: string;
  source: 'apple_health' | 'strava' | 'manual';
  started_at: string;
  distance_m: number;
  duration_s: number;
  avg_pace_s_per_km: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  elevation_gain_m: number | null;
  match: RunMatch;
  run_splits: RunSplit[];
};

export const runKey = (sessionId: string | undefined) => ['run', sessionId] as const;

/** A run session's imported log with its splits. */
export function useRun(sessionId: string | undefined) {
  return useQuery({
    queryKey: runKey(sessionId),
    enabled: !!sessionId,
    queryFn: async (): Promise<RunLog | null> => {
      const { data, error } = await supabase
        .from('run_logs')
        .select(
          `session_id, source, started_at, distance_m, duration_s, avg_pace_s_per_km, avg_hr,
           max_hr, elevation_gain_m, match,
           run_splits(split_index, distance_m, duration_s, avg_hr)`,
        )
        .eq('session_id', sessionId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const log = data as unknown as RunLog;
      return {
        ...log,
        run_splits: [...log.run_splits].sort((a, b) => a.split_index - b.split_index),
      };
    },
  });
}

/** Imported runs from `from` on that still need a match (Today's cards). */
export function useUnmatchedRuns(userId: string | undefined, from: string) {
  return useQuery({
    queryKey: [...sessionsRoot(userId), 'unmatched', from],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(SESSION_SELECT.replace('run_logs(', 'run_logs!inner('))
        .eq('kind', 'run')
        .eq('run_logs.match', 'needs_match')
        .gte('scheduled_date', from)
        .order('scheduled_date');
      if (error) throw error;
      return (data as unknown as SessionRow[]).map(toSession);
    },
  });
}

/**
 * Moves a run onto a planned run session, or keeps it as an extra run (target null). Resolves to
 * the session that holds the run afterwards.
 */
export function useLinkRun(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ run, target }: { run: string; target: string | null }) => {
      const { data, error } = await supabase.rpc('link_run', {
        p_run: run,
        p_target: target as string,
      });
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: sessionsRoot(userId) });
      qc.invalidateQueries({ queryKey: ['session'] });
      qc.invalidateQueries({ queryKey: ['run'] });
      qc.invalidateQueries({ queryKey: ['progress', userId] });
    },
  });
}

/** Where a linked run went (old session → new), so an open run detail can follow it. */
const moved = new Map<string, string>();
export function movedRun(from: string | undefined): string | undefined {
  const to = from ? moved.get(from) : undefined;
  if (from) moved.delete(from);
  return to;
}
export const noteMovedRun = (from: string, to: string) => {
  if (from !== to) moved.set(from, to);
};
