import { useEffect, useState } from 'react';
import { Text, View, Pressable, TextInput } from 'react-native';
import { BlurView } from 'expo-blur';
import { cn } from './cn';
import { Icon } from './Icon';
import { Card, MicroLabel, Tag, KIND_ICON, KIND_LABEL, type Kind } from './primitives';
import { useTheme } from '../theme/useTheme';
import { blur } from '../theme/tokens';

const KIND_TEXT: Record<Kind, string> = {
  run: 'text-run-text',
  lift: 'text-lift-text',
  fuel: 'text-fuel-text',
  body: 'text-body-text',
};
const KIND_TEXT_KEY = {
  run: 'runText',
  lift: 'liftText',
  fuel: 'fuelText',
  body: 'bodyText',
} as const;
const KIND_FILL: Record<Kind, string> = {
  run: 'bg-run-fill',
  lift: 'bg-lift-fill',
  fuel: 'bg-fuel-fill',
  body: 'bg-body-fill',
};
const KIND_BORDER: Record<Kind, string> = {
  run: 'border-run-text',
  lift: 'border-lift-fill',
  fuel: 'border-fuel-fill',
  body: 'border-body-fill',
};

/* ---------------- HeroStat ---------------- */
export type HeroStatProps = {
  value?: string;
  unit?: string;
  label: string;
  sublabel?: string;
  kind?: Kind;
  size?: 'hero' | 'hero-sm';
  stats?: { value?: string; label: string }[];
  empty?: boolean;
};

