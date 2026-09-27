import { Redirect, router } from 'expo-router';
import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { useAuth } from '@/auth';
import { AnchorCard, Button, Card, MacroTile, MicroLabel, StepScreen, TipCard } from '@/components';
import { useSaveStartingTargets } from '@/db/queries/targets';
import { toLocalDate } from '@/engine/calendar';
import { buildStartingTargets, dailyDelta } from '@/onboarding/buildStartingTargets';
import { useDraft } from '@/onboarding/draft';
import { isComplete } from '@/onboarding/types';

const fmt = (n: number) => n.toLocaleString('en-US');
const signed = (n: number) => (n === 0 ? '0' : `${n > 0 ? '+' : '−'}${fmt(Math.abs(n))}`);

/** Step 4: the engine's starting targets. Continue saves them as the first accepted week. */
export default function StartingTargets() {
  const { userId } = useAuth();
  const { draft } = useDraft();
  const save = useSaveStartingTargets(userId);

  const built = useMemo(
    () =>
      isComplete(draft)
        ? buildStartingTargets(draft, {
            today: toLocalDate(new Date()),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
          })
        : null,
    [draft],
  );

  // Reached without finishing the earlier steps (e.g. a reload): start over.
  if (!built) return <Redirect href="/onboarding/about" />;
  const { targets, args } = built;
  const delta = dailyDelta(targets);

  return (
    <StepScreen
      step={4}
      total={5}
      onBack={() => router.back()}
      title="your targets"
      subtitle="Built from your stats, training focus and goal."
      footer={
        <>
          {save.error ? (
            <Text className="text-center type-caption text-danger-text">
              Couldn’t save your targets: {save.error.message}
            </Text>
          ) : null}
          <Button
            block
            loading={save.isPending}
            onPress={() =>
              save.mutate(args, { onSuccess: () => router.push('/onboarding/connect') })
            }
          >
            continue
          </Button>
        </>
      }
    >
      <AnchorCard title="daily calories" icon="fuel">
        <Text
          className="mt-4 type-hero text-on-anchor"
          accessibilityLabel={`${fmt(targets.kcalTarget)} calories a day`}
        >
          {fmt(targets.kcalTarget)}
          <Text className="type-headline text-on-anchor-muted"> kcal</Text>
        </Text>
        <Text className="mt-2 type-body text-on-anchor-muted">
          aim for {fmt(targets.kcalLow)} to {fmt(targets.kcalHigh)}
        </Text>
        {targets.floored ? (
          <Text className="mt-2 type-caption text-on-anchor-muted">
            Raised to the safe minimum for your sex.
          </Text>
        ) : null}
      </AnchorCard>

      <View className="flex-row gap-3">
        <MacroTile letter="P" label="protein" grams={targets.proteinG} />
        <MacroTile letter="F" label="fat" grams={targets.fatG} />
        <MacroTile letter="C" label="carbs" grams={targets.carbsG} />
      </View>

      <Card className="flex-row gap-6">
        <View className="flex-1 gap-1">
          <MicroLabel>est. maintenance</MicroLabel>
          <Text className="type-stat text-text">
            {fmt(targets.maintenanceKcal)}
            <Text className="type-subhead text-text-muted"> kcal</Text>
          </Text>
        </View>
        <View className="flex-1 gap-1">
          <MicroLabel>
            {delta < 0 ? 'daily deficit' : delta > 0 ? 'daily surplus' : 'daily change'}
          </MicroLabel>
          <Text className="type-stat text-text">
            {signed(delta)}
            <Text className="type-subhead text-text-muted"> kcal</Text>
          </Text>
        </View>
      </Card>

      <TipCard tone="info" title="fixed for 3 weeks">
        After that, they adjust at each weekly check-in based on your weigh-ins and food logs.
      </TipCard>
    </StepScreen>
  );
}
