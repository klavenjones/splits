import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { size } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { cn } from './cn';
import { ExerciseThumbnail } from './exercises';
import { Icon } from './Icon';
import { Button, Card, MicroLabel } from './primitives';

/* ---------------- WorkoutStats ---------------- */

/** ELAPSED · VOLUME · EXERCISES band at the top of the logger. */
export function WorkoutStats({ stats }: { stats: { value: string; label: string }[] }) {
  return (
    <View className="flex-row rounded-card bg-surface-inset px-5 py-4">
      {stats.map((s) => (
        <View
          key={s.label}
          className="flex-1 gap-0.5"
          accessible
          accessibilityLabel={`${s.label}: ${s.value}`}
        >
          <Text className="font-display text-[26px] leading-[30px] tracking-[-0.4px] text-text tabular-nums">
            {s.value}
          </Text>
          <MicroLabel>{s.label}</MicroLabel>
        </View>
      ))}
    </View>
  );
}

/* ---------------- SyncBadge ---------------- */

export type SyncStatus = 'synced' | 'saving' | 'local';

const SYNC_TEXT: Record<SyncStatus, string> = {
  synced: 'synced',
  saving: 'syncing…',
  local: 'saved on this phone',
};

/** Where the workout's data is: on this phone only, syncing, or synced. */
export function SyncBadge({ status, detail }: { status: SyncStatus; detail?: string }) {
  return (
    <View
      className="flex-row items-center gap-1.5"
      accessible
      accessibilityLabel={`${SYNC_TEXT[status]}${detail ? `, ${detail}` : ''}`}
    >
      <View
        className={cn(
          'h-2 w-2 rounded-pill',
          status === 'synced'
            ? 'bg-success-fill'
            : status === 'saving'
              ? 'bg-info-fill'
              : 'bg-warning-fill',
        )}
      />
      <Text className="type-caption text-text-muted">
        {SYNC_TEXT[status]}
        {detail ? ` · ${detail}` : ''}
      </Text>
    </View>
  );
}

/* ---------------- LoggerExerciseCard ---------------- */

/** One exercise in the logger: thumbnail (opens the demo), name, targets, swap, set rows, add set. */
export function LoggerExerciseCard({
  name,
  primaryMuscle,
  subtitle,
  unit,
  onDemo,
  onSwap,
  onAddSet,
  children,
}: {
  name: string;
  primaryMuscle: string | null;
  subtitle: string;
  unit: string;
  onDemo: () => void;
  onSwap: () => void;
  onAddSet: () => void;
  children: ReactNode;
}) {
  const { c } = useTheme();
  return (
    <Card padding="px-3 pt-4 pb-2" className="gap-3">
      <View className="flex-row items-center gap-3 px-2">
        <Pressable
          onPress={onDemo}
          accessibilityRole="button"
          accessibilityLabel={`How to do ${name}`}
          className="active:opacity-70"
        >
          <ExerciseThumbnail primaryMuscle={primaryMuscle} dim={size.touchMin + 4} />
        </Pressable>
        <View className="flex-1">
          <Text className="type-headline text-text" numberOfLines={2}>
            {name}
          </Text>
          <Text className="type-caption text-text-muted" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <Button variant="secondary" size="sm" icon="swap" onPress={onSwap}>
          swap
        </Button>
      </View>
      <View className="flex-row items-center gap-1.5 px-2">
        <MicroLabel className="w-9 text-center">set</MicroLabel>
        <MicroLabel className="flex-1">previous</MicroLabel>
        <MicroLabel className="w-[72px] text-center">{unit}</MicroLabel>
        <MicroLabel className="w-[60px] text-center">reps</MicroLabel>
        <View className="w-11" />
      </View>
      <View>{children}</View>
      <Pressable
        onPress={onAddSet}
        accessibilityRole="button"
        accessibilityLabel={`Add a set of ${name}`}
        className="flex-row items-center gap-2 self-start rounded-pill px-3 py-2.5 active:bg-surface-control"
      >
        <Icon name="plus" size={size.iconMd} color={c.text} />
        <Text className="type-label text-text">add set</Text>
      </Pressable>
    </Card>
  );
}

