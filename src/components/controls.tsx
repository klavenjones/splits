import { forwardRef } from 'react';
import {
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
  type SwitchProps,
  type TextInputProps,
} from 'react-native';

import { size } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { cn } from './cn';
import { Icon } from './Icon';

/* ---------------- StepProgressBar ---------------- */

/** Short pills, one per step: done and current filled, the rest on the track. */
export function StepProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <View
      className="flex-row gap-1.5"
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: step }}
    >
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          className={cn('h-2 w-4 rounded-pill', i < step ? 'bg-primary-fill' : 'bg-track')}
        />
      ))}
    </View>
  );
}

/* ---------------- TopNav ---------------- */

/** Round back button, with optional step progress ("STEP 2 OF 5") or a centered title. */
export function TopNav({
  onBack,
  step,
  total,
  title,
}: {
  onBack?: () => void;
  step?: number;
  total?: number;
  title?: string;
}) {
  const { c } = useTheme();
  return (
    <View className="min-h-12 flex-row items-center gap-4">
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="items-center justify-center rounded-pill bg-surface-card shadow-card active:opacity-70"
          style={{ width: size.touchMin, height: size.touchMin }}
        >
          <Icon name="chevron-left" size={size.iconMd} color={c.text} />
        </Pressable>
      ) : null}
      {step && total ? (
        <View className="gap-2">
          <StepProgressBar step={step} total={total} />
          <Text className="type-micro text-text-muted">
            step {step} of {total}
          </Text>
        </View>
      ) : null}
      {title ? (
        <Text
          className="absolute right-0 left-0 text-center type-headline text-text"
          accessibilityRole="header"
          pointerEvents="none"
        >
          {title}
        </Text>
      ) : null}
    </View>
  );
}

/* ---------------- SegmentedControl ---------------- */

export type Segment<T extends string> = { value: T; label: string };

/** Pill track with one selected segment. */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  accessibilityLabel,
}: {
  segments: Segment<T>[];
  value: T | null;
  onChange: (v: T) => void;
  accessibilityLabel?: string;
}) {
  return (
    <View
      className="flex-row rounded-pill bg-surface-control p-1"
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {segments.map((s) => {
        const on = s.value === value;
        return (
          <Pressable
            key={s.value}
            onPress={() => onChange(s.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            className={cn(
              'flex-1 items-center justify-center rounded-pill',
              on ? 'bg-primary-fill' : 'active:bg-surface-control-pressed',
            )}
            style={{ minHeight: size.controlHSm }}
          >
            <Text className={cn('type-label', on ? 'text-on-primary' : 'text-text')}>
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------------- TextField / NumericField ---------------- */

type FieldProps = TextInputProps & {
  label?: string;
  unit?: string;
  error?: string | null;
  className?: string;
  /** Big tabular digits (numbers) vs body text (email, names). */
  large?: boolean;
};

/** Labeled input on a card surface with an optional unit suffix. */
export const TextField = forwardRef<TextInput, FieldProps>(function TextField(
  { label, unit, error, className, large, editable = true, ...p },
  ref,
) {
  const { c } = useTheme();
  return (
    <View className={cn('gap-2', className)}>
      {label ? <Text className="px-1 type-subhead text-text-muted">{label}</Text> : null}
      <View
        className={cn(
          'flex-row items-center rounded-md border-2 bg-surface-card px-4',
          error ? 'border-danger-text' : 'border-border-control',
          !editable && 'opacity-40',
        )}
        style={{ minHeight: large ? size.controlH + 8 : size.controlH }}
      >
        <TextInput
          ref={ref}
          editable={editable}
          placeholderTextColor={c.textSubtle}
          accessibilityLabel={label}
          className={cn('flex-1 text-text', large ? 'type-stat' : 'type-body')}
          {...p}
        />
        {unit ? <Text className="ml-2 type-label text-text-muted">{unit}</Text> : null}
      </View>
      {error ? <Text className="px-1 type-caption text-danger-text">{error}</Text> : null}
    </View>
  );
});

/** Formats a number for a field: trims trailing zeros, max `decimals`. */
export function formatNumber(n: number | null, decimals = 1): string {
  if (n === null || !Number.isFinite(n)) return '';
  return String(Number(n.toFixed(decimals)));
}

/** Parses a field's text as a number, or null when empty or invalid. */
export function parseNumber(text: string): number | null {
  const t = text.replace(',', '.').trim();
  if (t === '' || t === '-' || t === '.') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Number input. Keeps the raw text the user typed and reports the parsed value.
 * Pass `text`/`onChangeText` from state so partial input like "20." survives re-renders.
 */
export function NumericField({ allowNegative, ...p }: FieldProps & { allowNegative?: boolean }) {
  return (
    <TextField
      large
      keyboardType={allowNegative ? 'numbers-and-punctuation' : 'decimal-pad'}
      inputMode="decimal"
      returnKeyType="done"
      {...p}
    />
  );
}

/* ---------------- Chip ---------------- */

/** Selectable pill (filters, single-choice options). */
export function Chip({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ checked: !!selected, disabled: !!disabled }}
      className={cn(
        'items-center justify-center rounded-pill px-5',
        selected ? 'bg-primary-fill' : 'bg-surface-card shadow-card active:bg-surface-control',
        disabled && 'opacity-40',
      )}
      style={{ minHeight: size.controlHSm }}
    >
      <Text className={cn('type-label', selected ? 'text-on-primary' : 'text-text')}>{label}</Text>
    </Pressable>
  );
}

/* ---------------- Toggle ---------------- */

/** On/off switch in token colors. Always pair with a visible label. */
export function Toggle(p: SwitchProps) {
  const { c } = useTheme();
  return (
    <Switch
      trackColor={{ false: c.borderControl, true: c.successFill }}
      thumbColor={c.surfaceCard}
      ios_backgroundColor={c.borderControl}
      {...p}
    />
  );
}
