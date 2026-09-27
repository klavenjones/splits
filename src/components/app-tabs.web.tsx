import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View } from 'react-native';

import { ExternalLink } from './external-link';
import { SymbolIcon } from './symbol-icon';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>Home</TabButton>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton>Explore</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} className="active:opacity-70">
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        className="rounded-2xl px-4 py-1">
        <ThemedText type="small" themeColor={isFocused ? 'label' : 'labelSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} className="absolute w-full flex-row items-center justify-center p-4">
      <ThemedView
        type="backgroundElement"
        className="max-w-content grow flex-row items-center gap-2 rounded-full px-8 py-2">
        <ThemedText type="smallBold" className="mr-auto">
          Expo Starter
        </ThemedText>

        {props.children}

        <ExternalLink href="https://docs.expo.dev" asChild>
          <Pressable className="ml-4 flex-row items-center justify-center gap-1">
            <ThemedText type="link">Docs</ThemedText>
            <SymbolIcon
              className="text-label"
              name={{ ios: 'arrow.up.right.square', web: 'link' }}
              size={12}
            />
          </Pressable>
        </ExternalLink>
      </ThemedView>
    </View>
  );
}
