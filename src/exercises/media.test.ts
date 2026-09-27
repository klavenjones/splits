import { checkPickedMedia, mediaContentType } from './media';

describe('checkPickedMedia', () => {
  it('accepts photos and short videos', () => {
    expect(
      checkPickedMedia({ uri: 'file:///a.jpg', type: 'image', mimeType: 'image/jpeg' }),
    ).toEqual({
      media: { kind: 'photo', uri: 'file:///a.jpg', mimeType: 'image/jpeg', fileSize: null },
    });
    expect(
      checkPickedMedia({ uri: 'file:///b.mov', type: 'video', duration: 30_200 }),
    ).toMatchObject({
      media: { kind: 'video' },
    });
    expect(checkPickedMedia({ uri: 'x', mimeType: 'video/mp4' })).toMatchObject({
      media: { kind: 'video' },
    });
  });

  it('rejects long or huge videos and unknown types', () => {
    expect(checkPickedMedia({ uri: 'x', type: 'video', duration: 31_000 })).toHaveProperty('error');
    expect(
      checkPickedMedia({ uri: 'x', type: 'video', fileSize: 60 * 1024 * 1024 }),
    ).toHaveProperty('error');
    expect(checkPickedMedia({ uri: 'x' })).toHaveProperty('error');
  });
});

describe('mediaContentType', () => {
  it('prefers the reported MIME type', () => {
    expect(mediaContentType({ kind: 'video', uri: 'a.bin', mimeType: 'video/quicktime' })).toEqual({
      contentType: 'video/quicktime',
      ext: 'mov',
    });
  });

  it('falls back to the extension, then to the kind', () => {
    expect(mediaContentType({ kind: 'photo', uri: 'file:///x/IMG.JPEG?t=1' })).toEqual({
      contentType: 'image/jpeg',
      ext: 'jpg',
    });
    expect(mediaContentType({ kind: 'photo', uri: 'file:///x/a.png' }).contentType).toBe(
      'image/png',
    );
    expect(mediaContentType({ kind: 'video', uri: 'file:///x/clip' })).toEqual({
      contentType: 'video/mp4',
      ext: 'mp4',
    });
  });
});
