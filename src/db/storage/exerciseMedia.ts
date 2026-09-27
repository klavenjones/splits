/**
 * Custom-exercise photos and videos in the private `exercise-media` bucket, stored at
 * `{userId}/{uuid}.{ext}` (docs/data-model.md). Rows keep the path; screens show a signed URL.
 */
import { useQuery } from '@tanstack/react-query';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { mediaContentType, MAX_MEDIA_BYTES, type LocalMedia } from '@/exercises/media';

import { supabase } from '../client';

export const EXERCISE_MEDIA_BUCKET = 'exercise-media';

function randomId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

async function readBytes(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === 'web') return (await fetch(uri)).arrayBuffer();
  return new File(uri).arrayBuffer();
}

/** Uploads to the user's folder and returns the storage path to save on the row. */
export async function uploadExerciseMedia(userId: string, media: LocalMedia): Promise<string> {
  if (media.fileSize && media.fileSize > MAX_MEDIA_BYTES)
    throw new Error('That file is over 50 MB. Try a shorter clip.');
  const { contentType, ext } = mediaContentType(media);
  const path = `${userId}/${randomId()}.${ext}`;
  const body = await readBytes(media.uri);
  const { error } = await supabase.storage
    .from(EXERCISE_MEDIA_BUCKET)
    .upload(path, body, { contentType, upsert: false });
  if (error) throw error;
  return path;
}

/** Best effort: a leftover file only costs storage, so failures are ignored. */
export async function removeExerciseMedia(paths: (string | null | undefined)[]) {
  const list = paths.filter((p): p is string => !!p);
  if (list.length) await supabase.storage.from(EXERCISE_MEDIA_BUCKET).remove(list);
}

const SIGNED_URL_SECONDS = 60 * 60;

/** A signed URL for a stored path, refreshed before it expires. */
export function useSignedMediaUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ['exercise-media', path],
    enabled: !!path,
    staleTime: (SIGNED_URL_SECONDS - 5 * 60) * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(EXERCISE_MEDIA_BUCKET)
        .createSignedUrl(path!, SIGNED_URL_SECONDS);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}
