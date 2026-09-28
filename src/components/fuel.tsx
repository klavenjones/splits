import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { size } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { cn } from './cn';
import { Icon } from './Icon';
import { Button, Card } from './primitives';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

/* ---------------- CalorieBar ---------------- */

/** Thick oxblood bar of calories eaten against the target, with both numbers under it. */
export function CalorieBar({ eaten, target }: { eaten: number; target: number }) {
  const share = target > 0 ? Math.min(1, eaten / target) : 0;
  return (
    <View className="gap-2">
      <View
        className="h-4 overflow-hidden rounded-pill bg-track"
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`${fmt(eaten)} of ${fmt(target)} kcal eaten`}
        accessibilityValue={{ min: 0, max: Math.round(target), now: Math.round(eaten) }}
      >
        <View className="h-4 rounded-pill bg-fuel-fill" style={{ width: `${share * 100}%` }} />
      </View>
      <View className="flex-row justify-between">
        <Text className="type-caption text-text-muted">
          <Text className="type-label text-text">{fmt(eaten)}</Text> eaten
        </Text>
        <Text className="type-caption text-text-muted">
          <Text className="type-label text-text">{fmt(target)}</Text> target
        </Text>
      </View>
    </View>
  );
}

/* ---------------- MacroBars ---------------- */

export type Macro = { key: 'protein' | 'carbs' | 'fat'; eaten: number; target: number };

const MACRO = {
  protein: { letter: 'P', fill: 'bg-macro-protein' },
  carbs: { letter: 'C', fill: 'bg-macro-carbs' },
  fat: { letter: 'F', fill: 'bg-macro-fat' },
} as const;

/**
 * Protein, fat and carbs eaten against target. `tone="fuel"` draws all three in oxblood (the
 * diary); `"macro"` uses the macro colors (Today).
 */
