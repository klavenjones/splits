/** Rules for a picked photo or video before upload. Pure. */
export const MAX_VIDEO_SECONDS = 30;
export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;

export type MediaKind = 'photo' | 'video';

/** A file picked on the device, not uploaded yet. */
export type LocalMedia = {
  kind: MediaKind;
  uri: string;
  mimeType?: string | null;
  fileSize?: number | null;
};

/** The subset of expo-image-picker's asset we read. */
export type PickedAsset = {
  uri: string;
  type?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  /** Milliseconds, videos only. */
  duration?: number | null;
};

/** Picked asset → media to upload, or a message saying why it can't be used. */
export function checkPickedMedia(a: PickedAsset): { media: LocalMedia } | { error: string } {
  const kind: MediaKind | null =
    a.type === 'video' || a.mimeType?.startsWith('video/')
      ? 'video'
      : a.type === 'image' || a.type === 'livePhoto' || a.mimeType?.startsWith('image/')
        ? 'photo'
        : null;
  if (!kind) return { error: 'Pick a photo or a video.' };
  // Half a second of slack: the camera stops at 30.0 but reports 30.03.
  if (kind === 'video' && a.duration && a.duration > MAX_VIDEO_SECONDS * 1000 + 500)
    return {
      error: `Keep videos to ${MAX_VIDEO_SECONDS} seconds. Trim it in Photos and try again.`,
    };
  if (a.fileSize && a.fileSize > MAX_MEDIA_BYTES)
    return { error: 'That file is over 50 MB. Try a shorter clip.' };
  return {
    media: { kind, uri: a.uri, mimeType: a.mimeType ?? null, fileSize: a.fileSize ?? null },
  };
}

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
};

/** The content type to upload with. The picker doesn't always report one; fall back to the extension. */
export function mediaContentType(m: LocalMedia): { contentType: string; ext: string } {
  if (m.mimeType && EXT[m.mimeType]) return { contentType: m.mimeType, ext: EXT[m.mimeType] };
  let ext = m.uri.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'jpeg') ext = 'jpg';
  const found = Object.entries(EXT).find(([, e]) => e === ext);
  if (found) return { contentType: found[0], ext };
  return m.kind === 'video'
    ? { contentType: 'video/mp4', ext: 'mp4' }
    : { contentType: 'image/jpeg', ext: 'jpg' };
}
