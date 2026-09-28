import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import { Button, Card, MicroLabel, RadioOptionCard, Tag } from '@/components';
import { noteMovedRun, useLinkRun } from '@/db/queries/runs';
import { useSession, useSessions } from '@/db/queries/sessions';
import { mondayOf } from '@/engine/calendar';
import { clockTime, runStats } from '@/plan/describe';
import { addDays, longDay, type PlanSession } from '@/plan/week';
import { useTheme } from '@/theme';
import { formatDistance, type UnitSystem } from '@/units';

/** "long run, 8 mi" */
const label = (s: PlanSession, units: UnitSystem) =>
  s.template?.est_distance_m
    ? `${s.name}, ${formatDistance(s.template.est_distance_m, units)}`
    : s.name;

/** Link an imported run to one of that week's planned runs, or keep it as an extra run. */
export default function LinkRunSheet() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId, profile } = useAuth();
  const units = profile?.unit_system ?? 'imperial';
  const session = useSession(id);
  const s = session.data;
  const monday = mondayOf(s?.scheduled_date ?? '2000-01-03');
  const week = useSessions(s ? userId : undefined, monday, addDays(monday, 6));
  const link = useLinkRun(userId);

  const runs = (week.data ?? []).filter(
    (x) => x.kind === 'run' && x.template_id && x.status !== 'skipped',
  );
  const current = s?.template_id ? s.id : 'extra';
  const firstFree = runs.find((x) => x.status === 'planned')?.id;
  const [choice, setChoice] = useState<string | null>(null);
  const selected = choice ?? (s?.run?.match === 'needs_match' ? (firstFree ?? 'extra') : current);

  if (!s?.run)
    return (
      <View className="items-center bg-surface-card p-10">
        {session.isPending ? (
          <ActivityIndicator color={c.textMuted} />
        ) : (
          <Text className="type-body text-text-muted">This run isn’t here any more.</Text>
        )}
      </View>
    );

  const save = () => {
    if (selected === current && s.run?.match !== 'needs_match') return router.back();
    link.mutate(
      { run: s.id, target: selected === 'extra' ? null : selected },
      {
        onSuccess: (to) => {
          noteMovedRun(s.id, to);
          router.back();
        },
      },
    );
  };

  return (
    <ScrollView
      className="bg-surface-card"
      contentInsetAdjustmentBehavior="never"
      contentContainerClassName="gap-5 px-5 pt-5 pb-10"
    >
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        hitSlop={12}
        className="self-start active:opacity-60"
      >
        <Text className="type-label text-text">cancel</Text>
      </Pressable>
      <Text className="type-title text-text" accessibilityRole="header">
        link this run
      </Text>

      <Card className="gap-4">
        <View className="flex-row items-center justify-between">
          <Tag kind="run" size="sm" />
          <Text className="type-caption text-text-muted">from Apple Health</Text>
        </View>
        <View className="flex-row gap-8">
          {runStats(s.run, units).map((m) => (
            <View key={m.label} className="gap-0.5">
              <Text className="font-display text-[26px] leading-[30px] text-text tabular-nums">
                {m.value}
              </Text>
              <MicroLabel>{m.label}</MicroLabel>
            </View>
          ))}
        </View>
        <Text className="type-subhead text-text-muted">
          {longDay(s.scheduled_date)} · {clockTime(s.run.started_at)}
        </Text>
      </Card>

      <View className="gap-3" accessibilityRole="radiogroup">
        <MicroLabel className="px-1">planned runs that week</MicroLabel>
        {week.isPending ? (
          <ActivityIndicator color={c.textMuted} />
        ) : runs.length === 0 ? (
          <Text className="px-1 type-body text-text-muted">No runs planned that week.</Text>
        ) : (
          runs.map((x) => {
            const taken = x.status !== 'planned' && x.id !== s.id;
            return taken ? (
              <View key={x.id} className="opacity-50" accessibilityState={{ disabled: true }}>
                <RadioOptionCard
                  icon="run"
                  iconColor="textMuted"
                  title={label(x, units)}
                  subtitle={x.run ? 'already has a run linked' : 'done'}
                  selected={false}
                  onPress={() => {}}
                />
              </View>
            ) : (
              <RadioOptionCard
                key={x.id}
                icon="run"
                iconColor="runText"
                title={label(x, units)}
                subtitle={x.id === s.id ? 'linked now' : longDay(x.scheduled_date)}
                selected={selected === x.id}
                onPress={() => setChoice(x.id)}
              />
            );
          })
        )}
        <View className="flex-row items-center gap-3 py-1">
          <View className="h-px flex-1 bg-hairline" />
          <MicroLabel>or</MicroLabel>
          <View className="h-px flex-1 bg-hairline" />
        </View>
        <RadioOptionCard
          icon="plus"
          title="keep as an extra run"
          subtitle="counts toward weekly distance, not your plan"
          selected={selected === 'extra'}
          onPress={() => setChoice('extra')}
        />
      </View>

      <Button variant="run" icon="check" block loading={link.isPending} onPress={save}>
        save
      </Button>
      {link.error ? (
        <Text className="text-center type-caption text-danger-text">{link.error.message}</Text>
      ) : null}
    </ScrollView>
  );
}
