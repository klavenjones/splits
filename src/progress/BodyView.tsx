import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import {
  Button,
  Card,
  DeltaPill,
  EmptyState,
  GroupedItem,
  LineChart,
  RangeChips,
  SummaryTile,
} from '@/components';
import { useBodyProgress } from '@/db/queries/progress';
import {
  dayNumber,
  measurements,
  monthDay,
  niceDomain,
  RANGES,
  rangeStart,
  rollingAverage,
  type Measure,
  type Range,
} from '@/engine/progress';
import { useRenderTimer } from '@/lib/useRenderTimer';
import { useTheme } from '@/theme';
import { lengthUnit, toDisplayLength, toDisplayWeight, weightUnit, type UnitSystem } from '@/units';

const MEASURE: Record<Measure, { name: string; where: string }> = {
  waist_cm: { name: 'waist', where: 'at navel' },
  neck_cm: { name: 'neck', where: 'below larynx' },
  hip_cm: { name: 'hip', where: 'widest point' },
  body_fat_pct: { name: 'body fat (Navy)', where: 'estimated' },
};

const one = (v: number) => String(Math.round(v * 10) / 10);
const signed = (v: number) => (v > 0 ? `+${one(v)}` : v < 0 ? `−${one(-v)}` : '0');

/**
 * Progress → Body (mockup 10/03): weekly average, since start, body fat, weight with a 7-day
 * trend, measurements. Weight is neutral data: changes use the body color, never red or green.
 */
export function BodyView({
  userId,
  units,
  today,
}: {
  userId: string | undefined;
  units: UnitSystem;
  today: string;
}) {
  const { c } = useTheme();
  const q = useBodyProgress(userId);
  const [range, setRange] = useState<Range>('1M');
  const ready = useRenderTimer('body');
  const wu = weightUnit(units);

  if (q.isPending) return <ActivityIndicator color={c.textMuted} />;
  if (q.error) return <EmptyState icon="alert" title="Couldn’t load" body={q.error.message} />;
  const { checkins, start } = q.data;
  const weighed = checkins.filter((x) => x.weight_kg !== null);
  if (!checkins.length)
    return (
      <EmptyState
        icon="body"
        title="no weigh-ins yet"
        body="Connect Apple Health to bring in your weight. Weighing in from Today arrives soon."
      >
        <Button variant="secondary" size="md" onPress={() => router.push('/settings/health')}>
          connect Apple Health
        </Button>
      </EmptyState>
    );

  const w = (kg: number) => toDisplayWeight(kg, units);
  const trend = rollingAverage(checkins);
  const latest = trend[trend.length - 1] ?? null;
  const since = latest && start.weight_kg ? w(latest.kg) - w(start.weight_kg) : null;
  const list = measurements(checkins, { body_fat_pct: start.body_fat_pct });
  const fat = list.find((m) => m.key === 'body_fat_pct')?.value ?? start.body_fat_pct;

  const from = rangeStart(range, today);
  const shownDots = weighed.filter((x) => !from || x.checkin_date >= from);
  const shownLine = trend.filter((x) => !from || x.date >= from);
  const first = shownDots[0]?.checkin_date ?? today;
  const mid = shownDots[Math.floor(shownDots.length / 2)]?.checkin_date ?? today;
  const xLabels = [...new Set([first, mid, today])].map((d, i, all) => ({
    x: dayNumber(d),
    label: monthDay(d),
    current: i === all.length - 1,
  }));

  return (
    <View className="gap-6">
      <View className="flex-row gap-2.5">
        <SummaryTile
          kind="body"
          label="weekly avg"
          value={latest ? one(w(latest.kg)) : '–'}
          unit={wu}
        />
        <SummaryTile
          kind="body"
          label="since start"
          value={since === null ? '–' : signed(since)}
          unit={since === null ? undefined : wu}
        />
        <SummaryTile
          kind="body"
          label="body fat"
          value={fat ? one(fat) : '–'}
          unit={fat ? '%' : undefined}
        />
      </View>

      <Card className="gap-3">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="type-headline text-text" accessibilityRole="header">
            weight
          </Text>
          <RangeChips ranges={RANGES} value={range} onChange={setRange} />
        </View>
        {shownDots.length ? (
          <>
            <LineChart
              kind="body"
              onReady={ready}
              accessibilityLabel={`Weight, ${range === 'All' ? 'all time' : `last ${range}`}: ${
                shownDots.length
              } weigh-ins; 7-day average now ${latest ? one(w(latest.kg)) : '–'} ${wu}`}
              dots={shownDots.map((x) => ({ x: dayNumber(x.checkin_date), y: w(x.weight_kg!) }))}
              line={shownLine.map((x) => ({ x: dayNumber(x.date), y: w(x.kg) }))}
              domain={niceDomain(shownDots.map((x) => w(x.weight_kg!)))}
              formatY={one}
              xLabels={xLabels}
            />
            <Text className="type-caption text-text-muted">
              dots: daily weigh-ins · line: 7-day average
            </Text>
          </>
        ) : (
          <Text className="type-body text-text-muted">No weigh-ins in this range.</Text>
        )}
      </Card>

      {list.length ? (
        <View className="gap-3">
          <View className="flex-row items-baseline justify-between px-1">
            <Text className="type-headline text-text" accessibilityRole="header">
              measurements
            </Text>
            <Text className="type-caption text-text-muted">vs start</Text>
          </View>
          <View>
            {list.map((m, i) => {
              const pct = m.key === 'body_fat_pct';
              const shown = (v: number) => (pct ? v : toDisplayLength(v, units));
              const unit = pct ? '%' : ` ${lengthUnit(units)}`;
              const change = m.change === null ? null : Math.round(shown(m.change) * 10) / 10;
              return (
                <GroupedItem key={m.key} index={i} count={list.length}>
                  <View
                    className={`flex-row items-center gap-3 px-4 py-3.5 ${
                      i < list.length - 1 ? 'border-b border-hairline' : ''
                    }`}
                    accessible
                    accessibilityLabel={`${MEASURE[m.key].name}, ${one(shown(m.value))}${unit}${
                      change === null
                        ? ''
                        : change === 0
                          ? ', no change'
                          : `, ${signed(change)}${unit} since start`
                    }`}
                  >
                    <View className="flex-1">
                      <Text className="type-headline text-text">{MEASURE[m.key].name}</Text>
                      <Text className="type-caption text-text-muted">
                        {MEASURE[m.key].where} · {monthDay(m.date)}
                      </Text>
                    </View>
                    <Text className="type-label text-text">
                      {one(shown(m.value))}
                      {unit}
                    </Text>
                    {change !== null ? (
                      <DeltaPill
                        kind="body"
                        direction={change > 0 ? 'up' : change < 0 ? 'down' : 'flat'}
                        text={change === 0 ? 'no change' : `${signed(change)}${unit}`}
                      />
                    ) : null}
                  </View>
                </GroupedItem>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}
