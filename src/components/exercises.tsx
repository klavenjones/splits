import { forwardRef, type ReactNode } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { muscleGroup, type MuscleGroup } from '../exercises/vocab';
import { radius, size, type } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { cn } from './cn';
import { Icon, type IconName } from './Icon';

/* ---------------- SearchField ---------------- */

/** Pill search input on the control surface, with a clear button once there's text. */
export const SearchField = forwardRef<
  TextInput,
  Omit<TextInputProps, 'onChangeText' | 'value'> & {
    value: string;
    onChangeText: (t: string) => void;
    className?: string;
  }
>(function SearchField({ value, onChangeText, className, placeholder, ...p }, ref) {
  const { c } = useTheme();
  return (
    <View
      className={cn(
        'flex-row items-center gap-3 rounded-pill bg-surface-control pr-2 pl-4',
        className,
      )}
      style={{ minHeight: size.controlHSm }}
    >
      <Icon name="search" size={size.iconMd} color={c.textMuted} />
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textSubtle}
        accessibilityLabel={placeholder ?? 'Search'}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="never"
        className="flex-1 text-text"
        {...p}
        // Same no-lineHeight rule as TextField: iOS clips descenders otherwise.
        style={{
          fontFamily: type.body.fontFamily,
          fontSize: type.body.fontSize,
          paddingVertical: 0,
          alignSelf: 'stretch',
        }}
      />
      {value ? (
        <Pressable
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={8}
          className="h-8 w-8 items-center justify-center rounded-pill active:bg-surface-control-pressed"
        >
          <Icon name="x" size={size.iconSm} color={c.textMuted} strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </View>
  );
});

/* ---------------- Checkbox ---------------- */

/** 32pt rounded square; lift red when checked. Decorative inside a row that owns the a11y state. */
export function Checkbox({ checked, disabled }: { checked: boolean; disabled?: boolean }) {
  const { c } = useTheme();
  return (
    <View
      className={cn(
        'h-8 w-8 items-center justify-center rounded-xs border-2',
        checked ? 'border-lift-fill bg-lift-fill' : 'border-border-control',
        disabled && 'opacity-40',
      )}
      aria-hidden
    >
      {checked ? <Icon name="check" size={size.iconMd} color={c.onLift} strokeWidth={2.5} /> : null}
    </View>
  );
}

/* ---------------- ExerciseThumbnail ---------------- */

const GLYPH: Record<MuscleGroup, IconName> = {
  chest: 'muscle-chest',
  back: 'muscle-back',
  shoulders: 'muscle-shoulders',
  arms: 'muscle-arms',
  legs: 'muscle-legs',
  core: 'muscle-core',
  'full body': 'muscle-full-body',
};

/** The muscle-group glyph on a lift tint. Never a photo (docs/screens/README). */
export function ExerciseThumbnail({
  primaryMuscle,
  inverted,
  dim = 56,
}: {
  primaryMuscle: string | null;
  /** On a tinted (selected) row the tile flips to the card surface. */
  inverted?: boolean;
  dim?: number;
}) {
  const { c } = useTheme();
  const group = muscleGroup(primaryMuscle);
  return (
    <View
      className={cn(
        'items-center justify-center rounded-md',
        inverted ? 'bg-surface-card' : 'bg-lift-soft',
      )}
      style={{ width: dim, height: dim }}
      aria-hidden
    >
      <Icon name={group ? GLYPH[group] : 'lift'} size={size.iconXl} color={c.liftText} />
    </View>
  );
}

/* ---------------- ExerciseRow ---------------- */

export type ExerciseRowProps = {
  name: string;
  primaryMuscle: string | null;
  /** "rear delts · cable" */
  subtitle: string;
  /** The "last …" line; "no sets yet" until the logger exists. */
  last?: string | null;
  custom?: boolean;
  onPress?: () => void;
  /** Select mode: a checkbox replaces the chevron. */
  selectable?: boolean;
  selected?: boolean;
  /** Already added: checked and not tappable. */
  locked?: boolean;
  /** Draws the hairline under the row (inside a grouped card). */
  divider?: boolean;
};

/** Glyph, name, muscle · equipment, last set, and a chevron or checkbox. Lives in a grouped card. */
export function ExerciseRow({
  name,
  primaryMuscle,
  subtitle,
  last,
  custom,
  onPress,
  selectable,
  selected,
  locked,
  divider,
}: ExerciseRowProps) {
  const { c } = useTheme();
  const checked = !!selected || !!locked;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress || locked}
      accessibilityRole={selectable ? 'checkbox' : 'button'}
      accessibilityState={selectable ? { checked, disabled: !!locked } : undefined}
      accessibilityLabel={[name, custom ? 'custom' : null, subtitle, last ? `last ${last}` : null]
        .filter(Boolean)
        .join(', ')}
      className={cn(
        'flex-row items-center gap-4 px-4 py-4',
        selectable && checked ? 'bg-lift-soft' : 'active:bg-surface-inset',
        divider && !(selectable && checked) && 'border-b border-hairline',
      )}
    >
      <ExerciseThumbnail primaryMuscle={primaryMuscle} inverted={selectable && checked} />
      <View className="flex-1 gap-0.5">
        <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
          <Text className="shrink type-headline text-text" numberOfLines={2}>
            {name}
          </Text>
          {custom ? (
            <View className="h-6 justify-center rounded-pill bg-surface-control px-2.5">
              <Text className="type-micro text-text">custom</Text>
            </View>
          ) : null}
        </View>
        {subtitle ? (
          <Text className="type-subhead text-text-muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {last !== undefined ? (
          <Text className="type-subhead text-text-muted" numberOfLines={1}>
            last <Text className="type-label text-text">{last ?? 'no sets yet'}</Text>
          </Text>
        ) : null}
      </View>
      {selectable ? (
        <Checkbox checked={checked} disabled={locked} />
      ) : onPress ? (
        <Icon name="chevron-right" size={size.iconMd} color={c.textMuted} />
      ) : null}
    </Pressable>
  );
}

