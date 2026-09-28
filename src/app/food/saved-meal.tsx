import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import {
  Button,
  Card,
  FoodRow,
  IconButton,
  MicroLabel,
  SearchField,
  Stepper,
  TextField,
} from '@/components';
import {
  cacheFood,
  searchFoods,
  useDeleteSavedMeal,
  useRecentFoods,
  useSavedMeals,
  useSaveMeal,
  type Food,
} from '@/db/queries/nutrition';
import { toLocalDate } from '@/engine/calendar';
import type { FoodCandidate } from '@/food/normalize';
import { kcalText, servingText } from '@/nutrition/describe';

type Line = { food: Food; servings: number };

/** Create or edit a saved meal (mockup 05/05): a named combo of foods that logs in one tap. */
export default function SavedMealEditor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { userId } = useAuth();
  const existing = useSavedMeals(userId).data?.find((m) => m.id === id);
  const save = useSaveMeal(userId);
  const remove = useDeleteSavedMeal(userId);
  const recent = useRecentFoods(userId, toLocalDate(new Date())).data ?? [];
  const [name, setName] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[] | null>(null);
  const [q, setQ] = useState('');
  const results = useQuery({
    queryKey: ['food-search', q.trim()],
    enabled: !!userId && q.trim().length >= 2,
    queryFn: () => searchFoods(q.trim(), userId!),
  });

  const items: Line[] =
    lines ??
    existing?.saved_meal_items.map((i) => ({ food: i.foods, servings: Number(i.servings) })) ??
    [];
  const title = name ?? existing?.name ?? '';
  const total = items.reduce((s, l) => s + Number(l.food.kcal) * l.servings, 0);

  const addFood = async (f: Food | FoodCandidate) => {
    try {
      const food = await cacheFood(f);
      setLines([...items, { food, servings: 1 }]);
      setQ('');
    } catch (e) {
      Alert.alert('Couldn’t add that food', (e as Error).message);
    }
  };

  const choices = q.trim().length >= 2 ? (results.data ?? []) : recent.slice(0, 8);

  return (
    <ScrollView
      className="flex-1 bg-bg"
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="gap-4 px-4 pt-5 pb-12"
    >
      <IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />
      <Text className="type-title text-text" accessibilityRole="header">
        {existing ? 'edit saved meal' : 'new saved meal'}
      </Text>
      <TextField
        label="name"
        value={title}
        onChangeText={setName}
        placeholder="e.g. usual breakfast"
      />

      <Card className="gap-2">
        {items.length ? (
          items.map((l, i) => (
            <View
              key={`${l.food.id}-${i}`}
              className="flex-row items-center gap-3 border-b border-hairline py-2"
            >
              <View className="flex-1">
                <Text className="type-body-strong text-text">{l.food.name}</Text>
                <Text className="type-caption text-text-muted">
                  {servingText(l.food, l.servings)} · {kcalText(Number(l.food.kcal) * l.servings)}{' '}
                  kcal
                </Text>
              </View>
              <Stepper
                compact
                label={`${l.food.name} servings`}
                value={l.servings}
                min={0}
                max={20}
                step={0.5}
                onChange={(v) =>
                  setLines(
                    v === 0
                      ? items.filter((_, j) => j !== i)
                      : items.map((x, j) => (j === i ? { ...x, servings: v } : x)),
                  )
                }
              />
            </View>
          ))
        ) : (
          <Text className="type-body text-text-muted">Add foods below.</Text>
        )}
        <View className="flex-row justify-between pt-2">
          <MicroLabel>meal total</MicroLabel>
          <Text className="type-headline text-fuel-text">{kcalText(total)} kcal</Text>
        </View>
      </Card>
      <Text className="px-1 type-caption text-text-muted">
        Saved meals log in one tap from “my meals”.
      </Text>

      <SearchField value={q} onChangeText={setQ} placeholder="Add a food" autoCorrect={false} />
      <View>
        {choices.map((f, i) => (
          <FoodRow
            key={'id' in f ? f.id : `${f.source}:${f.external_id}`}
            name={f.name}
            detail={servingText(f)}
            kcal={Number(f.kcal)}
            added={false}
            onToggle={() => void addFood(f)}
            divider={i < choices.length - 1}
          />
        ))}
      </View>

      <Button
        block
        icon="check"
        disabled={!title.trim() || !items.length}
        loading={save.isPending}
        onPress={() =>
          save.mutate(
            {
              id: existing?.id,
              name: title.trim(),
              items: items.map((l) => ({ food_id: l.food.id, servings: l.servings })),
            },
            { onSuccess: () => router.back() },
          )
        }
      >
        save meal
      </Button>
      {existing ? (
        <Pressable
          onPress={() => remove.mutate(existing.id, { onSuccess: () => router.back() })}
          accessibilityRole="button"
          className="items-center py-3"
        >
          <Text className="type-label text-danger-text">delete saved meal</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}
