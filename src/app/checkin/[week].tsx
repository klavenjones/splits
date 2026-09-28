import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import {
  ErrorBoundary,
  AnchorCard,
  Button,
  Card,
  DeltaPill,
  Icon,
  LineChart,
  MicroLabel,
  Tag,
  TipCard,
} from '@/components';
import {
  asEngineProfile,
  fetchDays,
  useCheckin,
  useDecideCheckin,
  useNutritionProfile,
  useWeighIns,
} from '@/db/queries/nutrition';
import { useSessions } from '@/db/queries/sessions';
import { addDays, daysBetween, mondayOf } from '@/engine/calendar';
import { proposeTargets } from '@/engine/checkin';
import { ADAPT_AFTER_WEEKS } from '@/engine/nutrition';
import { dayNumber, monthDay, niceDomain } from '@/engine/progress';
import { kcalText } from '@/nutrition/describe';
import { distanceNumber } from '@/plan/describe';
import { weekTotals } from '@/plan/week';
import { size, useTheme } from '@/theme';
import { toDisplayWeight, weightUnit, type UnitSystem } from '@/units';

const one = (v: number) => String(Math.round(v * 10) / 10);
const signed = (v: number, digits = 0) => {
  const r = digits ? Math.round(v * 10) / 10 : Math.round(v);
  return r > 0
    ? `+${r.toLocaleString('en-US')}`
    : r < 0
      ? `−${Math.abs(r).toLocaleString('en-US')}`
      : '0';
};

/**
 * Weekly check-in (mockup 01/weekly-check-in): the week reviewed, the maintenance update and
 * the new targets, with keep or accept. `week` is the Monday of the week the targets are for;
 * the week reviewed is the one before it.
 */
export default function CheckinRoute() {
  return (
    <ErrorBoundary
      name="checkin"
      screen
      title="couldn’t show your check-in"
      body="Your targets haven’t changed. It’s been reported; try again or close."
      onClose={() => router.back()}
    >
      <CheckinScreen />
    </ErrorBoundary>
  );
}

