import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import {
  Button,
  Card,
  Chip,
  ChipGroup,
  IconButton,
  MacroTile,
  MicroLabel,
  NumericField,
  Stepper,
} from '@/components';
import {
  MEAL_LABEL,
  totals,
  useDiary,
  useFood,
  useLogFoods,
  useTargetsOn,
  type Meal,
} from '@/db/queries/nutrition';
import { toLocalDate } from '@/engine/calendar';
import { exitFood } from '@/lib/nav';
import { kcalText, servingText } from '@/nutrition/describe';
import { useTheme } from '@/theme';

/** Food detail (mockup 05/03): serving, number of servings, nutrition, impact, add to meal. */
export default function FoodDetail() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ id: string; meal?: Meal; date?: string }>();
  const { userId } = useAuth();
  const date = params.date ?? toLocalDate(new Date());
  const meal = params.meal ?? 'snack';
  const food = useFood(params.id).data;
  const diary = useDiary(userId, date);
  const targets = useTargetsOn(userId, date).data;
  const log = useLogFoods(userId);
  const [servings, setServings] = useState(1);
  const [grams, setGrams] = useState<string | null>(null);

  if (!food)
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color={c.textMuted} />
      </View>
    );

  const perGram = food.serving_grams ? 1 / Number(food.serving_grams) : null;
  const n = grams !== null && perGram ? (Number(grams) || 0) * perGram : servings;
  const kcal = Number(food.kcal) * n;
  const left = (targets?.kcal_target ?? 0) - totals(diary.data ?? []).kcal - kcal;

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-5 px-4 pt-5 pb-12"
      >
        <IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />
        <View className="gap-1">
          <Text className="type-title text-text" accessibilityRole="header">
            {food.name}
          </Text>
          {food.brand ? <Text className="type-subhead text-text-muted">{food.brand}</Text> : null}
        </View>

        <Card className="gap-4">
          <MicroLabel>serving size</MicroLabel>
          <ChipGroup label="serving unit">
            <Chip
              label={servingText(food)}
              selected={grams === null}
              onPress={() => setGrams(null)}
            />
            {perGram ? (
              <Chip
                label="grams"
                selected={grams !== null}
                onPress={() => setGrams(String(Math.round(Number(food.serving_grams) * servings)))}
              />
            ) : null}
          </ChipGroup>
          {grams === null ? (
            <View className="flex-row items-center justify-between">
              <Text className="type-headline text-text">servings</Text>
              <Stepper
                label="servings"
                value={servings}
                onChange={setServings}
                min={0.25}
                max={20}
                step={0.25}
                format={(v) => String(v)}
              />
            </View>
          ) : (
            <NumericField label="amount" unit="g" value={grams} onChangeText={setGrams} autoFocus />
          )}
        </Card>

        <Card className="gap-4">
          <View className="flex-row items-baseline gap-2">
            <Text className="type-hero-sm text-text">{kcalText(kcal)}</Text>
            <Text className="type-headline text-text">kcal</Text>
          </View>
          <View className="flex-row gap-2.5">
            <MacroTile letter="P" label="protein" grams={Math.round(Number(food.protein_g) * n)} />
            <MacroTile letter="C" label="carbs" grams={Math.round(Number(food.carbs_g) * n)} />
            <MacroTile letter="F" label="fat" grams={Math.round(Number(food.fat_g) * n)} />
          </View>
          <Text className="type-subhead text-text-muted">
            After this: <Text className="type-label text-text">{kcalText(Math.abs(left))}</Text>{' '}
            kcal {left >= 0 ? 'left today' : 'over today'}.
          </Text>
        </Card>

        <Button
          block
          icon="plus"
          disabled={n <= 0}
          loading={log.isPending}
          onPress={() =>
            log.mutate(
              { date, meal, items: [{ food_id: food.id, servings: Math.round(n * 1000) / 1000 }] },
              { onSuccess: exitFood },
            )
          }
        >
          {`add to ${MEAL_LABEL[meal]}`}
        </Button>
        {log.error ? (
          <Text className="type-caption text-danger-text">{log.error.message}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
