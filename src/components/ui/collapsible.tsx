import { PropsWithChildren, useState } from 'react';
import { Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { SymbolIcon } from '@/components/symbol-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ThemedView>
      <Pressable
        className="flex-row items-center gap-2 active:opacity-70"
        onPress={() => setIsOpen((value) => !value)}>
        <ThemedView type="backgroundElement" className="size-6 items-center justify-center rounded-xl">
          <SymbolIcon
            className="text-label"
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={14}
            weight="bold"
            style={{ transform: [{ rotate: isOpen ? '-90deg' : '90deg' }] }}
          />
        </ThemedView>

        <ThemedText type="small">{title}</ThemedText>
      </Pressable>
      {isOpen && (
        <Animated.View entering={FadeIn.duration(200)}>
          <ThemedView type="backgroundElement" className="ml-6 mt-4 rounded-2xl p-6">
            {children}
          </ThemedView>
        </Animated.View>
      )}
    </ThemedView>
  );
}
