import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MicroLabel } from './primitives';

/** Stand-in for a tab screen that hasn't been built yet. */
export function PlaceholderScreen({ title, caption }: { title: string; caption: string }) {
  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} className="flex-1">
        {/* Padding lives on an inner View: SafeAreaView's inset padding overrides padding classes. */}
        <View className="px-4 pt-4">
          <MicroLabel>coming soon</MicroLabel>
          <Text className="mt-1 type-display text-text" accessibilityRole="header">
            {title}
          </Text>
          <Text className="mt-2 type-subhead text-text-muted">{caption}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
