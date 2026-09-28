import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import {
  EmptyState,
  FoodRow,
  Icon,
  ImpactFooter,
  MicroLabel,
  SearchField,
  SegmentedControl,
  type IconName,
} from '@/components';
import { supabase } from '@/db/client';
import {
  cacheFood,
  MEAL_LABEL,
  MEALS,
  searchFoods,
  totals,
  useDiary,
  useLogFoods,
  useLogSavedMeal,
  useMyFoods,
  useRecentFoods,
  useSavedMeals,
  useTargetsOn,
  type Food,
  type LogItem,
  type Meal,
} from '@/db/queries/nutrition';
import { addDays, toLocalDate } from '@/engine/calendar';
import type { FoodCandidate } from '@/food/normalize';
import { showMenu } from '@/lib/menu';
import { kcalText, servingText } from '@/nutrition/describe';
import { size, useTheme } from '@/theme';

type Item = Food | FoodCandidate;
/**
 * Servings of the cached food that match the amount shown in search: a food cached earlier keeps
 * its own serving, so convert by grams when both are known.
 */
function sameAmount(shown: Item, cached: Food): number {
  const a = Number(shown.serving_grams);
  const b = Number(cached.serving_grams);
  return a > 0 && b > 0 && Math.abs(a - b) > 0.05 ? Math.round((a / b) * 1000) / 1000 : 1;
}

const keyOf = (f: Item) => ('id' in f ? f.id : `${f.source}:${f.external_id}`);