function CheckinScreen() {
  const { c } = useTheme();
  const { week } = useLocalSearchParams<{ week: string }>();
  const { userId, profile } = useAuth();
  const units = profile?.unit_system ?? 'imperial';
  const reviewed = addDays(week, -7);
  const sunday = addDays(week, -1);
  const q = useCheckin(userId, week);
  const nutrition = useNutritionProfile(userId).data;
  const weighIns = useWeighIns(userId, addDays(reviewed, -7)).data ?? [];
  const sessions = useSessions(userId, reviewed, sunday).data ?? [];
  const decide = useDecideCheckin(userId);
  // The engine's week-by-week table, recomputed from the logs for the details (sheet columns).
  const details = useQuery({
    queryKey: ['checkin', userId, week, 'details'],
    enabled: !!nutrition,
    queryFn: async () => {
      const p = asEngineProfile(nutrition!);
      return proposeTargets(p, week, await fetchDays(p.start_date, week))?.result ?? null;
    },
  });

  const row = q.data?.row;
  const prev = q.data?.prev;
  if (q.isPending)
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color={c.textMuted} />
      </View>
    );
  if (!row)
    return (
      <View className="flex-1 justify-center gap-4 bg-bg px-6">
        <Text className="type-title text-text">no check-in for this week yet</Text>
        <Button variant="secondary" onPress={() => router.back()}>
          close
        </Button>
      </View>
    );

  const wu = weightUnit(units);
  const w = (kg: number) => toDisplayWeight(kg, units);
  const weekNo = Math.max(
    1,
    daysBetween(mondayOf(nutrition?.start_date ?? reviewed), reviewed) / 7 + 1,
  );
  const sameMonth = reviewed.slice(0, 7) === sunday.slice(0, 7);
  const range = `${monthDay(reviewed)}–${sameMonth ? Number(sunday.slice(8)) : monthDay(sunday)}`;
  const days = weighIns.filter(
    (x) => x.checkin_date >= reviewed && x.checkin_date <= sunday && x.weight_kg !== null,
  );
  const t = weekTotals(sessions);
  const lifts = sessions.filter((s) => s.kind === 'lift' && s.status === 'completed').length;
  const maintenanceChange = prev ? row.maintenance_kcal - prev.maintenance_kcal : null;
  const deficit = row.maintenance_kcal - row.kcal_target;
  const adaptive = details.data?.adaptive ?? weekNo >= ADAPT_AFTER_WEEKS;
  const decided = row.status !== 'proposed';
  const why = !adaptive
    ? `Maintenance starts adapting in week ${ADAPT_AFTER_WEEKS}, once you have 4 weeks of weigh-ins. Until then it stays at the starting estimate; calories and macros still follow your latest weight.`
    : maintenanceChange === null || Math.abs(maintenanceChange) < 25
      ? 'Your intake and weight change matched what we expected, so maintenance held steady.'
      : maintenanceChange > 0
        ? `You ate about ${kcalText(row.avg_kcal ?? 0)} kcal a day and your weight still ${
            (row.weight_change_kg ?? 0) < 0 ? 'dropped' : 'held'
          }, so your body is burning a little more than we thought.`
        : `You ate about ${kcalText(row.avg_kcal ?? 0)} kcal a day and your weight moved less than that predicts, so your body is burning a little less than we thought.`;

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="gap-5 px-4 pt-6 pb-40">
        <View className="flex-row items-start justify-between">
          <View className="gap-1">
            <MicroLabel>
              week {weekNo} · {range}
            </MicroLabel>
            <Text className="type-display text-text" accessibilityRole="header">
              check-in
            </Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={12}
          >
            <Icon name="x" size={size.iconLg} color={c.text} />
          </Pressable>
        </View>

        <Card className="gap-3">
          <MicroLabel className="text-body-text">body · 7-day average</MicroLabel>
          <View className="flex-row items-baseline">
            <Text className="type-hero text-text">
              {row.avg_weight_kg ? one(w(Number(row.avg_weight_kg))) : '–'}
            </Text>
            <Text className="ml-1 type-headline text-text-muted">{wu}</Text>
          </View>
          {row.weight_change_kg !== null ? (
            <View className="flex-row flex-wrap items-center gap-2">
              <DeltaPill
                kind="body"
                direction={
                  Number(row.weight_change_kg) < 0
                    ? 'down'
                    : Number(row.weight_change_kg) > 0
                      ? 'up'
                      : 'flat'
                }
                text={`${signed(w(Number(row.weight_change_kg)), 1)} ${wu}`}
              />
              {row.avg_weight_kg ? (
                <Text className="type-subhead text-text-muted">
                  from {one(w(Number(row.avg_weight_kg) - Number(row.weight_change_kg)))} last week
                </Text>
              ) : null}
            </View>
          ) : null}
          {days.length > 1 ? (
            <LineChart
              kind="body"
              height={170}
              accessibilityLabel={`Daily weigh-ins ${monthDay(reviewed)} to ${monthDay(sunday)}`}
              dots={days.map((d) => ({ x: dayNumber(d.checkin_date), y: w(Number(d.weight_kg)) }))}
              line={days.map((d) => ({ x: dayNumber(d.checkin_date), y: w(Number(d.weight_kg)) }))}
              domain={niceDomain(days.map((d) => w(Number(d.weight_kg))))}
              formatY={one}
              xLabels={[
                { x: dayNumber(reviewed), label: 'M' },
                { x: dayNumber(sunday), label: 'S', current: true },
              ]}
            />
          ) : null}
        </Card>

        <Text className="px-1 type-headline text-text" accessibilityRole="header">
          this week
        </Text>
        <Card className="flex-row flex-wrap gap-y-5">
          <Stat
            tag="run"
            value={distanceNumber(t.runMetersDone, units)}
            unit={units === 'imperial' ? 'mi' : 'km'}
            sub={`${t.runsDone} run${t.runsDone === 1 ? '' : 's'}`}
          />
          <Stat tag="lift" value={String(lifts)} unit="sessions" sub="completed" />
          <Stat
            tag="fuel"
            value={row.avg_kcal ? kcalText(row.avg_kcal) : '–'}
            unit="kcal/day"
            sub={`${row.days_logged} of 7 days logged`}
          />
          <Stat
            tag="body"
            value={`${days.length} / 7`}
            unit="weigh-ins"
            sub={days.length === 7 ? 'every day' : 'missed days carry forward'}
          />
        </Card>

        <Text className="px-1 type-headline text-text" accessibilityRole="header">
          maintenance
        </Text>
        <Card padding="p-0">
          <View className="gap-1 p-5">
            <View className="flex-row items-baseline">
              <Text className="type-hero-sm text-text">{kcalText(row.maintenance_kcal)}</Text>
              <Text className="ml-1 type-headline text-text-muted">kcal</Text>
            </View>
            <Tag kind="fuel" size="sm" />
            <Text className="type-headline text-text">
              {adaptive ? 'updated estimate' : 'starting estimate'}
            </Text>
            <Text className="type-subhead text-text-muted">what you burn in a typical day</Text>
          </View>
          <View className="flex-row rounded-b-card bg-surface-inset px-5 py-4">
            <MiniStat value={prev ? kcalText(prev.maintenance_kcal) : '–'} label="last week" />
            <MiniStat
              value={maintenanceChange === null ? '–' : signed(maintenanceChange)}
              label="change"
            />
            <MiniStat
              value={kcalText(Math.abs(deficit))}
              label={deficit >= 0 ? 'daily deficit' : 'daily surplus'}
            />
          </View>
        </Card>
        <TipCard tone="info" title="why it moved">
          {why}
        </TipCard>

        <Text className="px-1 type-headline text-text" accessibilityRole="header">
          next week
        </Text>
        <AnchorCard title="new targets" icon="fuel">
          <View className="mt-3 gap-1">
            <View className="flex-row items-baseline">
              <Text className="type-hero text-on-anchor">{kcalText(row.kcal_target)}</Text>
              <Text className="ml-1 type-headline text-on-anchor-muted">kcal / day</Text>
            </View>
            <Text className="type-subhead text-on-anchor-muted">
              {row.kcal_low.toLocaleString('en-US')}–{row.kcal_high.toLocaleString('en-US')}
              {prev
                ? ` · ${row.kcal_target >= prev.kcal_target ? 'up' : 'down'} from ${kcalText(prev.kcal_target)}`
                : ''}
            </Text>
          </View>
          <View className="mt-4 flex-row border-t border-on-anchor-muted pt-4">
            {(
              [
                ['protein', row.protein_g, 'bg-macro-protein'],
                ['carbs', row.carbs_g, 'bg-macro-carbs'],
                ['fat', row.fat_g, 'bg-macro-fat'],
              ] as const
            ).map(([label, g, dot]) => (
              <View key={label} className="flex-1 gap-1">
                <View className="flex-row items-center gap-1.5">
                  <View className={`h-2 w-2 rounded-pill ${dot}`} />
                  <Text className="type-micro text-on-anchor-muted">{label}</Text>
                </View>
                <Text className="type-stat text-on-anchor">
                  {g}
                  <Text className="type-subhead text-on-anchor-muted"> g</Text>
                </Text>
              </View>
            ))}
          </View>
        </AnchorCard>

        {details.data ? <Details result={details.data} units={units} /> : null}
      </ScrollView>

      <View className="absolute right-0 bottom-0 left-0 flex-row gap-3 border-t border-hairline bg-surface-card px-4 pt-3 pb-9">
        {decided ? (
          <Text className="flex-1 py-3 text-center type-subhead text-text-muted">
            {row.status === 'accepted'
              ? 'You accepted these targets.'
              : 'You kept your previous targets.'}
          </Text>
        ) : (
          <>
            <Button
              variant="secondary"
              className="flex-1"
              disabled={!prev}
              loading={decide.isPending && decide.variables?.accept === false}
              onPress={() =>
                decide.mutate({ week, accept: false }, { onSuccess: () => router.back() })
              }
            >
              {prev ? `keep ${kcalText(prev.kcal_target)}` : 'keep'}
            </Button>
            <Button
              className="flex-1"
              icon="check"
              loading={decide.isPending && decide.variables?.accept === true}
              onPress={() =>
                decide.mutate({ week, accept: true }, { onSuccess: () => router.back() })
              }
            >
              accept
            </Button>
          </>
        )}
      </View>
    </View>
  );
}

