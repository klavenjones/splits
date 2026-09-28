import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { AnchorCard, Button, CalorieBar, Card, MacroBars, MicroLabel, Tag } from '@/components';
import {
  totals,
  useDiary,
  usePendingCheckin,
  useTargetsOn,
  useWeighIns,
} from '@/db/queries/nutrition';
import { addDays, mondayOf } from '@/engine/calendar';
import { rollingAverage } from '@/engine/progress';
import { kcalText } from '@/nutrition/describe';
import { toDisplayWeight, weightUnit, type UnitSystem } from '@/units';

const one = (v: number) => String(Math.round(v * 10) / 10);

/** Today's fuel: calories left with macro bars (macro colors). Opens the diary. */
export function FuelCard({ userId, today }: { userId: string | undefined; today: string }) {
  const logs = useDiary(userId, today).data ?? [];
  const targets = useTargetsOn(userId, today).data;
  if (!targets) return null;
  const eaten = totals(logs);
  const left = targets.kcal_target - eaten.kcal;
  return (
    <View className="gap-2">
      <View className="flex-row items-baseline justify-between px-1 pt-2">
        <Text className="type-headline text-text" accessibilityRole="header">
          fuel
        </Text>
        <Text className="type-caption text-text-muted">
          {kcalText(eaten.kcal)} of {kcalText(targets.kcal_target)} kcal eaten
        </Text>
      </View>
      <Pressable
        onPress={() => router.navigate('/nutrition')}
        accessibilityRole="button"
        className="active:opacity-95"
      >
        <Card className="gap-4">
          <View className="flex-row items-baseline gap-2">
            <Text className="type-hero-sm text-text">{kcalText(Math.abs(left))}</Text>
            <Text className="type-headline text-text">kcal {left >= 0 ? 'left' : 'over'}</Text>
          </View>
          <CalorieBar eaten={eaten.kcal} target={targets.kcal_target} />
          <MacroBars
            tone="macro"
            macros={[
              { key: 'protein', eaten: eaten.protein, target: targets.protein_g },
              { key: 'carbs', eaten: eaten.carbs, target: targets.carbs_g },
              { key: 'fat', eaten: eaten.fat, target: targets.fat_g },
            ]}
          />
        </Card>
      </Pressable>
    </View>
  );
}

/** The morning weigh-in: today's weight, or a prompt that opens the weigh-in sheet. */
export function BodyCard({
  userId,
  today,
  units,
}: {
  userId: string | undefined;
  today: string;
  units: UnitSystem;
}) {
  const rows = useWeighIns(userId, addDays(today, -13)).data ?? [];
  const wu = weightUnit(units);
  const todayRow = rows.find((r) => r.checkin_date === today && r.weight_kg !== null);
  const lastWeek = rows.find((r) => r.checkin_date === addDays(today, -7) && r.weight_kg !== null);
  const avg = rollingAverage(rows).at(-1);
  const thisWeek = rows.filter(
    (r) => r.checkin_date >= mondayOf(today) && r.weight_kg !== null,
  ).length;
  const open = () => router.push('/sheets/weigh-in');
  if (!todayRow)
    return (
      <Card className="gap-3">
        <View className="flex-row items-center justify-between">
          <Tag kind="body" size="sm" />
          <Text className="type-caption text-text-muted">{thisWeek}/7 this week</Text>
        </View>
        <Text className="type-headline text-text">morning weigh-in</Text>
        <Text className="type-body text-text-muted">
          {avg
            ? `7-day average ${one(toDisplayWeight(avg.kg, units))} ${wu}.`
            : 'Weigh in each morning, after the bathroom and before eating.'}
        </Text>
        <Button variant="secondary" size="md" icon="plus" onPress={open}>
          weigh in
        </Button>
      </Card>
    );
  const kg = Number(todayRow.weight_kg);
  const vsLastWeek = lastWeek ? toDisplayWeight(kg - Number(lastWeek.weight_kg), units) : null;
  return (
    <Pressable onPress={open} accessibilityRole="button" accessibilityLabel="Edit today’s weigh-in">
      <Card padding="p-0">
        <View className="gap-1 p-5">
          <View className="flex-row items-baseline">
            <Text className="type-hero-sm text-text">{one(toDisplayWeight(kg, units))}</Text>
            <Text className="ml-1 type-headline text-text-muted">{wu}</Text>
          </View>
          <Tag kind="body" size="sm" />
          <Text className="type-headline text-text">morning weigh-in</Text>
          <Text className="type-caption text-text-muted">
            {todayRow.source === 'apple_health' ? 'from Apple Health' : 'logged today'}
          </Text>
        </View>
        <View className="flex-row rounded-b-card bg-surface-inset px-5 py-4">
          {[
            [
              vsLastWeek === null
                ? '–'
                : `${vsLastWeek > 0 ? '+' : vsLastWeek < 0 ? '−' : ''}${one(Math.abs(vsLastWeek))}`,
              'vs last week',
            ],
            [avg ? one(toDisplayWeight(avg.kg, units)) : '–', '7-day avg'],
            [`${thisWeek}/7`, 'this week'],
          ].map(([v, l]) => (
            <View key={l} className="flex-1 items-center gap-0.5">
              <Text className="type-headline text-text">{v}</Text>
              <MicroLabel>{l}</MicroLabel>
            </View>
          ))}
        </View>
      </Card>
    </Pressable>
  );
}

/** "your weekly check-in is ready" when a proposal is waiting. */
export function CheckinPrompt({ userId }: { userId: string | undefined }) {
  const week = usePendingCheckin(userId).data;
  if (!week) return null;
  return (
    <AnchorCard title="check-in ready" icon="fuel">
      <Text className="mt-2 mb-4 type-body text-on-anchor-muted">
        Last week’s averages are in and your targets for this week are ready to review.
      </Text>
      <Button
        variant="inverse"
        block
        icon="chevron-right"
        onPress={() => router.push({ pathname: '/checkin/[week]', params: { week } })}
      >
        review targets
      </Button>
    </AnchorCard>
  );
}
