import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { cn } from './cn';

/**
 * An exercise demo: a silent looping video, or a photo. Autoplay is off under Reduce Motion
 * (design-tokens: motion); the native controls still let you start it.
 */
export function DemoPlayer({
  kind,
  uri,
  className,
}: {
  kind: 'photo' | 'video';
  uri: string;
  className?: string;
}) {
  return (
    <View
      className={cn('overflow-hidden rounded-card bg-surface-inset', className)}
      style={{ aspectRatio: 4 / 5 }}
    >
      {kind === 'video' ? (
        <LoopingVideo key={uri} uri={uri} />
      ) : (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          accessibilityLabel="Exercise photo"
        />
      )}
    </View>
  );
}

function LoopingVideo({ uri }: { uri: string }) {
  const reduceMotion = useReducedMotion();
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.audioMixingMode = 'mixWithOthers';
    if (!reduceMotion) p.play();
  });
  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={reduceMotion}
      allowsPictureInPicture={false}
      accessibilityLabel="Exercise demo video"
    />
  );
}