function useDebounced(value: string, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Food search (mockup 05/02): search, recent, my meals, my foods; pick several, log at once. */
export default function FoodSearchSheet() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ meal?: Meal; date?: string }>();
  const { userId } = useAuth();
  const today = toLocalDate(new Date());
  const date = params.date ?? today;
  const [meal, setMeal] = useState<Meal>(params.meal ?? 'breakfast');
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'all' | 'meals' | 'foods'>('all');
  const [picked, setPicked] = useState<Map<string, Item>>(new Map());
  const [busy, setBusy] = useState(false);
  const term = useDebounced(q.trim(), 350);

  const recent = useRecentFoods(userId, today);
  const mine = useMyFoods(userId);
  const meals = useSavedMeals(userId);
  const diary = useDiary(userId, date);
  const targets = useTargetsOn(userId, date).data;
  const log = useLogFoods(userId);
  const logMeal = useLogSavedMeal(userId);
  const results = useQuery({
    queryKey: ['food-search', term],
    enabled: !!userId && term.length >= 2,
    staleTime: 10 * 60_000,
    queryFn: () => searchFoods(term, userId!),
  });

  const toggle = (f: Item) =>
    setPicked((m) => {
      const next = new Map(m);
      if (next.has(keyOf(f))) next.delete(keyOf(f));
      else next.set(keyOf(f), f);
      return next;
    });

  const open = async (f: Item) => {
    try {
      setBusy(true);
      const food = await cacheFood(f);
      router.push({ pathname: '/food/[id]', params: { id: food.id, meal, date } });
    } catch (e) {
      Alert.alert('Couldn’t open that food', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const chosen = [...picked.values()];
  const add = chosen.reduce(
    (t, f) => ({ kcal: t.kcal + Number(f.kcal), protein: t.protein + Number(f.protein_g) }),
    { kcal: 0, protein: 0 },
  );
  const eaten = totals(diary.data ?? []);

  const submit = async () => {
    try {
      setBusy(true);
      const foods = await Promise.all(chosen.map(cacheFood));
      await log.mutateAsync({
        date,
        meal,
        items: foods.map((f, i): LogItem => ({
          food_id: f.id,
          servings: sameAmount(chosen[i], f),
        })),
      });
      router.back();
    } catch (e) {
      Alert.alert('Couldn’t log that', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copyMeal = async () => {
    const days = [1, 2, 3].map((n) => addDays(date, -n));
    const { data } = await supabase
      .from('food_logs')
      .select('log_date, meal, food_id, servings, name_snapshot, kcal, protein_g, fat_g, carbs_g')
      .in('log_date', days);
    const groups = new Map<string, NonNullable<typeof data>>();
    for (const l of data ?? []) {
      const k = `${l.log_date}|${l.meal}`;
      groups.set(k, [...(groups.get(k) ?? []), l]);
    }
    if (!groups.size) return Alert.alert('Nothing to copy', 'No meals logged in the last 3 days.');
    showMenu('copy a meal', [
      ...[...groups.entries()].map(([k, items]) => {
        const [d, m] = k.split('|');
        return {
          label: `${d === addDays(date, -1) ? 'yesterday' : d} · ${MEAL_LABEL[m as Meal]} (${kcalText(items.reduce((s, i) => s + Number(i.kcal), 0))} kcal)`,
          onPress: () =>
            log.mutate(
              {
                date,
                meal,
                items: items.map((i): LogItem =>
                  i.food_id
                    ? { food_id: i.food_id, servings: Number(i.servings) }
                    : {
                        name: i.name_snapshot,
                        kcal: Number(i.kcal),
                        protein_g: Number(i.protein_g),
                        fat_g: Number(i.fat_g),
                        carbs_g: Number(i.carbs_g),
                      },
                ),
              },
              { onSuccess: () => router.back() },
            ),
        };
      }),
    ]);
  };

  const list: Item[] =
    term.length >= 2
      ? (results.data ?? [])
      : tab === 'foods'
        ? (mine.data ?? [])
        : (recent.data ?? []);
  const action = (icon: IconName, label: string, onPress: () => void) => (
    <Pressable
      key={label}
      onPress={onPress}
      accessibilityRole="button"
      className="flex-1 items-center gap-2 rounded-card bg-surface-card px-2 py-3 shadow-card active:opacity-80"
    >
      <View className="h-11 w-11 items-center justify-center rounded-pill bg-fuel-soft">
        <Icon name={icon} size={size.iconMd} color={c.fuelText} />
      </View>
      <Text className="type-label text-text">{label}</Text>
    </Pressable>
  );

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-4 px-4 pt-5 pb-6"
      >
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12}>
            <Icon name="x" size={size.iconLg} color={c.text} />
          </Pressable>
          <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12}>
            <Text className="type-label text-text">done</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() =>
            showMenu(
              'add to',
              MEALS.map((m) => ({ label: MEAL_LABEL[m], onPress: () => setMeal(m) })),
            )
          }
          accessibilityRole="button"
          accessibilityLabel={`Add to ${MEAL_LABEL[meal]}, change meal`}
          className="flex-row items-center gap-1 self-start"
        >
          <Text className="type-title text-text">add to {MEAL_LABEL[meal]}</Text>
          <Icon name="chevron-down" size={size.iconMd} color={c.text} />
        </Pressable>
        <SearchField value={q} onChangeText={setQ} placeholder="Search foods" autoCorrect={false} />
        {term.length < 2 ? (
          <>
            <SegmentedControl
              accessibilityLabel="food lists"
              segments={[
                { value: 'all', label: 'all' },
                { value: 'meals', label: 'my meals' },
                { value: 'foods', label: 'my foods' },
              ]}
              value={tab}
              onChange={setTab}
            />
            <View className="flex-row gap-2.5">
              {action('camera', 'scan barcode', () =>
                router.push({ pathname: '/food/scan', params: { meal, date } }),
              )}
              {action('flame', 'quick add', () =>
                router.push({ pathname: '/food/quick-add', params: { meal, date } }),
              )}
              {action('repeat', 'copy a meal', () => void copyMeal())}
            </View>
          </>
        ) : null}

        {tab === 'meals' && term.length < 2 ? (
          <View className="gap-2">
            {(meals.data ?? []).map((m) => {
              const kcal = m.saved_meal_items.reduce(
                (s, i) => s + Number(i.foods.kcal) * Number(i.servings),
                0,
              );
              return (
                <FoodRow
                  key={m.id}
                  name={m.name}
                  detail={`${m.saved_meal_items.length} items · tap to log`}
                  kcal={kcal}
                  onPress={() =>
                    logMeal.mutate({ id: m.id, date, meal }, { onSuccess: () => router.back() })
                  }
                />
              );
            })}
            <Pressable
              onPress={() => router.push({ pathname: '/food/saved-meal' })}
              accessibilityRole="button"
              className="flex-row items-center gap-2 py-3"
            >
              <Icon name="plus" size={size.iconMd} color={c.fuelText} />
              <Text className="type-label text-fuel-text">create a saved meal</Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-1">
            <MicroLabel className="px-1">
              {term.length >= 2
                ? 'results'
                : tab === 'foods'
                  ? 'my foods'
                  : 'recent · most logged first'}
            </MicroLabel>
            {results.isFetching && term.length >= 2 ? (
              <ActivityIndicator color={c.textMuted} />
            ) : null}
            {list.map((f, i) => (
              <FoodRow
                key={keyOf(f)}
                name={f.name}
                detail={
                  <>
                    {servingText(f)}
                    {f.brand ? ` · ${f.brand}` : ''} ·{' '}
                    <Text className="text-fuel-text">{Math.round(Number(f.protein_g))} g</Text>{' '}
                    protein
                  </>
                }
                kcal={Number(f.kcal)}
                added={picked.has(keyOf(f))}
                onToggle={() => toggle(f)}
                onPress={() => void open(f)}
                divider={i < list.length - 1}
              />
            ))}
            {!list.length && !results.isFetching ? (
              <EmptyState
                icon="fuel"
                title={
                  term.length >= 2
                    ? 'no matches'
                    : tab === 'foods'
                      ? 'no foods of your own yet'
                      : 'nothing logged yet'
                }
                body={
                  term.length >= 2
                    ? 'Try another word, or create the food.'
                    : 'Search above to find a food.'
                }
              />
            ) : null}
            {tab === 'foods' || term.length >= 2 ? (
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/food/new', params: { name: q, meal, date } })
                }
                accessibilityRole="button"
                className="flex-row items-center gap-2 py-3"
              >
                <Icon name="plus" size={size.iconMd} color={c.fuelText} />
                <Text className="type-label text-fuel-text">create a food</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>
      <ImpactFooter
        count={chosen.length}
        kcal={add.kcal}
        protein={add.protein}
        kcalLeft={(targets?.kcal_target ?? 0) - eaten.kcal - add.kcal}
        proteinLeft={(targets?.protein_g ?? 0) - eaten.protein - add.protein}
        action={`log ${MEAL_LABEL[meal]}`}
        loading={busy || log.isPending}
        onLog={() => void submit()}
      />
    </View>
  );
}
