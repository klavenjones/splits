import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { rowSubtitle } from '../exercises/describe';
import type { LiftItem } from '../templates/liftTemplate';
import { repsText } from '../templates/liftTemplate';
import type { Segment, SegmentType, ShapeBar } from '../templates/runSegments';
import { segmentSummary } from '../templates/runSegments';
import { size } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { formatDuration, type UnitSystem } from '../units';
import { cn } from './cn';
import { Stepper } from './controls';
import { ExerciseThumbnail } from './exercises';
import { Icon } from './Icon';
import { Tag } from './primitives';
import { DragHandle } from './SortableList';

/* ---------------- TemplateCard ---------------- */

/** Library card: kind color bar, LIFT/RUN tag, ··· menu, name, meta line. */
export function TemplateCard({
  kind,
  name,
  meta,
  onPress,
  onMenu,
}: {
  kind: 'lift' | 'run';
  name: string;
  meta: string;
  onPress: () => void;
  onMenu: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${kind} template, ${meta}`}
      className="flex-1 flex-row overflow-hidden rounded-card bg-surface-card shadow-card active:bg-surface-inset"
    >
      <View className={cn('w-1.5', kind === 'lift' ? 'bg-lift-fill' : 'bg-run-fill')} />
      <View className="flex-1 gap-2 py-4 pr-2 pl-4">
        <View className="flex-row items-center justify-between">
          <Tag kind={kind} size="sm" />
          <Pressable
            onPress={onMenu}
            accessibilityRole="button"
            accessibilityLabel={`${name} options`}
            hitSlop={8}
            className="h-8 w-8 items-center justify-center rounded-pill active:bg-surface-control"
          >
            <Icon name="more" size={size.iconMd} color={c.textMuted} strokeWidth={3} />
          </Pressable>
        </View>
        <Text className="type-headline text-text" numberOfLines={2}>
          {name}
        </Text>
        <Text className="type-caption text-text-muted" numberOfLines={1}>
          {meta}
        </Text>
      </View>
    </Pressable>
  );
}

/* ---------------- Lift builder ---------------- */

function TargetTile({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${value}`}
      className="flex-1 gap-0.5 rounded-md border border-hairline bg-surface-inset px-3 py-2 active:bg-surface-control"
    >
      <Text className="type-micro text-text-muted">{label}</Text>
      <Text className="type-headline text-text">{value}</Text>
    </Pressable>
  );
}

/** One exercise in a lift template: handle, glyph, name, ··· menu, and SETS / REPS / REST tiles. */
export function LiftExerciseCard({
  item,
  rest,
  onEdit,
  onMenu,
}: {
  item: LiftItem;
  /** Rest shown on the tile; null = "none" (inside a superset, before the last exercise). */
  rest: number | null;
  onEdit: () => void;
  onMenu: () => void;
}) {
  const { c } = useTheme();
  return (
    <View className="gap-3 rounded-card bg-surface-card p-4 shadow-card">
      <View className="flex-row items-center gap-3">
        <DragHandle label={`Reorder ${item.name}`} />
        <ExerciseThumbnail primaryMuscle={item.primary_muscle} dim={size.touchMin + 4} />
        <View className="flex-1">
          <Text className="type-headline text-text" numberOfLines={2}>
            {item.name}
          </Text>
          <Text className="type-subhead text-text-muted" numberOfLines={1}>
            {rowSubtitle(item)}
          </Text>
        </View>
        <Pressable
          onPress={onMenu}
          accessibilityRole="button"
          accessibilityLabel={`${item.name} options`}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-pill active:bg-surface-control"
        >
          <Icon name="more" size={size.iconMd} color={c.textMuted} strokeWidth={3} />
        </Pressable>
      </View>
      <View className="flex-row gap-2">
        <TargetTile label="sets" value={String(item.target_sets)} onPress={onEdit} />
        <TargetTile label="reps" value={repsText(item)} onPress={onEdit} />
        <TargetTile label="rest" value={rest ? formatDuration(rest) : 'none'} onPress={onEdit} />
      </View>
    </View>
  );
}

