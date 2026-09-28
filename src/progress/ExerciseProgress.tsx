import { ActivityIndicator, Text, View } from 'react-native';

import { Card, DeltaPill, EmptyState, Icon, LineChart, Tag } from '@/components';
import type { HistorySession, HistorySet } from '@/db/queries/progress';
import { fromLocalDate } from '@/engine/calendar';
import {
  currentE1rm,
  dayNumber,
  e1rmSeries,
  isPR,
  monthDay,
  niceDomain,
  type SessionBest,
} from '@/engine/progress';
import { addDays } from '@/plan/week';
import { useTheme } from '@/theme';
import { formatSet, formatWeight, toDisplayWeight, weightUnit, type UnitSystem } from '@/units';

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** "Mon, Sep 21" */
const dayLine = (day: string) => `${WEEKDAY[fromLocalDate(day).getDay()]}, ${monthDay(day)}`;

/* ---------------- History ---------------- */

function SetChip({ set, pr, units }: { set: HistorySet; pr: boolean; units: UnitSystem }) {
  const { c } = useTheme();
  const warmup = set.set_type === 'warmup';
  return (
    <View
      className={`flex-row items-center gap-1 rounded-pill px-3 py-1.5 ${
        pr ? 'bg-lift-soft' : 'bg-surface-inset'
      } ${warmup ? 'opacity-60' : ''}`}
      accessible
      accessibilityLabel={`${warmup ? 'warm-up, ' : ''}${formatSet(set.weight_kg, set.reps, units)}${
        set.rpe ? ` at RPE ${set.rpe}` : ''
      }${pr ? ', personal record' : ''}`}
    >
      {pr ? <Icon name="trophy" size={13} color={c.liftText} /> : null}
      {warmup ? <Text className="type-label text-text-muted">W</Text> : null}
      <Text className={`type-label ${pr ? 'text-lift-text' : 'text-text'}`}>
        {formatSet(set.weight_kg, set.reps, units)}
        {set.rpe ? ` @${set.rpe}` : ''}
      </Text>
    </View>
  );
}

/** Exercise detail → History: the latest sessions with their sets; a PR set gets a trophy. */
export function ExerciseHistory({
  sessions,
  bests,
  pending,
  units,
  name,
}: {
  sessions: HistorySession[] | undefined;
  bests: SessionBest[] | undefined;
  pending: boolean;
  units: UnitSystem;
  name: string;
}) {
  const { c } = useTheme();
  if (pending) return <ActivityIndicator color={c.textMuted} />;
  if (!sessions?.length)
    return (
      <EmptyState
        icon="plan"
        title="no sets yet"
        body={`Log ${name} in a workout and every session shows up here.`}
      />
    );
  const prs = new Map((bests ?? []).filter(isPR).map((b) => [b.session_id, b]));
  return (
    <View className="gap-3">
      <Text className="px-1 type-headline text-text" accessibilityRole="header">
        recent sessions
      </Text>
      {sessions.map((s) => {
        const pr = prs.get(s.session_id);
        const prIndex = pr
          ? s.sets.findIndex(
              (x) =>
                x.set_type !== 'warmup' &&
                x.reps === pr.best_reps &&
                Number(x.weight_kg ?? 0) === Number(pr.best_weight_kg ?? 0),
            )
          : -1;
        return (
          <Card key={s.session_id} className="gap-3">
            <View className="flex-row items-baseline justify-between gap-3">
              <Text className="type-headline text-text">{dayLine(s.performed_on)}</Text>
              <Text className="shrink type-caption text-text-muted" numberOfLines={1}>
                {s.session_name}
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {s.sets.map((x, i) => (
                <SetChip key={`${x.set_number}-${i}`} set={x} pr={i === prIndex} units={units} />
              ))}
            </View>
          </Card>
        );
      })}
    </View>
  );
}

/* ---------------- Charts ---------------- */

/**
 * Exercise detail → Charts: the current est. 1RM, best set and best volume, and est. 1RM over
 * 12 weeks. Bodyweight exercises show reps instead.
 */
