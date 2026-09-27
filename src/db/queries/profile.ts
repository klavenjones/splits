import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../client';
import type { TablesUpdate } from '../types';

export const profileKey = (userId: string | undefined) => ['profile', userId] as const;

/** The signed-in user's `users` row. */
export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: profileKey(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('*').eq('id', userId!).single();
      if (error) throw error;
      return data;
    },
  });
}

/** Updates fields on the signed-in user's `users` row. */
export function useUpdateProfile(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: TablesUpdate<'users'>) => {
      const { data, error } = await supabase
        .from('users')
        .update(patch)
        .eq('id', userId!)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row) => qc.setQueryData(profileKey(userId), row),
  });
}