/** Pink superset block: pill, "alternate sets, rest after both", and its exercises. */
export function SupersetBlock({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  return (
    <View className="gap-3 rounded-card bg-lift-soft p-3">
      <View className="flex-row flex-wrap items-center gap-2 pt-1 pr-1">
        <DragHandle label="Reorder superset" />
        <View className="flex-row items-center gap-1.5 rounded-pill bg-lift-fill px-3 py-1">
          <Icon name="lift" size={size.iconSm} color={c.onLift} />
          <Text className="type-micro text-on-lift">superset</Text>
        </View>
        <Text className="type-label text-lift-text">alternate sets, rest after both</Text>
      </View>
      {children}
    </View>
  );
}

/* ---------------- Run builder ---------------- */

const PILL: Record<SegmentType, string> = {
  warmup: 'bg-run-fill opacity-55',
  cooldown: 'bg-run-fill opacity-55',
  steady: 'bg-run-fill opacity-80',
  interval: 'bg-run-fill',
  recovery: 'border-2 border-run-fill bg-run-soft',
};

/** A run segment row: handle, color pill, name, summary, chevron. */
export function SegmentRow({
  segment,
  units,
  onPress,
  nested,
  invalid,
}: {
  segment: Segment;
  units: UnitSystem;
  onPress: () => void;
  nested?: boolean;
  invalid?: boolean;
}) {
  const { c } = useTheme();
  const summary = segmentSummary(segment, units);
  return (
    <View
      className={cn(
        'flex-row items-center gap-2 rounded-card bg-surface-card py-3 pr-3 shadow-card',
        nested ? 'pl-1' : 'pl-2',
        invalid && 'border-2 border-danger-text',
      )}
    >
      <DragHandle label={`Reorder ${segment.segment_type}`} />
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${segment.segment_type}, ${summary}. Edit`}
        className="flex-1 flex-row items-center gap-3 active:opacity-70"
      >
        <View className={cn('h-8 w-2 rounded-pill', PILL[segment.segment_type])} />
        <View className="flex-1">
          <Text className="type-headline text-text">{segment.segment_type}</Text>
          <Text
            className={cn('type-subhead', invalid ? 'text-danger-text' : 'text-text-muted')}
            numberOfLines={1}
          >
            {invalid ? 'needs a measure or target' : summary}
          </Text>
        </View>
        <Icon name="chevron-right" size={size.iconMd} color={c.textMuted} />
      </Pressable>
    </View>
  );
}

/** Light-blue repeat block: handle, "repeat", × stepper, its segments, and "+ add to repeat". */
export function RepeatBlock({
  repeats,
  onRepeats,
  onAdd,
  children,
}: {
  repeats: number;
  onRepeats: (n: number) => void;
  onAdd: () => void;
  children: ReactNode;
}) {
  const { c } = useTheme();
  return (
    <View className="gap-3 rounded-card bg-run-soft p-3">
      <View className="flex-row items-center gap-2">
        <DragHandle label="Reorder repeat block" />
        <Icon name="repeat" size={size.iconMd} color={c.runText} />
        <Text className="flex-1 type-headline text-run-text">repeat</Text>
        <Icon name="x" size={size.iconSm} color={c.runText} strokeWidth={2.5} />
        <Stepper value={repeats} onChange={onRepeats} min={1} max={50} label="Repeats" compact />
      </View>
      {children}
      <Pressable
        onPress={onAdd}
        accessibilityRole="button"
        className="flex-row items-center justify-center gap-2 rounded-pill py-2 active:bg-surface-control"
      >
        <Icon name="plus" size={size.iconMd} color={c.runText} />
        <Text className="type-label text-run-text">add to repeat</Text>
      </Pressable>
    </View>
  );
}

/** Workout shape: one bar per segment in running order, width by time, height by intensity. */
export function WorkoutShape({ bars, caption }: { bars: ShapeBar[]; caption: string }) {
  const HEIGHT = size.fabSize + size.touchMin; // 108
  return (
    <View
      className="gap-3 rounded-card bg-surface-card p-4 shadow-card"
      accessible
      accessibilityLabel={`Workout shape: ${caption}`}
    >
      <View className="flex-row items-end gap-1" style={{ height: HEIGHT }}>
        {bars.map((b) => (
          <View
            key={b.key}
            className={cn(
              'rounded-t-xs',
              b.segment_type === 'recovery'
                ? 'border-2 border-run-fill bg-run-soft'
                : b.segment_type === 'interval' || b.segment_type === 'steady'
                  ? 'bg-run-fill'
                  : 'bg-run-fill opacity-55',
            )}
            style={{ flexGrow: b.width, flexBasis: 0, height: Math.max(8, b.intensity * HEIGHT) }}
          />
        ))}
      </View>
      <Text className="type-subhead text-text-muted">{caption}</Text>
    </View>
  );
}
