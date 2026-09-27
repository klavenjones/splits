import { Pressable, Text, View } from 'react-native';

import { Icon, MicroLabel, type IconName } from '@/components';
import { size, useTheme } from '@/theme';

const ACTIONS: { icon: IconName; label: string }[] = [
  { icon: 'lift', label: 'start workout' },
  { icon: 'fuel', label: 'log food' },
  { icon: 'body', label: 'log weight' },
  { icon: 'plus', label: 'quick add' },
];

/** Placeholder for the center + action sheet. Each action is wired up in a later build step. */
export default function AddSheet() {
  const { c } = useTheme();
  return (
    <View className="gap-2 bg-surface-card px-4 pt-6 pb-10">
      <Text className="mb-2 type-title text-text" accessibilityRole="header">
        log
      </Text>
      {ACTIONS.map((a) => (
        <Pressable
          key={a.label}
          disabled
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          accessibilityLabel={`${a.label}, coming soon`}
          className="flex-row items-center gap-3 rounded-md bg-surface-inset px-4"
          style={{ minHeight: size.controlH }}
        >
          <Icon name={a.icon} size={size.iconMd} color={c.textMuted} />
          <Text className="flex-1 type-label text-text">{a.label}</Text>
          <MicroLabel>soon</MicroLabel>
        </Pressable>
      ))}
    </View>
  );
}
