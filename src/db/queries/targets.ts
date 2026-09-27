import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { SaveStartingTargetsArgs } from '@/onboarding/buildStartingTargets';

import { supabase } from '../client';

export const targetsKey = (userId: string | undefined) => ['targets', userId] as const;

/** Current targets: the latest `weekly_targets` row the user accepted or kept. */
export function useCurrentTargets(userId: string | undefined) {
  return useQuery({
    queryKey: targetsKey(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_targets')
        .select('*')
        .eq('user_id', userId!)
        .in('status', ['accepted', 'kept'])
        .order('week_start', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Onboarding: saves the profile, nutrition profile and first targets in one transaction. */
export function useSaveStartingTargets(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: SaveStartingTargetsArgs) => {
      const { error } = await supabase.rpc('save_starting_targets', args);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: targetsKey(userId) });
      qc.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });
}
