import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';

import { supabase } from '../client';

import type { PlanSession, SkipReason } from '@/plan/week';
import { overlayLocal, shiftDates } from '@/plan/week';
import { useWorkout } from '@/store/workout';
import type { SegmentType, TargetType } from '@/templates/runSegments';

const SELECT = `id, kind, name, scheduled_date, status, skip_reason, template_id,
  templates(id, name, kind, est_duration_s, est_distance_m,
    template_exercises(target_sets, exercises(primary_muscle)),
    template_run_segments(segment_type, target_type, target_effort, target_hr_zone))`;

export const sessionsRoot = (userId: string | undefined) => ['sessions', userId] as const;
export const sessionsKey = (userId: string | undefined, from: string, to: string) =>
  [...sessionsRoot(userId), from, to] as const;
export const sessionKey = (id: string | undefined) => ['session', id] as const;

type Row = {
  id: string;
  kind: PlanSession['kind'];
  name: string;
  scheduled_date: string;
  status: PlanSession['status'];
  skip_reason: string | null;
  template_id: string | null;
  templates: {
    id: string;
    name: string;
    kind: PlanSession['kind'];
    est_duration_s: number | null;
    est_distance_m: number | null;
    template_exercises: {
      target_sets: number;
      exercises: { primary_muscle: string | null } | null;
    }[];
    template_run_segments: {
      segment_type: SegmentType;
      target_type: TargetType;
      target_effort: string | null;
      target_hr_zone: number | null;
    }[];
  } | null;
};

function toSession({ templates: t, ...s }: Row): PlanSession {
  return {
    ...s,
    template: t
      ? {
          id: t.id,
          name: t.name,
          kind: t.kind,
          est_duration_s: t.est_duration_s,
          est_distance_m: t.est_distance_m,
          exercises: t.template_exercises.map((e) => ({
            target_sets: e.target_sets,
            primary_muscle: e.exercises?.primary_muscle ?? null,
          })),
          segments: t.template_run_segments,
        }
      : null,
  };
}

/**
 * Sessions scheduled from `from` through `to` (inclusive), with their template summaries, and
 * with workouts still on this phone laid over them (in progress, or finished but not synced).
 */
export function useSessions(userId: string | undefined, from: string, to: string) {
  const local = useWorkout((s) => s.local);
  const q = useServerSessions(userId, from, to);
  return { ...q, data: q.data ? overlayLocal(q.data, local, from, to) : q.data };
}

function useServerSessions(userId: string | undefined, from: string, to: string) {
  return useQuery({
    queryKey: sessionsKey(userId, from, to),
    enabled: !!userId,
    queryFn: async (): Promise<PlanSession[]> => {
      const { data, error } = await supabase
        .from('sessions')
        .select(SELECT)
        .gte('scheduled_date', from)
        .lte('scheduled_date', to)
        .order('scheduled_date');
      if (error) throw error;
      return (data as unknown as Row[]).map(toSession);
    },
  });
}

export function useSession(id: string | undefined) {
  const local = useWorkout((s) => s.local);
  const q = useServerSession(id);
  return {
    ...q,
    data: q.data
      ? (overlayLocal([q.data], local, '0000-01-01', '9999-12-31')[0] ?? q.data)
      : q.data,
  };
}

function useServerSession(id: string | undefined) {
  return useQuery({
    queryKey: sessionKey(id),
    enabled: !!id,
    queryFn: async (): Promise<PlanSession> => {
      const { data, error } = await supabase.from('sessions').select(SELECT).eq('id', id!).single();
      if (error) throw error;
      return toSession(data as unknown as Row);
    },
  });
}

/**
 * Applies `edit` to every cached session list and detail at once (for optimistic updates) and
 * returns a function that puts the old data back.
 */
function patchCaches(
  qc: ReturnType<typeof useQueryClient>,
  userId: string | undefined,
  edit: (list: PlanSession[]) => PlanSession[],
) {
  const lists = qc.getQueriesData<PlanSession[]>({ queryKey: sessionsRoot(userId) });
  const details = qc.getQueriesData<PlanSession>({ queryKey: ['session'] });
  for (const [key, list] of lists) if (list) qc.setQueryData(key, edit(list));
  for (const [key, s] of details) if (s) qc.setQueryData(key, edit([s])[0] ?? s);
  return () => {
    for (const [key, data] of [...lists, ...details] as [QueryKey, unknown][])
      qc.setQueryData(key, data);
  };
}

/** Every session mutation invalidates all session lists and details, so Today and Plan agree. */
function useSessionMutation<V, R>(
  userId: string | undefined,
  mutationFn: (v: V) => Promise<R>,
  optimistic?: (v: V) => (list: PlanSession[]) => PlanSession[],
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async (v: V) => {
      if (!optimistic) return undefined;
      await qc.cancelQueries({ queryKey: sessionsRoot(userId) });
      return patchCaches(qc, userId, optimistic(v));
    },
    onError: (_e, _v, undo) => undo?.(),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: sessionsRoot(userId) });
      qc.invalidateQueries({ queryKey: ['session'] });
    },
  });
}

/** Creates planned sessions from templates (plan_sessions copies name and kind). */
export function usePlanSessions(userId: string | undefined) {
  return useSessionMutation(
    userId,
    async (items: { template_id: string; scheduled_date: string }[]) => {
      const { data, error } = await supabase.rpc('plan_sessions', { p_items: items });
      if (error) throw error;
      return data;
    },
  );
}

/** Moves a planned session to another day. */
export function useMoveSession(userId: string | undefined) {
  return useSessionMutation(
    userId,
    async ({ id, date }: { id: string; date: string }) => {
      const { error } = await supabase
        .from('sessions')
        .update({ scheduled_date: date })
        .eq('id', id)
        .eq('status', 'planned');
      if (error) throw error;
    },
    ({ id, date }) =>
      (list) =>
        list.map((s) => (s.id === id ? { ...s, scheduled_date: date } : s)),
  );
}

export function useSkipSession(userId: string | undefined) {
  return useSessionMutation(
    userId,
    async ({ id, reason }: { id: string; reason: SkipReason | null }) => {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'skipped', skip_reason: reason })
        .eq('id', id)
        .eq('status', 'planned');
      if (error) throw error;
    },
    ({ id, reason }) =>
      (list) =>
        list.map((s) => (s.id === id ? { ...s, status: 'skipped', skip_reason: reason } : s)),
  );
}

/** Skipped → planned again. */
export function useRestoreSession(userId: string | undefined) {
  return useSessionMutation(
    userId,
    async (id: string) => {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'planned', skip_reason: null })
        .eq('id', id)
        .eq('status', 'skipped');
      if (error) throw error;
    },
    (id) => (list) =>
      list.map((s) => (s.id === id ? { ...s, status: 'planned', skip_reason: null } : s)),
  );
}

/** "Shift the week": this session and the week's later planned sessions move a day later. */
export function useShiftWeek(userId: string | undefined) {
  return useSessionMutation(
    userId,
    async (id: string) => {
      const { data, error } = await supabase.rpc('shift_sessions', { p_session_id: id });
      if (error) throw error;
      return data;
    },
    (id) => (list) => shiftDates(list, id),
  );
}

/** Removes a planned session from the plan. */
export function useDeleteSession(userId: string | undefined) {
  return useSessionMutation(
    userId,
    async (id: string) => {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', id)
        .eq('status', 'planned');
      if (error) throw error;
    },
    (id) => (list) => list.filter((s) => s.id !== id),
  );
}
