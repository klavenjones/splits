import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../client';
import { removeExerciseMedia, uploadExerciseMedia } from '../storage/exerciseMedia';
import type { Tables } from '../types';

import type { LocalMedia, MediaKind } from '@/exercises/media';
import { cleanSecondary, type ExerciseDraft } from '@/exercises/validate';

export type Exercise = Tables<'exercises'>;
/** List rows skip the instructions jsonb; the detail screen loads the full row. */
export type ExerciseListItem = Omit<
  Exercise,
  'instructions' | 'media_credit' | 'created_at' | 'updated_at'
>;

const LIST_COLUMNS =
  'id, owner_id, name, primary_muscle, secondary_muscles, equipment, tracking_type, thumbnail_url, demo_url, demo_type, notes, is_archived';

export const exercisesKey = (userId: string | undefined) => ['exercises', userId] as const;
export const exerciseKey = (id: string | undefined) => ['exercise', id] as const;

/** Every exercise the user can use: the built-in library plus their own, not archived. RLS scopes it. */
export function useExercises(userId: string | undefined) {
  return useQuery({
    queryKey: exercisesKey(userId),
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ExerciseListItem[]> => {
      const { data, error } = await supabase
        .from('exercises')
        .select(LIST_COLUMNS)
        .eq('is_archived', false)
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useExercise(id: string | undefined) {
  return useQuery({
    queryKey: exerciseKey(id),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('exercises').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * The media field's value: nothing, a file already in storage, or a newly picked file.
 * Photos live in `thumbnail_url`; videos in `demo_url` with `demo_type = 'video'`.
 */
export type MediaValue =
  | null
  | { source: 'stored'; kind: MediaKind; path: string }
  | { source: 'local'; media: LocalMedia };

export function storedMedia(
  e: Pick<Exercise, 'demo_type' | 'demo_url' | 'thumbnail_url'>,
): MediaValue {
  if (e.demo_type === 'video' && e.demo_url)
    return { source: 'stored', kind: 'video', path: e.demo_url };
  if (e.thumbnail_url) return { source: 'stored', kind: 'photo', path: e.thumbnail_url };
  return null;
}

async function mediaColumns(userId: string, media: MediaValue) {
  if (!media) return { thumbnail_url: null, demo_url: null, demo_type: 'none' as const };
  const kind = media.source === 'stored' ? media.kind : media.media.kind;
  const path =
    media.source === 'stored' ? media.path : await uploadExerciseMedia(userId, media.media);
  return kind === 'video'
    ? { thumbnail_url: null, demo_url: path, demo_type: 'video' as const }
    : { thumbnail_url: path, demo_url: null, demo_type: 'none' as const };
}

function draftColumns(d: ExerciseDraft) {
  return {
    name: d.name.trim(),
    primary_muscle: d.primaryMuscle,
    secondary_muscles: cleanSecondary(d.primaryMuscle, d.secondaryMuscles),
    equipment: d.equipment,
    tracking_type: d.trackingType,
    notes: d.notes.trim() || null,
  };
}

const friendly = (e: { code?: string; message: string }) =>
  e.code === '23505' ? new Error('You already have an exercise with that name.') : e;

/** Uploads any picked media, then inserts. Removes the upload if the insert fails. */
export function useCreateExercise(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ draft, media }: { draft: ExerciseDraft; media: MediaValue }) => {
      const m = await mediaColumns(userId!, media);
      const { data, error } = await supabase
        .from('exercises')
        .insert({ ...draftColumns(draft), ...m, owner_id: userId! })
        .select('*')
        .single();
      if (error) {
        await removeExerciseMedia([m.thumbnail_url, m.demo_url]).catch(() => {});
        throw friendly(error);
      }
      return data;
    },
    onSuccess: (row) => {
      qc.setQueryData(exerciseKey(row.id), row);
      qc.invalidateQueries({ queryKey: exercisesKey(userId) });
    },
  });
}

/** Saves edits to one of the user's exercises; replaced media is removed from storage after. */
export function useUpdateExercise(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      draft,
      media,
      previous,
    }: {
      id: string;
      draft: ExerciseDraft;
      media: MediaValue;
      previous: Pick<Exercise, 'thumbnail_url' | 'demo_url'>;
    }) => {
      const m = await mediaColumns(userId!, media);
      const { data, error } = await supabase
        .from('exercises')
        .update({ ...draftColumns(draft), ...m })
        .eq('id', id)
        .select('*')
        .single();
      if (error) {
        if (media?.source === 'local')
          await removeExerciseMedia([m.thumbnail_url, m.demo_url]).catch(() => {});
        throw friendly(error);
      }
      const kept = new Set([m.thumbnail_url, m.demo_url]);
      await removeExerciseMedia(
        [previous.thumbnail_url, previous.demo_url].filter((p) => !kept.has(p)),
      ).catch(() => {});
      return data;
    },
    onSuccess: (row) => {
      qc.setQueryData(exerciseKey(row.id), row);
      qc.invalidateQueries({ queryKey: exercisesKey(userId) });
    },
  });
}

/** "Delete" = archive: templates and past sessions still point at the row. */
export function useArchiveExercise(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exercises').update({ is_archived: true }).eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      qc.setQueryData<ExerciseListItem[]>(exercisesKey(userId), (list) =>
        list?.filter((e) => e.id !== id),
      );
      qc.invalidateQueries({ queryKey: exerciseKey(id) });
    },
  });
}