/* ---------------- ResumeBar ---------------- */

/** "workout in progress · 24:18 · resume", above the tab bar while the logger is closed. */
export function ResumeBar({
  name,
  elapsed,
  onPress,
}: {
  name: string;
  elapsed: string;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name} in progress, ${elapsed}. Resume`}
      className="flex-row items-center gap-3 rounded-card bg-anchor-card px-4 py-3 shadow-float active:opacity-90"
    >
      <View className="h-2.5 w-2.5 rounded-pill bg-lift-fill" />
      <View className="flex-1">
        <Text className="type-caption text-on-anchor-muted">in progress · {elapsed}</Text>
        <Text className="type-headline text-on-anchor" numberOfLines={1}>
          {name}
        </Text>
      </View>
      <Text className="type-label text-on-anchor">resume</Text>
      <Icon name="chevron-right" size={size.iconMd} color={c.onAnchor} />
    </Pressable>
  );
}

/* ---------------- Summary ---------------- */

/** The red "workout complete" card: volume, sets, PRs. */
export function SummaryHero({
  volume,
  unit,
  sets,
  prs,
  footer,
}: {
  volume: string;
  unit: string;
  sets: number;
  prs: number;
  footer: string;
}) {
  const { c } = useTheme();
  return (
    <View className="gap-4 rounded-card bg-lift-fill p-5 shadow-card">
      <View className="flex-row items-center justify-between">
        <Text className="font-display-bold text-[22px] leading-[26px] text-on-lift">splits</Text>
        <Text className="type-micro text-on-lift">workout complete</Text>
      </View>
      <View className="flex-row flex-wrap items-baseline gap-x-2">
        <Text className="shrink type-hero text-on-lift" numberOfLines={1} adjustsFontSizeToFit>
          {volume}
        </Text>
        <Text className="type-body-strong text-on-lift">{unit} volume</Text>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1 gap-0.5 rounded-md border-[1.5px] border-on-lift px-4 py-3">
          <Text className="font-display text-[28px] leading-[32px] text-on-lift tabular-nums">
            {sets}
          </Text>
          <Text className="type-micro text-on-lift">sets</Text>
        </View>
        <View className="flex-1 flex-row items-center gap-2 rounded-md bg-surface-card px-4 py-3">
          <Icon name="trophy" size={size.iconMd} color={c.liftText} />
          <View className="gap-0.5">
            <Text className="font-display text-[28px] leading-[32px] text-lift-text tabular-nums">
              {prs}
            </Text>
            <Text className="type-micro text-lift-text">{prs === 1 ? 'pr' : 'prs'}</Text>
          </View>
        </View>
      </View>
      <Text className="type-caption text-on-lift">{footer}</Text>
    </View>
  );
}

/** A personal record: the new best set, what it beat (or when), and the estimated 1RM. */
export function PRCard({
  name,
  best,
  was,
  when,
  e1rm,
}: {
  name: string;
  best: string;
  was?: string;
  /** "today", "Mon"… shown instead of what it beat (Progress). */
  when?: string;
  e1rm: string;
}) {
  const { c } = useTheme();
  return (
    <Card className="gap-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1 rounded-pill bg-lift-fill px-2.5 py-1">
          <Icon name="trophy" size={13} color={c.onLift} />
          <Text className="font-body-bold text-[11px] leading-[14px] tracking-[0.9px] text-on-lift uppercase">
            pr
          </Text>
        </View>
        <Text className="type-caption text-text-muted">{when ?? (was ? `was ${was}` : '')}</Text>
      </View>
      <Text className="type-headline text-text">{name}</Text>
      <View className="flex-row items-baseline justify-between">
        <Text className="type-stat text-text">{best}</Text>
        <Text className="type-label text-lift-text">est. 1RM {e1rm}</Text>
      </View>
    </Card>
  );
}
