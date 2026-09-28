import { Pressable, Text, View } from 'react-native';

import { size } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { cn } from './cn';
import { Icon, type IconName } from './Icon';

/** A template as a tappable row: kind bar, name, meta, trailing icon (add, or chevron). */
export function TemplatePickRow({
  kind,
  name,
  meta,
  icon = 'plus',
  selected,
  disabled,
  onPress,
}: {
  kind: 'lift' | 'run';
  name: string;
  meta: string;
  icon?: IconName;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={`${name}, ${kind}, ${meta}`}
      className={cn(
        'flex-row items-center gap-3 rounded-card py-3.5 pr-4 pl-4 active:bg-surface-inset',
        selected ? 'border-2 border-primary-fill bg-surface-card' : 'bg-surface-card shadow-card',
        disabled && 'opacity-50',
      )}
    >
      <View
        className={cn(
          'w-1.5 self-stretch rounded-pill',
          kind === 'lift' ? 'bg-lift-fill' : 'bg-run-fill',
        )}
      />
      <View className="flex-1 gap-0.5">
        <Text className="type-headline text-text" numberOfLines={1}>
          {name}
        </Text>
        <Text className="type-subhead text-text-muted" numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <Icon name={selected ? 'check' : icon} size={size.iconMd} color={c.text} />
    </Pressable>
  );
}
