import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { AnimatedIcon } from '@/components/animated-icon';
import { HintRow } from '@/components/hint-row';
import { SafeAreaView } from '@/components/safe-area-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset } from '@/constants/layout';

function getDevMenuHint() {
  if (Platform.OS === 'web') {
    return <ThemedText type="small">use browser devtools</ThemedText>;
  }
  if (Device.isDevice) {
    return (
      <ThemedText type="small">
        shake device or press <ThemedText type="code">m</ThemedText> in terminal
      </ThemedText>
    );
  }
  const shortcut = Platform.OS === 'android' ? 'cmd+m (or ctrl+m)' : 'cmd+d';
  return (
    <ThemedText type="small">
      press <ThemedText type="code">{shortcut}</ThemedText>
    </ThemedText>
  );
}

export default function HomeScreen() {
  return (
    <ThemedView className="flex-1 flex-row justify-center">
      <SafeAreaView
        // pl/pr, not px: SafeAreaView ignores the logical paddingInline that px compiles to.
        className="max-w-content flex-1 items-center gap-4 pl-6 pr-6"
        // Tab bar height is platform-specific, so this padding can't be a static class.
        style={{ paddingBottom: BottomTabInset + 16 }}>
        <ThemedView className="flex-1 items-center justify-center gap-6 px-6">
          <AnimatedIcon />
          <ThemedText type="title" className="text-center">
            Welcome to&nbsp;Expo
          </ThemedText>
        </ThemedView>

        <ThemedText type="code" className="uppercase">
          get started
        </ThemedText>

        <ThemedView type="backgroundElement" className="gap-4 self-stretch rounded-3xl px-4 py-6">
          <HintRow
            title="Try editing"
            hint={<ThemedText type="code">src/app/index.tsx</ThemedText>}
          />
          <HintRow title="Dev tools" hint={getDevMenuHint()} />
          <HintRow
            title="Fresh start"
            hint={<ThemedText type="code">npm run reset-project</ThemedText>}
          />
        </ThemedView>

        {Platform.OS === 'web' && <WebBadge />}
      </SafeAreaView>
    </ThemedView>
  );
}
