import { Pressable, Text, View } from 'react-native';

import { size } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { cn } from './cn';
import { Icon } from './Icon';
import { Button, Card, MicroLabel, Tag } from './primitives';
import { DashedBar } from './week';

export type TargetState = 'on_target' | 'faster' | 'slower' | 'none';
type Stat = { value: string; label: string };

const STATE_TEXT: Record<Exclude<TargetState, 'none'>, string> = {
  on_target: 'on target',
  faster: 'faster than target',
  slower: 'slower than target',
};

/* ---------------- OnTargetBadge ---------------- */

/** How a run went against its target, always in words: "on target", "faster than target"… */
export function OnTargetBadge({ state, solid }: { state: TargetState; solid?: boolean }) {
  const { c } = useTheme();
  if (state === 'none') return null;
  const on = state === 'on_target';
  return (
    <View
      className={cn(
        'flex-row items-center gap-1.5 self-start rounded-pill px-3 py-1',
        solid ? 'bg-run-fill' : on ? 'bg-run-soft' : 'bg-warning-soft',
      )}
    >
      <Icon
        name={solid ? 'run' : on ? 'check' : 'info'}
        size={14}
        color={solid ? c.onRun : on ? c.runText : c.warningText}
      />
      <Text
        className={cn(
          solid ? 'type-micro text-on-run' : 'type-label',
          !solid && (on ? 'text-run-text' : 'text-warning-text'),
        )}
      >
        {STATE_TEXT[state]}
      </Text>
    </View>
  );
}

function StatRow({ stats, large }: { stats: Stat[]; large?: boolean }) {
  return (
    <View className={cn('flex-row', large ? 'justify-around' : 'gap-8')}>
      {stats.map((m) => (
        <View
          key={m.label}
          className={cn('gap-0.5', large && 'items-center')}
          accessible
          accessibilityLabel={`${m.label}: ${m.value}`}
        >
          <Text className="font-display text-[26px] leading-[30px] tracking-[-0.4px] text-text tabular-nums">
            {m.value}
          </Text>
          <MicroLabel>{m.label}</MicroLabel>
        </View>
      ))}
    </View>
  );
}

/* ---------------- RunResultCard ---------------- */