/** A card whose job is one giant number with a small label beside it, plus an optional band of up to 3 stats. */
export function HeroStat({
  value,
  unit,
  label,
  sublabel,
  kind,
  size = 'hero',
  stats,
  empty,
}: HeroStatProps) {
  const { c } = useTheme();
  const isEmpty = empty || value == null;
  return (
    <Card padding="p-0" className="overflow-hidden">
      <View
        className="flex-row items-center gap-4 px-5 py-6"
        accessible
        accessibilityLabel={`${isEmpty ? 0 : value} ${unit ?? ''} ${label}`}
      >
        <View className="flex-row items-baseline">
          <Text
            className={cn(
              size === 'hero' ? 'type-hero' : 'type-hero-sm',
              isEmpty ? 'text-text-disabled' : 'text-text',
            )}
          >
            {isEmpty ? '0' : value}
          </Text>
          {unit ? <Text className="ml-1 type-body-strong text-text-muted">{unit}</Text> : null}
        </View>
        <View className="flex-1 gap-0.5">
          {kind ? (
            <View className="flex-row items-center gap-1">
              <Icon name={KIND_ICON[kind]} size={16} color={c[KIND_TEXT_KEY[kind]]} />
              <Text className={cn('type-micro', KIND_TEXT[kind])}>{KIND_LABEL[kind]}</Text>
            </View>
          ) : null}
          <Text className="font-display text-[20px] leading-[22px] text-text">{label}</Text>
          {sublabel ? <Text className="type-subhead text-text-muted">{sublabel}</Text> : null}
        </View>
      </View>
      {stats ? (
        <View className="flex-row bg-surface-inset px-5 py-4">
          {stats.map((s) => (
            <View key={s.label} className="flex-1 items-center gap-0.5">
              <Text className="font-display text-[22px] leading-[26px] tracking-[-0.4px] text-text tabular-nums">
                {s.value ?? '–'}
              </Text>
              <MicroLabel>{s.label}</MicroLabel>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

/* ---------------- SessionCard ---------------- */
type Status = 'planned' | 'current' | 'done' | 'missed';

/** Planned or finished session, marked by a plate standing up on its left edge: solid = done, dashed = planned. */
export function SessionCard({
  kind,
  title,
  subtitle,
  status = 'planned',
  meta,
  action,
  onPress,
}: {
  kind: Kind;
  title: string;
  subtitle?: string;
  status?: Status;
  meta?: { value: string; label: string }[];
  action?: React.ReactNode;
  onPress?: () => void;
}) {
  const { c } = useTheme();
  const muted = status === 'done' || status === 'missed';
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="active:scale-[0.98]"
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <Card padding="pl-4 pr-5 pt-4 pb-5" className="flex-row gap-4">
        <View
          className={cn(
            'w-2 self-stretch rounded-pill',
            status === 'done' && KIND_FILL[kind],
            (status === 'planned' || status === 'current') &&
              cn('border-2 border-dashed', KIND_BORDER[kind]),
            status === 'missed' && 'border-2 border-border-control bg-track',
          )}
        />
        <View className="flex-1 pt-1">
          <View className="flex-row items-center justify-between">
            <Tag kind={kind} size="sm" />
            {status === 'done' ? (
              <View className="flex-row items-center gap-1">
                <Icon name="check" size={16} color={c.successText} />
                <Text className="type-caption text-success-text">done</Text>
              </View>
            ) : status === 'missed' ? (
              <View className="flex-row items-center gap-1">
                <Icon name="alert" size={16} color={c.warningText} />
                <Text className="type-caption text-warning-text">missed</Text>
              </View>
            ) : status === 'current' ? (
              <View className="flex-row items-center gap-1.5">
                <View className="h-2 w-2 rounded-pill bg-lift-fill" />
                <Text className="type-caption text-text">in progress</Text>
              </View>
            ) : (
              <Text className="type-caption text-text-muted">planned</Text>
            )}
          </View>
          <Text
            className={cn(
              'mt-3 font-display text-[22px] leading-[26px] tracking-[-0.4px]',
              muted ? 'text-text-muted' : 'text-text',
            )}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text className="mt-0.5 type-subhead text-text-muted">{subtitle}</Text>
          ) : null}
          {meta ? (
            <View className="mt-4 flex-row gap-6">
              {meta.map((m) => (
                <View key={m.label} className="gap-0.5">
                  <Text className="font-display text-[22px] leading-[26px] tracking-[-0.4px] text-text tabular-nums">
                    {m.value}
                  </Text>
                  <MicroLabel>{m.label}</MicroLabel>
                </View>
              ))}
            </View>
          ) : null}
          {action ? <View className="mt-4">{action}</View> : null}
        </View>
      </Card>
    </Pressable>
  );
}

/* ---------------- PlateRack ---------------- */
export type RackDay = { label: string; date?: number; sessions: { kind: Kind; done: boolean }[] };
const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** The week strip: each day stacks one small plate per session. Solid = done, dashed = planned, grey bar = rest. */
export function PlateRack({
  days,
  today,
  streak,
  title = 'this week',
  onSelect,
}: {
  days: RackDay[];
  today: number;
  streak?: number;
  title?: string;
  onSelect?: (i: number) => void;
}) {
  const { c } = useTheme();
  const [sel, setSel] = useState(today);
  return (
    <Card padding="px-3 pt-5 pb-3">
      <View className="flex-row items-center justify-between px-2 pb-3">
        <Text
          className="font-display-bold text-[20px] leading-[24px] text-text"
          accessibilityRole="header"
        >
          {title}
        </Text>
        {streak != null ? (
          <View
            className="flex-row items-center gap-1"
            accessible
            accessibilityLabel={`${streak} day streak`}
          >
            <Icon name="flame" size={22} color={c.liftText} />
            <Text className="font-display text-[20px] leading-[24px] text-text tabular-nums">
              {streak}
            </Text>
          </View>
        ) : null}
      </View>
      <View className="flex-row" accessibilityRole="tablist">
        {LETTERS.map((d, i) => {
          const day = days[i] ?? { label: d, sessions: [] };
          const isToday = i === today;
          const summary = day.sessions.length
            ? day.sessions.map((s) => `${s.done ? 'done' : 'planned'} ${s.kind}`).join(', ')
            : 'rest day';
          return (
            <Pressable
              key={i}
              accessibilityRole="tab"
              accessibilityState={{ selected: sel === i }}
              accessibilityLabel={`${day.label}${isToday ? ', today' : ''}: ${summary}`}
              onPress={() => {
                setSel(i);
                onSelect?.(i);
              }}
              className={cn(
                'min-h-24 flex-1 items-center justify-end gap-1.5 rounded-md py-2',
                isToday && 'border-[1.5px] border-hairline bg-surface-inset',
                sel === i && !isToday && 'bg-surface-control',
              )}
            >
              <View
                className="min-h-13 items-center justify-start gap-[3px]"
                style={{ flexDirection: 'column-reverse' }}
              >
                {day.sessions.length === 0 ? (
                  <View className="h-1 w-4 rounded-pill bg-track" />
                ) : (
                  day.sessions.map((s, j) => (
                    <View
                      key={j}
                      className={cn(
                        'h-3 w-8 rounded-[4px]',
                        s.done
                          ? KIND_FILL[s.kind]
                          : cn('border-2 border-dashed', KIND_BORDER[s.kind]),
                      )}
                    />
                  ))
                )}
              </View>
              <Text
                className={cn(
                  'text-label',
                  i > today ? 'font-body-medium text-text-muted' : 'font-body-bold text-text',
                )}
              >
                {d}
              </Text>
              {day.date != null ? (
                <View className={cn('rounded-pill px-1.5 py-0.5', isToday && 'bg-primary-fill')}>
                  <Text
                    className={cn(
                      'font-body-bold text-micro tabular-nums',
                      isToday ? 'text-on-primary' : 'text-text-muted',
                    )}
                  >
                    {day.date}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

/* ---------------- SetRow ---------------- */
export type SetRowProps = {
  index?: number;
  warmup?: boolean;
  previous?: string;
  weight?: string;
  reps?: string;
  unit?: string;
  state?: 'upcoming' | 'current' | 'completed';
  pr?: boolean;
  onToggle?: (done: boolean) => void;
};

/** One set in the lift logger: set number, previous, weight, reps, done checkbox. */
export function SetRow({
  index,
  warmup,
  previous,
  weight = '',
  reps = '',
  unit = 'lb',
  state = 'upcoming',
  pr,
  onToggle,
}: SetRowProps) {
  const { c } = useTheme();
  const [w, setW] = useState(weight);
  const [r, setR] = useState(reps);
  const [done, setDone] = useState(state === 'completed');
  const s = done ? 'completed' : state === 'completed' ? 'current' : state;
  const cur = s === 'current';
  return (
    <View
      className={cn(
        'min-h-12 flex-row items-center gap-1 rounded-sm px-2',
        s === 'completed' && 'bg-success-soft',
        cur && 'bg-lift-soft',
      )}
    >
      <View className="w-10 items-center">
        <View
          className={cn(
            'h-7 w-7 items-center justify-center rounded-pill',
            warmup
              ? 'bg-warning-soft'
              : s === 'completed'
                ? 'bg-success-fill'
                : cur
                  ? 'bg-lift-fill'
                  : 'border-[1.5px] border-border-control',
          )}
        >
          <Text
            className={cn(
              'font-body-bold tabular-nums',
              warmup ? 'text-caption' : 'text-label',
              warmup
                ? 'text-warning-text'
                : s === 'completed'
                  ? 'text-on-success'
                  : cur
                    ? 'text-on-lift'
                    : 'text-text-muted',
            )}
          >
            {warmup ? 'W' : index}
          </Text>
        </View>
      </View>
      <View className="flex-1 flex-row items-center gap-1.5">
        <Text
          numberOfLines={1}
          className="font-body-medium text-label text-text-subtle tabular-nums"
        >
          {previous ?? '–'}
        </Text>
        {pr && done ? (
          <View
            className="h-5.5 w-5.5 items-center justify-center rounded-pill bg-lift-fill"
            accessibilityLabel="Personal record"
          >
            <Icon name="trophy" size={13} color={c.onLift} />
          </View>
        ) : null}
      </View>
      {cur ? (
        <>
          <TextInput
            value={w}
            onChangeText={setW}
            keyboardType="decimal-pad"
            accessibilityLabel={`Weight, ${unit}`}
            className="h-10 w-[72px] rounded-sm border-2 border-lift-text bg-surface-card text-center font-body-semibold text-[17px] leading-[22px] text-text tabular-nums"
          />
          <TextInput
            value={r}
            onChangeText={setR}
            keyboardType="number-pad"
            accessibilityLabel="Reps"
            className="h-10 w-[60px] rounded-sm border-[1.5px] border-border-control bg-surface-card text-center font-body-semibold text-[17px] leading-[22px] text-text tabular-nums"
          />
        </>
      ) : (
        <>
          <Text
            className={cn(
              'w-[72px] text-center font-body-semibold text-[17px] leading-[22px] tabular-nums',
              s === 'upcoming' ? 'text-text-muted' : 'text-text',
            )}
          >
            {w || '–'}
          </Text>
          <Text
            className={cn(
              'w-[60px] text-center font-body-semibold text-[17px] leading-[22px] tabular-nums',
              s === 'upcoming' ? 'text-text-muted' : 'text-text',
            )}
          >
            {r || '–'}
          </Text>
        </>
      )}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={done ? 'Set done' : 'Mark set done'}
        onPress={() => {
          setDone(!done);
          onToggle?.(!done);
        }}
        className="h-11 w-11 items-center justify-center"
      >
        <View
          className={cn(
            'h-8 w-8 items-center justify-center rounded-xs',
            done ? 'bg-success-fill' : 'border-[1.5px] border-border-control bg-surface-control',
          )}
        >
          {done ? <Icon name="check" size={20} color={c.onSuccess} /> : null}
        </View>
      </Pressable>
    </View>
  );
}

/* ---------------- RestTimer ---------------- */
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, '0')}`;

/** Frosted bar docked at the bottom with a giant countdown, −15 / +15 and Skip. */
export function RestTimer({
  seconds,
  total,
  next,
  running = true,
  onDone,
}: {
  seconds: number;
  total: number;
  next?: string;
  running?: boolean;
  onDone?: () => void;
}) {
  const { scheme } = useTheme();
  const [t, setT] = useState(seconds);
  // Restart the countdown when the parent passes a new duration (adjusting state during render, not in an effect).
  const [prevSeconds, setPrevSeconds] = useState(seconds);
  if (seconds !== prevSeconds) {
    setPrevSeconds(seconds);
    setT(seconds);
  }
  useEffect(() => {
    if (!running || t <= 0) {
      if (t <= 0) onDone?.();
      return;
    }
    const id = setTimeout(() => setT((x) => x - 1), 1000);
    return () => clearTimeout(id);
  }, [running, t]);
  const done = t <= 0;
  const pct = Math.max(0, Math.min(1, t / total));
  return (
    <View
      className="overflow-hidden rounded-card shadow-float"
      accessibilityRole="timer"
      accessibilityLabel={`Rest ${fmt(t)} remaining`}
    >
      <BlurView
        intensity={blur.md * 2}
        tint={scheme === 'dark' ? 'dark' : 'light'}
        className="absolute inset-0"
      />
      <View className="rounded-card border border-glass-edge bg-glass pt-4 pr-4 pb-4 pl-5">
        <View className="absolute top-2 right-5 left-5 h-1 rounded-pill bg-track">
          <View
            className={cn('h-1 rounded-pill', done ? 'bg-success-fill' : 'bg-lift-fill')}
            style={{ width: `${pct * 100}%` }}
          />
        </View>
        <View className="mt-2 flex-row items-baseline gap-2">
          <MicroLabel>{done ? 'rest done' : 'rest'}</MicroLabel>
          {next ? (
            <Text numberOfLines={1} className="flex-1 type-caption text-text-muted">
              next · {next}
            </Text>
          ) : null}
        </View>
        <View className="mt-0.5 flex-row items-center justify-between">
          <Text className={cn('type-timer', done ? 'text-success-text' : 'text-text')}>
            {done ? 'go' : fmt(t)}
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => setT(Math.max(0, t - 15))}
              accessibilityLabel="Subtract 15 seconds"
              className="h-11 min-w-13 items-center justify-center rounded-pill bg-surface-control px-3 active:bg-surface-control-pressed"
            >
              <Text className="type-label text-text">−15</Text>
            </Pressable>
            <Pressable
              onPress={() => setT(t + 15)}
              accessibilityLabel="Add 15 seconds"
              className="h-11 min-w-13 items-center justify-center rounded-pill bg-surface-control px-3 active:bg-surface-control-pressed"
            >
              <Text className="type-label text-text">+15</Text>
            </Pressable>
            <Pressable
              onPress={() => setT(0)}
              accessibilityRole="button"
              className="h-11 min-w-13 items-center justify-center rounded-pill bg-primary-fill px-3 active:bg-primary-pressed"
            >
              <Text className="type-label text-on-primary">skip</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