function Stat({
  tag,
  value,
  unit,
  sub,
}: {
  tag: 'run' | 'lift' | 'fuel' | 'body';
  value: string;
  unit: string;
  sub: string;
}) {
  return (
    <View className="w-1/2 gap-1.5 pr-2">
      <Tag kind={tag} size="sm" />
      <Text className="type-stat text-text">
        {value}
        <Text className="type-subhead text-text-muted"> {unit}</Text>
      </Text>
      <Text className="type-caption text-text-muted">{sub}</Text>
    </View>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 items-center gap-0.5">
      <Text className="type-headline text-text">{value}</Text>
      <MicroLabel>{label}</MicroLabel>
    </View>
  );
}

/** The engine's week-by-week numbers, labelled with the spreadsheet's columns for comparison. */
function Details({
  result,
  units,
}: {
  result: NonNullable<ReturnType<typeof proposeTargets>>['result'];
  units: UnitSystem;
}) {
  const wu = weightUnit(units);
  const cols = ['wk', `avg ${wu} (AW)`, 'kcal (AW)', 'days (AL)', 'estimate (BE)', 'running (BD)'];
  return (
    <Card className="gap-2">
      <Text className="type-headline text-text">details</Text>
      <Text className="type-caption text-text-muted">
        Each week as the spreadsheet computes it. Missed days carry forward within a week.
      </Text>
      <View className="flex-row border-b border-hairline pb-1.5">
        {cols.map((h) => (
          <Text key={h} className="flex-1 type-caption text-text-muted" numberOfLines={2}>
            {h}
          </Text>
        ))}
      </View>
      {result.weeks.map((wk, i) => (
        <View key={i} className="flex-row py-1">
          {[
            String(i + 1),
            one(toDisplayWeight(wk.avgWeightKg, units)),
            wk.avgKcal === null ? '–' : kcalText(wk.avgKcal),
            String(wk.daysLogged),
            kcalText(wk.estimateKcal),
            kcalText(wk.runningKcal),
          ].map((v, j) => (
            <Text key={j} className="flex-1 type-caption text-text tabular-nums">
              {v}
            </Text>
          ))}
        </View>
      ))}
    </Card>
  );
}
