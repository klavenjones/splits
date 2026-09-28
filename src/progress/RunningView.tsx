import { router } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import {
  BarChart,
  Card,
  DeltaPill,
  EmptyState,
  GroupedItem,
  Icon,
  LineChart,
  SummaryTile,
} from '@/components';
import { useRunningProgress } from '@/db/queries/progress';
import {
  dayNumber,
  easyPaceByWeek,
  monthMeters,
  niceDomain,
  paceChange,
  relativeDay,
  shortDate,
  weekStarts,
  weeklyAverage,
  weeklyMeters,
} from '@/engine/progress';
import { paceOf } from '@/engine/runs';
import { useRenderTimer } from '@/lib/useRenderTimer';
import { distanceNumber } from '@/plan/describe';
import { size, useTheme } from '@/theme';
import { formatPace, paceUnit, secPerKmToSecPerMi, type UnitSystem } from '@/units';

/** Progress → Running (mockup 10/02): month, weekly average, easy pace, weekly miles, runs. */
export function RunningView({
  userId,
  units,
  today,
}: {
  userId: string | undefined;
  units: UnitSystem;
  today: string;
}) {
  const { c } = useTheme();
  const q = useRunningProgress(userId, today);
  const ready = useRenderTimer('running');
  const dist = units === 'imperial' ? 'mi' : 'km';

  if (q.isPending) return <ActivityIndicator color={c.textMuted} />;
  if (q.error) return <EmptyState icon="alert" title="Couldn’t load" body={q.error.message} />;
  const runs = q.data;
  if (!runs.length)
    return (
      <EmptyState
        icon="run"
        title="no runs yet"
        body="Record a run on your Apple Watch and your weekly distance and easy pace show up here."
      />
    );

  const weeks = weekStarts(today, 8);
  const fullWeeks = weekStarts(today, 9).slice(0, 8);
  const weekly = weeklyMeters(runs, weeks);
  const easy = easyPaceByWeek(runs, weeks);
  const known = easy.filter((e): e is { week: string; pace: number } => e.pace !== null);
  const latestEasy = known[known.length - 1]?.pace ?? null;
  const change = paceChange(easy);
  const changeShown =
    change === null ? null : Math.round(units === 'imperial' ? secPerKmToSecPerMi(change) : change);
  const easyRuns = runs.filter((r) => r.easy && r.distance_m > 0 && r.date >= weeks[0]);
  const pace = (s: number) => formatPace(s, units, false);

  return (
    <View className="gap-6">
      <View className="flex-row gap-2.5">
        <SummaryTile
          kind="run"
          label="this month"
          value={distanceNumber(monthMeters(runs, today), units)}
          unit={dist}
        />
        <SummaryTile
          kind="run"
          label="weekly avg"
          value={distanceNumber(weeklyAverage(runs, fullWeeks), units)}
          unit={dist}
        />
        <SummaryTile
          kind="run"
          label="easy pace"
          value={latestEasy ? pace(latestEasy) : '–'}
          unit={paceUnit(units)}
        />
      </View>

      <Card className="gap-3">
        <View className="flex-row items-baseline justify-between">
          <Text className="type-headline text-text" accessibilityRole="header">
            weekly {units === 'imperial' ? 'miles' : 'km'}
          </Text>
          <Text className="type-caption text-text-muted">last 8 weeks</Text>
        </View>
        <BarChart
          kind="run"
          onReady={ready}
          accessibilityLabel={`Weekly ${dist}: ${weekly
            .map((w) => `week of ${shortDate(w.week)}, ${distanceNumber(w.m, units)}`)
            .join('; ')}`}
          bars={weekly.map((w, i) => ({
            label: shortDate(w.week),
            value: w.m,
            valueLabel: String(Math.round(Number(distanceNumber(w.m, units)))),
            current: i === weekly.length - 1,
          }))}
        />
      </Card>

      <Card className="gap-3">
        <View className="flex-row items-start justify-between gap-3">
          <View className="shrink gap-0.5">
            <Text className="type-headline text-text" accessibilityRole="header">
              easy-run pace
            </Text>
            <Text className="type-caption text-text-muted">weekly average · up is faster</Text>
          </View>
          {changeShown !== null ? (
            <DeltaPill
              kind="run"
              solid
              icon="run"
              direction={changeShown < 0 ? 'up' : changeShown > 0 ? 'down' : 'flat'}
              text={
                changeShown === 0
                  ? 'same pace'
                  : `${changeShown < 0 ? '−' : '+'}${pace(Math.abs(change!))} ${paceUnit(units)} ${changeShown < 0 ? 'faster' : 'slower'}`
              }
            />
          ) : null}
        </View>
        {known.length ? (
          <LineChart
            kind="run"
            invert
            accessibilityLabel={`Easy-run pace by week: ${known
              .map((k) => `week of ${shortDate(k.week)}, ${pace(k.pace)}`)
              .join('; ')}`}
            dots={easyRuns.map((r) => ({
              x: dayNumber(r.date),
              y: paceOf(r.distance_m, r.duration_s)!,
            }))}
            line={known.map((k) => ({ x: dayNumber(k.week) + 3, y: k.pace }))}
            domain={niceDomain([
              ...known.map((k) => k.pace),
              ...easyRuns.map((r) => paceOf(r.distance_m, r.duration_s)!),
            ])}
            formatY={pace}
            xLabels={[weeks[0], weeks[3], weeks[7]].map((w, i) => ({
              x: dayNumber(w) + 3,
              label: shortDate(w),
              current: i === 2,
            }))}
          />
        ) : (
          <Text className="type-body text-text-muted">
            No easy runs in the last 8 weeks. Easy runs are planned runs at an easy effort or pace.
          </Text>
        )}
      </Card>

      <View className="gap-3">
        <Text className="px-1 type-headline text-text" accessibilityRole="header">
          recent runs
        </Text>
        <View>
          {runs.slice(0, 5).map((r, i, list) => {
            const p = paceOf(r.distance_m, r.duration_s);
            return (
              <GroupedItem key={r.id} index={i} count={list.length}>
                <Pressable
                  onPress={() => router.push({ pathname: '/runs/[id]', params: { id: r.id } })}
                  accessibilityRole="button"
                  className={`flex-row items-center gap-3 px-4 py-3.5 active:bg-surface-inset ${
                    i < list.length - 1 ? 'border-b border-hairline' : ''
                  }`}
                >
                  <View
                    className="items-center justify-center rounded-md bg-run-soft"
                    style={{ width: size.touchMin, height: size.touchMin }}
                  >
                    <Icon name="run" size={size.iconMd} color={c.runText} />
                  </View>
                  <View className="flex-1">
                    <Text className="type-headline text-text" numberOfLines={1}>
                      {r.name}
                    </Text>
                    <Text className="type-caption text-text-muted">
                      {relativeDay(r.date, today)} · {distanceNumber(r.distance_m, units)} {dist}
                    </Text>
                  </View>
                  <Text className="type-label text-text">
                    {p ? `${pace(p)} ${paceUnit(units)}` : '–'}
                  </Text>
                  <Icon name="chevron-right" size={size.iconMd} color={c.textMuted} />
                </Pressable>
              </GroupedItem>
            );
          })}
        </View>
      </View>
    </View>
  );
}