export function MacroBars({ macros, tone = 'fuel' }: { macros: Macro[]; tone?: 'fuel' | 'macro' }) {
  return (
    <View className="gap-4">
      {macros.map((m) => {
        const fill = tone === 'fuel' ? 'bg-fuel-fill' : MACRO[m.key].fill;
        return (
          <View
            key={m.key}
            className="gap-2"
            accessible
            accessibilityLabel={`${m.key}: ${Math.round(m.eaten)} of ${Math.round(m.target)} grams`}
          >
            <View className="flex-row items-center gap-2">
              <View className={cn('h-5 w-5 items-center justify-center rounded-[5px]', fill)}>
                <Text className="font-body-bold text-[11px] leading-[14px] text-on-fuel">
                  {MACRO[m.key].letter}
                </Text>
              </View>
              <Text className="flex-1 type-subhead text-text">{m.key}</Text>
              <Text className="type-caption text-text-muted">
                <Text className="type-label text-text">{Math.round(m.eaten)}</Text> /{' '}
                {Math.round(m.target)} g
              </Text>
            </View>
            <View className="h-2 overflow-hidden rounded-pill bg-track">
              <View
                className={cn('h-2 rounded-pill', fill)}
                style={{ width: `${m.target > 0 ? Math.min(1, m.eaten / m.target) * 100 : 0}%` }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ---------------- FoodRow ---------------- */

/** A logged or searchable food: name, serving line, kcal; optional add/added toggle. */
export function FoodRow({
  name,
  detail,
  kcal,
  added,
  onToggle,
  onPress,
  divider,
}: {
  name: string;
  detail: ReactNode;
  kcal: number;
  added?: boolean;
  onToggle?: () => void;
  onPress?: () => void;
  divider?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      className={cn(
        'flex-row items-center gap-3 px-1 py-3 active:opacity-70',
        divider && 'border-b border-hairline',
        added && 'rounded-md bg-fuel-soft px-3',
      )}
    >
      <View className="flex-1">
        <Text className="type-body-strong text-text" numberOfLines={2}>
          {name}
        </Text>
        <Text className="type-caption text-text-muted" numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <View className="items-end">
        <Text className="type-label text-text">{fmt(kcal)}</Text>
        {onToggle ? <Text className="type-caption text-text-muted">kcal</Text> : null}
      </View>
      {onToggle ? (
        <Pressable
          onPress={onToggle}
          hitSlop={8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: !!added }}
          accessibilityLabel={`${added ? 'Remove' : 'Add'} ${name}`}
          className={cn(
            'h-9 w-9 items-center justify-center rounded-pill',
            added ? 'bg-fuel-fill' : 'bg-fuel-soft',
          )}
        >
          <Icon
            name={added ? 'check' : 'plus'}
            size={size.iconSm}
            color={added ? c.onFuel : c.fuelText}
          />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

/* ---------------- MealCard ---------------- */

/** One meal of the diary: name, kcal total, add; the foods; an "add food" prompt when empty. */
export function MealCard({
  title,
  kcal,
  kcalLeft,
  onAdd,
  children,
  empty,
}: {
  title: string;
  kcal: number;
  kcalLeft: number;
  onAdd: () => void;
  children?: ReactNode;
  empty: boolean;
}) {
  const { c } = useTheme();
  return (
    <Card className="gap-2">
      <View className="flex-row items-center gap-3">
        <Text className="flex-1 type-headline text-text" accessibilityRole="header">
          {title}
        </Text>
        {empty ? (
          <Text className="type-subhead text-text-muted">nothing logged</Text>
        ) : (
          <Text className="type-caption text-text-muted">
            <Text className="type-headline text-fuel-text">{fmt(kcal)}</Text> kcal
          </Text>
        )}
        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel={`Add food to ${title}`}
          hitSlop={6}
          className="h-11 w-11 items-center justify-center rounded-pill bg-fuel-soft active:opacity-70"
        >
          <Icon name="plus" size={size.iconMd} color={c.fuelText} />
        </Pressable>
      </View>
      {empty && title === 'dinner' ? (
        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          className="mt-2 flex-row items-center gap-4 rounded-card border-2 border-fuel-fill bg-fuel-soft px-4 py-3.5 active:opacity-80"
        >
          <View className="h-11 w-11 items-center justify-center rounded-pill bg-fuel-fill">
            <Icon name="plus" size={size.iconMd} color={c.onFuel} />
          </View>
          <View className="flex-1">
            <Text className="type-headline text-fuel-text">add food</Text>
            <Text className="type-subhead text-fuel-text">
              Nothing logged yet. {fmt(Math.max(0, kcalLeft))} kcal to plan with.
            </Text>
          </View>
        </Pressable>
      ) : null}
      {!empty ? <View className="border-t border-hairline pt-1">{children}</View> : null}
    </Card>
  );
}

/* ---------------- NumberPad ---------------- */

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'] as const;

/** 3 × 4 number pad for weigh-ins: digits, a decimal point, delete. */
export function NumberPad({ onKey }: { onKey: (key: (typeof KEYS)[number]) => void }) {
  const { c } = useTheme();
  return (
    <View className="flex-row flex-wrap justify-between gap-y-2.5">
      {KEYS.map((k) => (
        <Pressable
          key={k}
          onPress={() => onKey(k)}
          accessibilityRole="button"
          accessibilityLabel={k === 'del' ? 'Delete' : k === '.' ? 'Decimal point' : k}
          className={cn(
            'h-14 items-center justify-center rounded-md',
            k === 'del'
              ? 'active:bg-surface-control'
              : 'bg-surface-control active:bg-surface-control-pressed',
          )}
          style={{ width: '31.5%' }}
        >
          {k === 'del' ? (
            <Icon name="backspace" size={size.iconLg} color={c.text} />
          ) : (
            <Text className="font-display text-[24px] leading-[28px] text-text">{k}</Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}

/* ---------------- ImpactFooter ---------------- */

/** Search sheet footer: what's added, what's left after it, and the log button. */
export function ImpactFooter({
  count,
  kcal,
  protein,
  kcalLeft,
  proteinLeft,
  action,
  onLog,
  loading,
}: {
  count: number;
  kcal: number;
  protein: number;
  kcalLeft: number;
  proteinLeft: number;
  action: string;
  onLog: () => void;
  loading?: boolean;
}) {
  return (
    <View className="gap-3 border-t border-hairline bg-surface-card px-5 pt-4 pb-8">
      <View className="flex-row items-baseline justify-between">
        <Text className="type-subhead text-text">
          {count} item{count === 1 ? '' : 's'} added
        </Text>
        <Text className="type-caption text-text-muted">
          <Text className="type-label text-text">{fmt(kcal)}</Text> kcal ·{' '}
          <Text className="type-label text-text">{Math.round(protein)} g</Text> protein
        </Text>
      </View>
      <View className="flex-row items-baseline justify-between">
        <Text className="type-micro text-text-muted">after this</Text>
        <Text className="type-caption text-text-muted">
          <Text className="type-label text-text">{fmt(kcalLeft)}</Text> kcal{' '}
          {kcalLeft >= 0 ? 'left' : 'over'} ·{' '}
          <Text className="type-label text-text">{Math.max(0, Math.round(proteinLeft))} g</Text>{' '}
          protein to go
        </Text>
      </View>
      <Button block icon="check" loading={loading} disabled={count === 0} onPress={onLog}>
        {action}
      </Button>
    </View>
  );
}