export function ExerciseCharts({
  bests,
  pending,
  units,
  today,
}: {
  bests: SessionBest[] | undefined;
  pending: boolean;
  units: UnitSystem;
  today: string;
}) {
  const { c } = useTheme();
  if (pending) return <ActivityIndicator color={c.textMuted} />;
  if (!bests?.length)
    return (
      <EmptyState
        icon="progress"
        title="no chart yet"
        body="Your estimated 1RM, best set and best volume appear after your first session."
      />
    );

  const unit = weightUnit(units);
  const lb = (kg: number) => formatWeight(kg, units);
  const now = currentE1rm(bests, today);
  const recent = bests.filter((b) => b.performed_on >= addDays(today, -83));
  const bestVolume = bests.reduce((m, b) => Math.max(m, b.volume_kg), 0);

  if (!now) {
    // Bodyweight or reps only.
    const top = bests.reduce((b, r) => ((r.best_reps ?? 0) > (b.best_reps ?? 0) ? r : b));
    const dots = recent.map((r) => ({ x: dayNumber(r.performed_on), y: r.best_reps ?? 0 }));
    return (
      <View className="gap-5">
        <Card padding="p-0">
          <View className="gap-1 p-5">
            <View className="flex-row items-baseline">
              <Text className="type-hero text-text">{top.best_reps}</Text>
              <Text className="ml-1 type-body-strong text-text-muted">reps</Text>
            </View>
            <Tag kind="lift" size="sm" />
            <Text className="type-headline text-text">best set</Text>
            <Text className="type-subhead text-text-muted">on {dayLine(top.performed_on)}</Text>
          </View>
        </Card>
        {dots.length > 1 ? (
          <Card className="gap-3">
            <Text className="type-headline text-text">best set, reps</Text>
            <LineChart
              kind="lift"
              accessibilityLabel={`Best reps per session over 12 weeks, latest ${dots[dots.length - 1].y}`}
              dots={dots}
              line={dots}
              domain={niceDomain(dots.map((d) => d.y))}
              formatY={(v) => String(Math.round(v))}
              xLabels={[
                { x: dots[0].x, label: monthDay(recent[0].performed_on) },
                { x: dayNumber(today), label: monthDay(today), current: true },
              ]}
            />
          </Card>
        ) : null}
      </View>
    );
  }

  const top = bests.reduce((b, r) => (r.best_e1rm_kg > b.best_e1rm_kg ? r : b));
  const series = e1rmSeries(recent);
  const shown = (p: { x: number; y: number }) => ({ x: p.x, y: toDisplayWeight(p.y, units) });
  const line = series.line.map(shown);
  const change = line.length > 1 ? line[line.length - 1].y - line[0].y : null;
  const xs = [addDays(today, -83), addDays(today, -42), today];

  return (
    <View className="gap-5">
      <Card padding="p-0">
        <View className="gap-1 p-5">
          <View className="flex-row items-baseline">
            <Text className="type-hero text-text" numberOfLines={1} adjustsFontSizeToFit>
              {lb(now.e1rm_kg)}
            </Text>
            <Text className="ml-1 type-body-strong text-text-muted">{unit}</Text>
          </View>
          <Tag kind="lift" size="sm" />
          <Text className="type-headline text-text">est. 1RM</Text>
          <Text className="type-subhead text-text-muted">
            from {lb(now.from.weight_kg)} {unit} × {now.from.reps} on{' '}
            {dayLine(now.from.performed_on)}
          </Text>
        </View>
        <View className="flex-row rounded-b-card bg-surface-inset px-5 py-4">
          <View className="flex-1 gap-0.5">
            <Text className="type-stat text-text">
              {formatSet(top.best_weight_kg, top.best_reps, units)}
            </Text>
            <Text className="type-micro text-text-muted">best set</Text>
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="type-stat text-text">
              {Math.round(toDisplayWeight(bestVolume, units)).toLocaleString('en-US')} {unit}
            </Text>
            <Text className="type-micro text-text-muted">best volume</Text>
          </View>
        </View>
      </Card>

      <Card className="gap-3">
        <View className="flex-row items-start justify-between gap-3">
          <View className="gap-0.5">
            <Text className="type-headline text-text" accessibilityRole="header">
              est. 1RM
            </Text>
            <Text className="type-caption text-text-muted">last 12 weeks</Text>
          </View>
          {change !== null && Math.round(change) !== 0 ? (
            <DeltaPill
              kind="lift"
              solid
              direction={change > 0 ? 'up' : 'down'}
              text={`${change > 0 ? '+' : '−'}${Math.abs(Math.round(change))} ${unit}`}
            />
          ) : null}
        </View>
        {series.dots.length ? (
          <>
            <LineChart
              kind="lift"
              accessibilityLabel={`Estimated 1RM over 12 weeks: ${series.dots.length} sessions, latest ${lb(
                recent[recent.length - 1]?.best_e1rm_kg ?? 0,
              )} ${unit}`}
              dots={series.dots.map(shown)}
              line={line}
              domain={niceDomain(series.dots.map((d) => toDisplayWeight(d.y, units)))}
              formatY={(v) => String(Math.round(v))}
              xLabels={xs.map((d, i) => ({
                x: dayNumber(d),
                label: monthDay(d),
                current: i === 2,
              }))}
            />
            <Text className="type-caption text-text-muted">dots: sessions · line: weekly best</Text>
          </>
        ) : (
          <Text className="type-body text-text-muted">No sessions in the last 12 weeks.</Text>
        )}
      </Card>
    </View>
  );
}
