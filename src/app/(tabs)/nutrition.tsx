import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import {
  Button,
  CalorieBar,
  Card,
  EmptyState,
  ErrorBoundary,
  FoodRow,
  Icon,
  IconButton,
  MacroBars,
  MealCard,
  SafeAreaView,
  TipCard,
} from '@/components';
import {
  MEAL_LABEL,
  MEALS,
  totals,
  useDeleteLog,
  useDaysLogged,
  useDiary,
  useTargetsOn,
  type FoodLog,
  type Meal,
} from '@/db/queries/nutrition';
import { addDays, mondayOf, toLocalDate } from '@/engine/calendar';
import { showMenu } from '@/lib/menu';
import { useCheckinStatus } from '@/nutrition/checkinStatus';
import { kcalText, servingText } from '@/nutrition/describe';
import { runCheckinIfDue } from '@/nutrition/NutritionProvider';
import { longDay } from '@/plan/week';
import { size, useTheme } from '@/theme';

const WEEKDAY = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Food diary (mockup 05/01): calories left, macros, the day's meals, the check-in reminder. */
export default function NutritionScreen() {
  const { c } = useTheme();
  const { userId, profile } = useAuth();
  const today = toLocalDate(new Date());
  const [date, setDate] = useState(today);
  const diary = useDiary(userId, date);
  const targets = useTargetsOn(userId, date).data;
  const remove = useDeleteLog(userId);
  const logs = diary.data ?? [];
  const eaten = totals(logs);
  const target = targets?.kcal_target ?? 0;
  const left = target - eaten.kcal;
  const isToday = date === today;

  const add = (meal: Meal) =>
    router.push({ pathname: '/sheets/food-search', params: { meal, date } });
  const editLog = (l: FoodLog) =>
    showMenu(l.name_snapshot, [
      {
        label: 'change servings',
        onPress: () => router.push({ pathname: '/food/log/[id]', params: { id: l.id } }),
      },
      {
        label: 'delete',
        destructive: true,
        onPress: () =>
          Alert.alert(`Delete ${l.name_snapshot}?`, undefined, [
            { text: 'cancel', style: 'cancel' },
            { text: 'delete', style: 'destructive', onPress: () => remove.mutate(l.id) },
          ]),
      },
    ]);

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} className="flex-1">
        <ScrollView contentContainerClassName="gap-4 px-4 pt-4 pb-32">
          <View className="flex-row items-center justify-between px-1">
            <Text className="type-display text-text" accessibilityRole="header">
              nutrition
            </Text>
            <IconButton
              icon="gear"
              label="Goal and targets"
              onPress={() => router.push('/settings/nutrition')}
            />
          </View>

          <View className="flex-row items-center justify-between">
            <IconButton
              icon="chevron-left"
              label="Previous day"
              onPress={() => setDate(addDays(date, -1))}
            />
            <View className="items-center">
              <Text className="type-headline text-text">
                {isToday ? 'today' : date === addDays(today, -1) ? 'yesterday' : longDay(date)}
              </Text>
              <Text className="type-subhead text-text-muted">{longDay(date)}</Text>
            </View>
            <Pressable
              onPress={() => setDate(addDays(date, 1))}
              disabled={isToday}
              accessibilityRole="button"
              accessibilityLabel="Next day"
              className={`h-12 w-12 items-center justify-center rounded-pill bg-surface-card shadow-card ${isToday ? 'opacity-40' : ''}`}
            >
              <Icon name="chevron-right" size={size.iconMd} color={c.text} />
            </Pressable>
          </View>

          <Card className="gap-5">
            <View className="flex-row items-baseline gap-x-2">
              <Text className="shrink type-hero text-text" numberOfLines={1} adjustsFontSizeToFit>
                {kcalText(Math.abs(left))}
              </Text>
              <Text className="type-headline text-text">kcal {left >= 0 ? 'left' : 'over'}</Text>
            </View>
            <CalorieBar eaten={eaten.kcal} target={target} />
            <View className="h-px bg-hairline" />
            <MacroBars
              macros={[
                { key: 'protein', eaten: eaten.protein, target: targets?.protein_g ?? 0 },
                { key: 'fat', eaten: eaten.fat, target: targets?.fat_g ?? 0 },
                { key: 'carbs', eaten: eaten.carbs, target: targets?.carbs_g ?? 0 },
              ]}
            />
          </Card>

          {diary.isPending ? (
            <ActivityIndicator color={c.textMuted} />
          ) : diary.error ? (
            <EmptyState icon="alert" title="Couldn’t load the diary" body={diary.error.message} />
          ) : (
            MEALS.map((meal) => {
              const items = logs.filter((l) => l.meal === meal);
              return (
                <MealCard
                  key={meal}
                  title={MEAL_LABEL[meal]}
                  kcal={totals(items).kcal}
                  kcalLeft={left}
                  empty={!items.length}
                  onAdd={() => add(meal)}
                >
                  {items.map((l, i) => (
                    <FoodRow
                      key={l.id}
                      name={l.name_snapshot}
                      detail={l.foods ? servingText(l.foods, Number(l.servings)) : 'quick add'}
                      kcal={Number(l.kcal)}
                      divider={i < items.length - 1}
                      onPress={() => editLog(l)}
                    />
                  ))}
                </MealCard>
              );
            })
          )}

          <ErrorBoundary name="nutrition.checkin" title="couldn’t show your check-in">
            <CheckinReminder
              weekday={profile?.checkin_weekday ?? 1}
              weekStart={mondayOf(today)}
              today={today}
            />
          </ErrorBoundary>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/** "weekly check-in on Monday · 6 of 7 days logged so far." */
function CheckinReminder({
  weekday,
  weekStart,
  today,
}: {
  weekday: number;
  weekStart: string;
  today: string;
}) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const logged = useDaysLogged(userId, weekStart, today).data;
  const failed = useCheckinStatus().failed;
  const [retrying, setRetrying] = useState(false);
  if (failed && userId)
    return (
      <TipCard tone="warning" icon="alert" title="couldn’t prepare your check-in">
        <View className="items-start gap-3">
          <Text className="type-body text-text">
            Your logs are safe. It’s been reported; try again now or it retries when you reopen
            Splits.
          </Text>
          <Button
            size="sm"
            variant="secondary"
            icon="undo"
            loading={retrying}
            onPress={() => {
              setRetrying(true);
              void runCheckinIfDue(userId, weekday, qc).finally(() => setRetrying(false));
            }}
          >
            try again
          </Button>
        </View>
      </TipCard>
    );
  return (
    <TipCard tone="info" title={`weekly check-in on ${WEEKDAY[weekday]}`}>
      {logged === undefined ? '…' : `${logged} of 7 days logged so far.`}
    </TipCard>
  );
}
