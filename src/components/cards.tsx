import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { DayPlan } from '../engine/focus';
import { size } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { cn } from './cn';
import { Icon, type IconName } from './Icon';

/* ---------------- RadioOptionCard ---------------- */

/** A full-width choice card: icon tile, title, subtitle, radio dot. Selected = 2pt navy outline. */
export function RadioOptionCard({
  icon,
  iconColor,
  title,
  subtitle,
  selected,
  onPress,
}: {
  icon?: IconName;
  /** A color token key from useTheme().c, e.g. 'bodyText' or 'liftFill'. */
  iconColor?: keyof ReturnType<typeof useTheme>['c'];
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      className={cn(
        'flex-row items-center gap-4 rounded-card border-2 bg-surface-card p-4 shadow-card',
        selected ? 'border-text' : 'border-transparent active:bg-surface-inset',
      )}
    >
      {icon ? (
        <View
          className="items-center justify-center rounded-md bg-surface-inset"
          style={{ width: size.touchMin, height: size.touchMin }}
        >
          <Icon name={icon} size={size.iconMd} color={c[iconColor ?? 'text']} />
        </View>
      ) : null}
      <View className="flex-1">
        <Text className="type-headline text-text">{title}</Text>
        {subtitle ? <Text className="mt-0.5 type-subhead text-text-muted">{subtitle}</Text> : null}
      </View>
      <View
        className={cn(
          'h-6 w-6 items-center justify-center rounded-pill border-2',
          selected ? 'border-text bg-text' : 'border-border-control',
        )}
      >
        {selected ? <View className="h-2.5 w-2.5 rounded-pill bg-surface-card" /> : null}
      </View>
    </Pressable>
  );
}

/* ---------------- TipCard ---------------- */

/** Informational note: icon, bold lead, body. `tone="info"` sits on a tinted surface. */
export function TipCard({
  icon = 'info',
  title,
  children,
  tone = 'card',
}: {
  icon?: IconName;
  title: string;
  children?: ReactNode;
  tone?: 'card' | 'info';
}) {
  const { c } = useTheme();
  return (
    <View
      className={cn(
        'flex-row gap-3 rounded-card p-5',
        tone === 'info' ? 'bg-info-soft' : 'bg-surface-card shadow-card',
      )}
    >
      <Icon name={icon} size={size.iconMd} color={tone === 'info' ? c.infoText : c.text} />
      <View className="flex-1 gap-1">
        <Text className="type-body-strong text-text">{title}</Text>
        {typeof children === 'string' ? (
          <Text className="type-body text-text">{children}</Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

/* ---------------- SettingsRow ---------------- */

/** A row inside a grouped settings card. Chevron when it navigates, red text when destructive. */
export function SettingsRow({
  label,
  value,
  onPress,
  destructive,
  right,
  last,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  /** Replaces the value + chevron (e.g. a Toggle). */
  right?: ReactNode;
  last?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      className={cn(
        'flex-row items-center gap-3 px-5 active:bg-surface-inset',
        !last && 'border-b border-hairline',
      )}
      style={{ minHeight: size.controlH + 4 }}
    >
      <Text className={cn('flex-1 type-headline', destructive ? 'text-danger-text' : 'text-text')}>
        {label}
      </Text>
      {right ?? (
        <>
          {value ? <Text className="type-subhead text-text-muted">{value}</Text> : null}
          {onPress && !destructive ? (
            <Icon name="chevron-right" size={size.iconMd} color={c.textMuted} />
          ) : null}
        </>
      )}
    </Pressable>
  );
}

/** The rounded card that groups SettingsRows, with an optional micro-label heading. */
export function SettingsGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      {title ? <Text className="px-5 type-micro text-text-muted">{title}</Text> : null}
      <View className="overflow-hidden rounded-card bg-surface-card shadow-card">{children}</View>
    </View>
  );
}

/* ---------------- MacroTile ---------------- */

/** One macro target: letter badge, micro label, big grams. Fuel colors. */
export function MacroTile({
  letter,
  label,
  grams,
}: {
  letter: string;
  label: string;
  grams: number;
}) {
  return (
    <View
      className="flex-1 gap-3 rounded-card bg-fuel-soft p-4"
      accessible
      accessibilityLabel={`${label} ${grams} grams`}
    >
      <View className="flex-row items-center gap-2">
        <View className="h-6 w-6 items-center justify-center rounded-pill bg-fuel-fill">
          <Text className="type-micro text-on-fuel">{letter}</Text>
        </View>
        <Text className="type-micro text-fuel-text" numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text className="type-stat text-text">
        {grams}
        <Text className="type-subhead text-text-muted"> g</Text>
      </Text>
    </View>
  );
}

/* ---------------- WeekPreview ---------------- */

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** A week of planned-session outlines (dashed = planned), Sunday first. Lift red, run steel. */
export function WeekPreview({ days }: { days: DayPlan[] }) {
  return (
    <View className="flex-row justify-between" accessible accessibilityLabel={describeWeek(days)}>
      {days.map((d, i) => (
        <View key={i} className="items-center gap-2" style={{ width: size.touchMin }}>
          {d === 'rest' ? (
            <View className="h-2 w-6 rounded-pill bg-track" />
          ) : (
            <View
              className={cn(
                'h-4 w-full rounded-xs border-2 border-dashed',
                d === 'lift' ? 'border-lift-fill' : 'border-run-text',
              )}
            />
          )}
          <Text className="type-label text-text">{DAY_LETTERS[i]}</Text>
        </View>
      ))}
    </View>
  );
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const describeWeek = (days: DayPlan[]) => days.map((d, i) => `${DAY_NAMES[i]} ${d}`).join(', ');