/* ---------------- ActionRow ---------------- */

/** "+ create custom exercise": icon tile, label, chevron, on a card. */
export function ActionRow({
  icon = 'plus',
  label,
  onPress,
}: {
  icon?: IconName;
  label: string;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center gap-4 rounded-card bg-surface-card px-4 py-4 shadow-card active:bg-surface-inset"
    >
      <View
        className="items-center justify-center rounded-sm bg-surface-control"
        style={{ width: size.touchMin, height: size.touchMin }}
      >
        <Icon name={icon} size={size.iconLg} color={c.text} />
      </View>
      <Text className="flex-1 type-headline text-text" numberOfLines={2}>
        {label}
      </Text>
      <Icon name="chevron-right" size={size.iconMd} color={c.textMuted} />
    </Pressable>
  );
}

/* ---------------- EmptyState ---------------- */

export function EmptyState({
  icon,
  title,
  body,
  children,
}: {
  icon: IconName;
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  const { c } = useTheme();
  return (
    <View className="items-center gap-3 rounded-card bg-surface-card px-6 py-10 shadow-card">
      <View
        className="items-center justify-center rounded-pill bg-surface-inset"
        style={{ width: size.fabSize, height: size.fabSize }}
      >
        <Icon name={icon} size={size.iconXl} color={c.textMuted} />
      </View>
      <Text className="text-center type-headline text-text">{title}</Text>
      {body ? <Text className="text-center type-subhead text-text-muted">{body}</Text> : null}
      {children}
    </View>
  );
}

/* ---------------- NumberedCueList ---------------- */

/** Numbered steps in navy circles, or a bulleted list of cues/mistakes. */
export function NumberedCueList({
  items,
  numbered = true,
  tone = 'default',
}: {
  items: string[];
  numbered?: boolean;
  tone?: 'default' | 'warning';
}) {
  const { c } = useTheme();
  return (
    <View className="gap-3">
      {items.map((item, i) => (
        <View key={i} className="flex-row gap-3">
          {numbered ? (
            <View className="mt-0.5 h-6 w-6 items-center justify-center rounded-pill bg-primary-fill">
              <Text className="type-caption text-on-primary">{i + 1}</Text>
            </View>
          ) : (
            <View className="mt-0.5">
              <Icon
                name={tone === 'warning' ? 'x' : 'check'}
                size={size.iconMd}
                color={tone === 'warning' ? c.dangerText : c.successText}
                strokeWidth={2.5}
              />
            </View>
          )}
          <Text className="flex-1 type-body text-text">{item}</Text>
        </View>
      ))}
    </View>
  );
}

/* ---------------- GroupedItem ---------------- */

/**
 * One row of a grouped card inside a SectionList: rounds the first and last row so the section
 * reads as a single card (SectionList can't wrap a section in a View).
 */
export function GroupedItem({
  index,
  count,
  children,
}: {
  index: number;
  count: number;
  children: ReactNode;
}) {
  const top = index === 0 ? radius.card : 0;
  const bottom = index === count - 1 ? radius.card : 0;
  return (
    <View
      className="overflow-hidden bg-surface-card"
      style={{
        borderTopLeftRadius: top,
        borderTopRightRadius: top,
        borderBottomLeftRadius: bottom,
        borderBottomRightRadius: bottom,
      }}
    >
      {children}
    </View>
  );
}
