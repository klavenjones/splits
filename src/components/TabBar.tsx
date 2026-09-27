import { View, Text, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from './cn';
import { Icon, type IconName } from './Icon';
import { useTheme } from '../theme/useTheme';
import { blur, size } from '../theme/tokens';

export type TabKey = 'today' | 'plan' | 'nutrition' | 'progress';
const TABS: { key: TabKey; icon: IconName; label: string }[] = [
  { key: 'today', icon: 'today', label: 'today' },
  { key: 'plan', icon: 'plan', label: 'plan' },
  { key: 'nutrition', icon: 'fuel', label: 'nutrition' },
  { key: 'progress', icon: 'progress', label: 'progress' },
];

/**
 * Frosted 5-slot tab bar: Today, Plan, center + (Log), Nutrition, Progress.
 * With expo-router: <Tabs tabBar={(p) => <TabBar active={p.state.routes[p.state.index].name as TabKey} onChange={(k) => p.navigation.navigate(k)} onAdd={openLogSheet} />} />
 */
export function TabBar({
  active,
  onChange,
  onAdd,
  badge,
}: {
  active: TabKey;
  onChange: (k: TabKey) => void;
  onAdd: () => void;
  badge?: TabKey;
}) {
  const { c, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const tab = (t: (typeof TABS)[number]) => {
    const on = t.key === active;
    return (
      <Pressable
        key={t.key}
        onPress={() => onChange(t.key)}
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        accessibilityLabel={t.label}
        className="h-12.5 flex-1 items-center justify-center gap-0.5 active:opacity-70"
      >
        <View>
          <Icon name={t.icon} size={size.iconLg} color={on ? c.text : c.textMuted} />
          {badge === t.key ? (
            <View className="absolute -top-0.5 -right-1 h-2.5 w-2.5 rounded-pill border-2 border-bg bg-lift-fill" />
          ) : null}
        </View>
        <Text
          className={cn(
            'text-micro',
            on ? 'font-body-bold text-text' : 'font-body-semibold text-text-muted',
          )}
        >
          {t.label}
        </Text>
      </Pressable>
    );
  };
  return (
    <View
      className="absolute right-0 bottom-0 left-0 border-t border-hairline"
      style={{ paddingBottom: insets.bottom }}
      accessibilityRole="tablist"
    >
      <BlurView
        intensity={blur.sm * 3}
        tint={scheme === 'dark' ? 'dark' : 'light'}
        className="absolute inset-0"
      />
      <View className="absolute inset-0 bg-glass" />
      <View className="flex-row items-start px-2 pt-1.5">
        {TABS.slice(0, 2).map(tab)}
        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel="Log a run, lift, meal or weigh-in"
          className="-mt-3.5 items-center justify-center rounded-pill bg-primary-fill shadow-float active:scale-95"
          style={{ width: size.fabSize, height: size.fabSize }}
        >
          <Icon name="plus" size={size.iconXl} color={c.onPrimary} />
        </Pressable>
        {TABS.slice(2).map(tab)}
      </View>
    </View>
  );
}
