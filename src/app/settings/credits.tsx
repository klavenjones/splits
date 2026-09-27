import * as WebBrowser from 'expo-web-browser';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components';
import { size, useTheme } from '@/theme';

const SOURCES: { title: string; body: string; url: string }[] = [
  {
    title: 'Exercise illustrations',
    body: 'Line drawings by Everkinetic and wger.de, via the wger project. Licensed CC-BY-SA 3.0; shown unmodified. Each exercise credits its image on the how-to tab.',
    url: 'https://wger.de',
  },
  {
    title: 'Exercise names and muscles',
    body: 'Curated from free-exercise-db (public domain, Unlicense). Instructions are written for Splits.',
    url: 'https://github.com/yuhonas/free-exercise-db',
  },
];

/** Third-party content the app uses, with links to the sources and licenses. */
export default function Credits() {
  const { c } = useTheme();
  return (
    <View className="gap-3 bg-surface-card px-5 pt-6 pb-10">
      <Text className="mb-2 type-title text-text" accessibilityRole="header">
        credits
      </Text>
      {SOURCES.map((s) => (
        <Pressable
          key={s.title}
          onPress={() => WebBrowser.openBrowserAsync(s.url)}
          accessibilityRole="link"
          accessibilityHint="Opens the source in a browser"
          className="flex-row gap-3 rounded-md bg-surface-inset p-4 active:bg-surface-control"
        >
          <View className="flex-1 gap-1">
            <Text className="type-body-strong text-text">{s.title}</Text>
            <Text className="type-subhead text-text-muted">{s.body}</Text>
          </View>
          <Icon name="arrow-up-right" size={size.iconMd} color={c.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}
