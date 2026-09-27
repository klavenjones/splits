import { version } from 'expo/package.json';
import { useColorScheme } from 'react-native';

import { Image } from './image';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export function WebBadge() {
  const scheme = useColorScheme();

  return (
    <ThemedView className="items-center gap-2 p-8">
      <ThemedText type="code" themeColor="labelSecondary" className="text-center">
        v{version}
      </ThemedText>
      <Image
        source={
          scheme === 'dark'
            ? require('@/assets/images/expo-badge-white.png')
            : require('@/assets/images/expo-badge.png')
        }
        className="aspect-[123/24] w-[123px]"
      />
    </ThemedView>
  );
}
