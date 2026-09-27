import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';

import { checkPickedMedia, MAX_VIDEO_SECONDS, type LocalMedia } from '../exercises/media';
import { size } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { DemoPlayer } from './DemoPlayer';
import { Icon } from './Icon';
import { Button } from './primitives';

const PICK_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images', 'videos'],
  videoMaxDuration: MAX_VIDEO_SECONDS,
  quality: 0.8,
  // JPEG/H.264 instead of HEIC/HEVC so every device can play what's uploaded.
  preferredAssetRepresentationMode:
    ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

/**
 * Optional photo or short video for a custom exercise. Empty: a dashed tile with library and
 * camera buttons. Filled: the preview with replace and remove. `preview` is a local file or a
 * signed URL; picking hands back a LocalMedia to upload on save.
 */
export function MediaUploadField({
  preview,
  onPick,
  onRemove,
  disabled,
}: {
  preview: { kind: 'photo' | 'video'; uri: string } | null;
  onPick: (media: LocalMedia) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const { c } = useTheme();
  const [error, setError] = useState<string | null>(null);

  const take = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets[0]) return;
    const checked = checkPickedMedia(result.assets[0]);
    if ('error' in checked) setError(checked.error);
    else {
      setError(null);
      onPick(checked.media);
    }
  };

  const fromLibrary = async () => take(await ImagePicker.launchImageLibraryAsync(PICK_OPTIONS));

  const fromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access is off', 'Allow camera access in Settings to film a demo.', [
        { text: 'not now', style: 'cancel' },
        { text: 'open settings', onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    try {
      take(await ImagePicker.launchCameraAsync(PICK_OPTIONS));
    } catch {
      setError('No camera on this device. Choose from your library instead.');
    }
  };

  return (
    <View className="gap-3">
      {preview ? (
        <>
          <DemoPlayer kind={preview.kind} uri={preview.uri} />
          <View className="flex-row gap-3">
            <Button
              variant="secondary"
              size="md"
              icon="image"
              className="flex-1"
              disabled={disabled}
              onPress={fromLibrary}
            >
              replace
            </Button>
            <Button
              variant="ghost"
              size="md"
              icon="trash"
              className="flex-1"
              disabled={disabled}
              onPress={() => {
                setError(null);
                onRemove();
              }}
            >
              remove
            </Button>
          </View>
        </>
      ) : (
        <View className="items-center gap-4 rounded-card border-2 border-dashed border-border-control px-5 py-6">
          <View className="flex-row items-center gap-3">
            <Icon name="video" size={size.iconLg} color={c.textMuted} />
            <Text className="flex-1 type-subhead text-text-muted">
              Add a photo or a video up to {MAX_VIDEO_SECONDS} seconds. It plays silently on the
              how-to tab.
            </Text>
          </View>
          <View className="flex-row gap-3 self-stretch">
            <Pressable
              onPress={fromLibrary}
              disabled={disabled}
              accessibilityRole="button"
              className="flex-1 flex-row items-center justify-center gap-2 rounded-pill bg-surface-card shadow-card active:bg-surface-control"
              style={{ minHeight: size.controlHSm }}
            >
              <Icon name="image" size={size.iconMd} color={c.text} />
              <Text className="type-label text-text">library</Text>
            </Pressable>
            <Pressable
              onPress={fromCamera}
              disabled={disabled}
              accessibilityRole="button"
              className="flex-1 flex-row items-center justify-center gap-2 rounded-pill bg-surface-card shadow-card active:bg-surface-control"
              style={{ minHeight: size.controlHSm }}
            >
              <Icon name="camera" size={size.iconMd} color={c.text} />
              <Text className="type-label text-text">camera</Text>
            </Pressable>
          </View>
        </View>
      )}
      {error ? <Text className="px-1 type-caption text-danger-text">{error}</Text> : null}
    </View>
  );
}