/** An imported run on Today: how it matched, distance / time / pace, on target, view run. */
export function RunResultCard({
  title,
  matchLabel,
  stats,
  source,
  state = 'none',
  onPress,
}: {
  title: string;
  matchLabel: string | null;
  stats: Stat[];
  source: string;
  state?: TargetState;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Card padding="pl-4 pr-5 pt-4 pb-5" className="flex-row gap-4">
      <View className="w-2 self-stretch rounded-pill bg-run-fill" />
      <View className="flex-1 gap-3 pt-1">
        <View className="flex-row items-center justify-between gap-2">
          <Tag kind="run" size="sm" />
          {matchLabel ? (
            <View className="shrink flex-row items-center gap-1">
              <Icon name="check" size={16} color={c.runText} />
              <Text className="shrink type-caption text-run-text" numberOfLines={1}>
                {matchLabel}
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="font-display text-[22px] leading-[26px] tracking-[-0.4px] text-text">
          {title}
        </Text>
        <StatRow stats={stats} />
        <View className="gap-2">
          <Text className="type-caption text-text-muted">{source}</Text>
          <OnTargetBadge state={state} />
        </View>
        <Button variant="secondary" size="md" block onPress={onPress}>
          view run
        </Button>
      </View>
    </Card>
  );
}

/* ---------------- MatchCard ---------------- */

/** An imported run with no planned session: "needs a match" and "link to a session". */
export function MatchCard({
  title,
  source,
  onLink,
  onPress,
}: {
  title: string;
  source: string;
  onLink: () => void;
  onPress?: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole="button">
      <Card padding="pl-4 pr-5 pt-4 pb-5" className="flex-row gap-4">
        <DashedBar className="bg-run-text" />
        <View className="flex-1 gap-3 pt-1">
          <View className="flex-row items-center justify-between">
            <Tag kind="run" size="sm" />
            <View className="flex-row items-center gap-1">
              <Icon name="alert" size={16} color={c.warningText} />
              <Text className="type-caption text-warning-text">needs a match</Text>
            </View>
          </View>
          <Text className="font-display text-[22px] leading-[26px] tracking-[-0.4px] text-text">
            {title}
          </Text>
          <Text className="type-body text-text-muted">
            We couldn’t match this to a planned run. It still counts toward your weekly distance.
          </Text>
          <Text className="type-caption text-text-muted">{source}</Text>
          <Button variant="run" size="md" icon="plus" block onPress={onLink}>
            link to a session
          </Button>
        </View>
      </Card>
    </Pressable>
  );
}

/* ---------------- PaceHero ---------------- */

/** Run detail's big card: average pace against target, then distance, time, heart rate. */
export function PaceHero({
  pace,
  unit,
  caption,
  stats,
}: {
  pace: string;
  unit: string;
  caption: string | null;
  stats: Stat[];
}) {
  const { c } = useTheme();
  return (
    <Card padding="p-0">
      <View className="gap-1 p-5">
        <View className="flex-row items-baseline" accessible accessibilityLabel={`${pace} ${unit}`}>
          <Text className="type-hero text-text" numberOfLines={1} adjustsFontSizeToFit>
            {pace}
          </Text>
          <Text className="ml-1 type-body-strong text-text-muted">{unit}</Text>
        </View>
        <View className="mt-2 flex-row items-center gap-1.5">
          <Icon name="run" size={size.iconSm} color={c.runText} />
          <Text className="type-micro text-run-text">run</Text>
        </View>
        <Text className="type-headline text-text">average pace</Text>
        {caption ? <Text className="type-subhead text-text-muted">{caption}</Text> : null}
      </View>
      <View className="rounded-b-card bg-surface-inset px-5 py-4">
        <StatRow stats={stats} large />
      </View>
    </Card>
  );
}

/* ---------------- SplitTable ---------------- */

export type SplitRowData = {
  index: number;
  pace: string;
  /** Pace against the target: −1 (much faster) … 1 (much slower); null without a target. */
  relative: number | null;
  hr: string;
  delta: { delta: string; word: string } | null;
  partial?: string;
};

function SplitBar({ relative }: { relative: number }) {
  // The marker is the target; the bar reaches further right the faster the split.
  const reach = Math.max(0.06, Math.min(1, 0.5 - relative / 2));
  return (
    <View className="h-1.5 w-20 rounded-pill bg-track">
      <View
        className={cn('h-1.5 rounded-pill', relative <= 0 ? 'bg-run-fill' : 'bg-text-muted')}
        style={{ width: `${reach * 100}%` }}
      />
      <View className="absolute top-[-3px] left-1/2 h-3 w-0.5 rounded-pill bg-text" />
    </View>
  );
}

/** Per-mile (or km) splits: pace with a bar against the target, heart rate, and the difference. */
export function SplitTable({
  unit,
  caption,
  rows,
}: {
  unit: string;
  caption: string | null;
  rows: SplitRowData[];
}) {
  return (
    <Card className="gap-3">
      <Text className="type-headline text-text" accessibilityRole="header">
        splits
      </Text>
      {caption ? <Text className="type-subhead text-text-muted">{caption}</Text> : null}
      <View className="flex-row items-center gap-3 border-b border-hairline pb-2">
        <MicroLabel className="w-8">{unit}</MicroLabel>
        <MicroLabel className="w-20">pace</MicroLabel>
        <MicroLabel className="w-10">hr</MicroLabel>
        <MicroLabel className="flex-1 text-right">vs target</MicroLabel>
      </View>
      {rows.map((r, i) => (
        <View
          key={r.index}
          className={cn(
            'flex-row items-center gap-3 py-2',
            i < rows.length - 1 && 'border-b border-hairline',
          )}
          accessible
          accessibilityLabel={`${unit} ${r.index}${r.partial ? `, ${r.partial}` : ''}: ${r.pace}${r.hr !== '–' ? `, heart rate ${r.hr}` : ''}${r.delta ? `, ${r.delta.delta} ${r.delta.word}` : ''}`}
        >
          <View className="w-8">
            <Text className="type-body text-text-muted tabular-nums">{r.index}</Text>
          </View>
          <View className="w-20 gap-1.5">
            <Text className="type-headline text-text tabular-nums">{r.pace}</Text>
            {r.relative !== null ? <SplitBar relative={r.relative} /> : null}
            {r.partial ? <Text className="type-caption text-text-muted">{r.partial}</Text> : null}
          </View>
          <Text className="w-10 type-body text-text-muted tabular-nums">{r.hr}</Text>
          <View className="flex-1 flex-row flex-wrap items-baseline justify-end gap-x-1">
            {r.delta ? (
              <>
                <Text className="type-label text-text">{r.delta.delta}</Text>
                <Text className="type-caption text-text-muted">{r.delta.word}</Text>
              </>
            ) : null}
          </View>
        </View>
      ))}
    </Card>
  );
}
