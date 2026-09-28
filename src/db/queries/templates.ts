import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../client';
import type { Database, Tables } from '../types';

import { toRows as liftRows, type LiftBlock, type LiftRow } from '@/templates/liftTemplate';
import { toRows as runRows, type Block, type SegmentRow } from '@/templates/runSegments';

export type Template = Tables<'templates'>;
export type TemplateListItem = Template & { exercise_count: number };

export type TemplateExerciseRow = LiftRow & {
  name: string;
  primary_muscle: string | null;
  equipment: string | null;
};
export type TemplateDetail = Template & {
  exercises: TemplateExerciseRow[];
  segments: SegmentRow[];
};

export const templatesKey = (userId: string | undefined) => ['templates', userId] as const;
export const templateKey = (id: string | undefined) => ['template', id] as const;

/** The library: every template the user owns, newest edits first, with exercise counts. */
export function useTemplates(userId: string | undefined) {
  return useQuery({
    queryKey: templatesKey(userId),
    enabled: !!userId,
    queryFn: async (): Promise<TemplateListItem[]> => {
      const { data, error } = await supabase
        .from('templates')
        .select('*, template_exercises(count)')
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data.map(({ template_exercises, ...t }) => ({
        ...t,
        exercise_count: template_exercises[0]?.count ?? 0,
      }));
    },
  });
}

/** One template with its exercises (and their names) and run segments, in position order. */
export async function fetchTemplate(id: string): Promise<TemplateDetail> {
  const { data, error } = await supabase
    .from('templates')
    .select(
      '*, template_exercises(*, exercises(name, primary_muscle, equipment)), template_run_segments(*)',
    )
    .eq('id', id)
    .single();
  if (error) throw error;
  const { template_exercises, template_run_segments, ...t } = data;
  return {
    ...t,
    exercises: template_exercises.map(({ exercises, ...r }) => ({
      exercise_id: r.exercise_id,
      position: r.position,
      superset_group: r.superset_group,
      target_sets: r.target_sets,
      rep_min: r.rep_min,
      rep_max: r.rep_max,
      rest_sec: r.rest_sec,
      notes: r.notes,
      name: exercises?.name ?? 'exercise',
      primary_muscle: exercises?.primary_muscle ?? null,
      equipment: exercises?.equipment ?? null,
    })),
    segments: template_run_segments.map((s) => ({
      position: s.position,
      segment_type: s.segment_type,
      repeat_group: s.repeat_group,
      repeats: s.repeats,
      distance_m: s.distance_m,
      duration_s: s.duration_s,
      target_type: s.target_type,
      target_pace_s_per_km: s.target_pace_s_per_km,
      target_pace_tolerance_s: s.target_pace_tolerance_s,
      target_hr_zone: s.target_hr_zone,
      target_effort: s.target_effort as SegmentRow['target_effort'],
      voice_cues: s.voice_cues as SegmentRow['voice_cues'],
    })),
  };
}

export function useTemplate(id: string | undefined) {
  return useQuery({
    queryKey: templateKey(id),
    enabled: !!id,
    queryFn: () => fetchTemplate(id!),
  });
}

type SaveArgs = Database['public']['Functions']['save_template']['Args'];

export type SaveTemplateInput = {
  id: string | null;
  name: string;
  notes: string | null;
  est_duration_s: number | null;
  est_distance_m: number | null;
} & ({ kind: 'lift'; lift: LiftBlock[] } | { kind: 'run'; run: Block[] });

/** Saves a template and replaces its children in one transaction (save_template RPC). */
export async function saveTemplate(t: SaveTemplateInput): Promise<string> {
  const args = {
    p_id: t.id,
    p_name: t.name,
    p_kind: t.kind,
    p_notes: t.notes,
    p_est_duration_s: t.est_duration_s,
    p_est_distance_m: t.est_distance_m,
    p_exercises: t.kind === 'lift' ? liftRows(t.lift) : null,
    p_segments: t.kind === 'run' ? runRows(t.run) : null,
  };
  // Generated RPC types mark every argument required and non-null; the function accepts nulls.
  const { data, error } = await supabase.rpc('save_template', args as unknown as SaveArgs);
  if (error) throw error;
  return data;
}

export function useSaveTemplate(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveTemplate,
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: templatesKey(userId) });
      qc.invalidateQueries({ queryKey: templateKey(id) });
    },
  });
}

export function useDuplicateTemplate(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('duplicate_template', { p_id: id });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: templatesKey(userId) }),
  });
}

/** Deletes a template and its rows. Past sessions keep their history (template_id → null). */
export function useDeleteTemplate(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('templates').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      qc.setQueryData<TemplateListItem[]>(templatesKey(userId), (list) =>
        list?.filter((t) => t.id !== id),
      );
      qc.removeQueries({ queryKey: templateKey(id) });
    },
  });
}
