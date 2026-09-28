import { router } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import {
  BarChart,
  Button,
  Card,
  DeltaPill,
  EmptyState,
  ExerciseThumbnail,
  GroupedItem,
  Icon,
  MicroLabel,
  PRCard,
} from '@/components';
import { useExercises } from '@/db/queries/exercises';
import { useStrengthProgress } from '@/db/queries/progress';
import {
  keyLifts,
  percentChange,
  recentPRs,
  relativeDay,
  shortDate,
  weekStarts,
  weeklyVolume,
} from '@/engine/progress';
import { useRenderTimer } from '@/lib/useRenderTimer';
import { size, useTheme } from '@/theme';
import { formatWeight, toDisplayWeight, weightUnit, type UnitSystem } from '@/units';

/** Progress → Strength (mockup 10/01): weekly volume, recent PRs, est. 1RM of key lifts. */
export function StrengthView({
  userId,
  units,
  today,
}: {
  userId: string | undefined;
  units: UnitSystem;
  today: string;
}) {
  const { c } = useTheme();
  const q = useStrengthProgress(userId, today);
  const library = useExercises(userId).data;
  const ready = useRenderTimer('strength');
  const unit = weightUnit(units);

  if (q.isPending) return <ActivityIndicator color={c.textMuted} />;
  if (q.error) return <EmptyState icon="alert" title="Couldn’t load" body={q.error.message} />;
  const rows = q.data;
  if (!rows.length)
    return (
      <EmptyState
        icon="lift"
        title="no workouts yet"
        body="Log a workout and your weekly volume, PRs and estimated 1RMs show up here."
      >
        <Button variant="secondary" size="md" onPress={() => router.navigate('/plan')}>
          plan the week
        </Button>
      </EmptyState>
    );

  const exercise = (id: string) => library?.find((e) => e.id === id);
  const lb = (kg: number) => `${formatWeight(kg, units)} ${unit}`;
  const weeks = weekStarts(today, 8);
  const volume = weeklyVolume(rows, weeks).map((w) => ({
    ...w,
    shown: toDisplayWeight(w.kg, units),
  }));
  // Early in a week with nothing logged yet, lead with last week instead of a zero.
  const thisWeek = volume[volume.length - 1];
  const lead = thisWeek.shown > 0 ? thisWeek : volume[volume.length - 2];
  const change = percentChange(volume[0].shown, lead.shown);
  const thousands = Math.max(...volume.map((v) => v.shown)) >= 10_000;
  const prs = recentPRs(rows, 3);
  const lifts = keyLifts(rows, today);

  return (
    <View className="gap-6">
      <Card className="gap-3">
        <MicroLabel className="text-lift-text">weekly volume, last 8 weeks</MicroLabel>
        <View className="flex-row flex-wrap items-baseline gap-x-2">
          <Text className="type-hero-sm text-text" numberOfLines={1} adjustsFontSizeToFit>
            {Math.round(lead.shown).toLocaleString('en-US')}
          </Text>
          <Text className="type-body-strong text-text-muted">
            {unit} {lead === thisWeek ? 'this week' : 'last week'}
          </Text>
        </View>
        {change !== null ? (
          <DeltaPill
            kind="lift"
            direction={change > 0 ? 'up' : change < 0 ? 'down' : 'flat'}
            text={`${change > 0 ? '+' : change < 0 ? '−' : ''}${Math.abs(change)}% vs week of ${shortDate(volume[0].week)}`}
          />
        ) : null}
        <BarChart
          kind="lift"
          onReady={ready}
          accessibilityLabel={`Weekly volume in ${unit}: ${volume
            .map((v) => `week of ${shortDate(v.week)}, ${Math.round(v.shown)}`)
            .join('; ')}`}
          bars={volume.map((v, i) => ({
            label: shortDate(v.week),
            value: v.shown,
            valueLabel: thousands ? (v.shown / 1000).toFixed(1) : String(Math.round(v.shown)),
            current: i === volume.length - 1,
          }))}
        />
        {thousands ? (
          <Text className="type-caption text-text-muted">bars in thousands of {unit}</Text>
        ) : null}
      </Card>

      {prs.length ? (
        <View className="gap-3">
          <Text className="px-1 type-headline text-text" accessibilityRole="header">
            recent PRs
          </Text>
          {prs.map((p) => (
            <PRCard
              key={p.session_id + p.exercise_id}
              name={exercise(p.exercise_id)?.name ?? 'exercise'}
              best={`${lb(p.best_weight_kg ?? 0)} × ${p.best_reps}`}
              when={relativeDay(p.performed_on, today)}
              e1rm={lb(p.best_e1rm_kg)}
            />
          ))}
        </View>
      ) : null}

      {lifts.length ? (
        <View className="gap-3">
          <View className="flex-row items-baseline justify-between px-1">
            <Text className="type-headline text-text" accessibilityRole="header">
              est. 1RM, key lifts
            </Text>
            <Text className="type-caption text-text-muted">change in 4 weeks</Text>
          </View>
          <View>
            {lifts.map((l, i) => {
              const e = exercise(l.exercise_id);
              const delta = l.change_kg === null ? null : toDisplayWeight(l.change_kg, units);
              return (
                <GroupedItem key={l.exercise_id} index={i} count={lifts.length}>
                  <Pressable
                    onPress={() =>
                      router.push({ pathname: '/exercises/[id]', params: { id: l.exercise_id } })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`${e?.name ?? 'exercise'}, est. 1RM ${lb(l.e1rm_kg)}${
                      delta !== null
                        ? `, ${delta >= 0 ? 'up' : 'down'} ${Math.abs(Math.round(delta))} ${unit} in 4 weeks`
                        : ''
                    }`}
                    className={`flex-row items-center gap-3 px-4 py-3.5 active:bg-surface-inset ${
                      i < lifts.length - 1 ? 'border-b border-hairline' : ''
                    }`}
                  >
                    <ExerciseThumbnail
                      primaryMuscle={e?.primary_muscle ?? null}
                      dim={size.touchMin}
                    />
                    <View className="flex-1">
                      <Text className="type-headline text-text" numberOfLines={1}>
                        {e?.name ?? 'exercise'}
                      </Text>
                      <Text className="type-caption text-text-muted" numberOfLines={1}>
                        {e?.equipment ?? ''}
                      </Text>
                    </View>
                    <View className="items-end gap-1">
                      <Text className="type-label text-text">{lb(l.e1rm_kg)}</Text>
                      {delta !== null ? (
                        <DeltaPill
                          kind="lift"
                          direction={
                            Math.round(delta) > 0 ? 'up' : Math.round(delta) < 0 ? 'down' : 'flat'
                          }
                          text={
                            Math.round(delta) === 0
                              ? 'no change'
                              : `${delta > 0 ? '+' : '−'}${Math.abs(Math.round(delta))} ${unit}`
                          }
                        />
                      ) : (
                        <Text className="type-caption text-text-muted">new</Text>
                      )}
                    </View>
                    <Icon name="chevron-right" size={size.iconMd} color={c.textMuted} />
                  </Pressable>
                </GroupedItem>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}
