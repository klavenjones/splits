import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import { Button, IconButton, NumericField, TextField } from '@/components';
import { useCreateFood, type Meal } from '@/db/queries/nutrition';

const num = (s: string) => (s.trim() === '' ? NaN : Number(s.replace(',', '.')));

/** A custom food: it goes into "my foods" and opens ready to log. */
export default function NewFood() {
  const params = useLocalSearchParams<{
    name?: string;
    meal?: Meal;
    date?: string;
    barcode?: string;
  }>();
  const { userId } = useAuth();
  const create = useCreateFood(userId);
  const [name, setName] = useState(params.name ?? '');
  const [brand, setBrand] = useState('');
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('serving');
  const [grams, setGrams] = useState('');
  const [kcal, setKcal] = useState('');
  const [p, setP] = useState('');
  const [c, setC] = useState('');
  const [f, setF] = useState('');
  const n = { qty: num(qty), kcal: num(kcal), p: num(p) || 0, c: num(c) || 0, f: num(f) || 0 };
  const valid = name.trim().length > 0 && unit.trim().length > 0 && n.qty > 0 && n.kcal >= 0;

  const save = () =>
    create.mutate(
      {
        name: name.trim(),
        brand: brand.trim() || null,
        serving_qty: n.qty,
        serving_unit: unit.trim(),
        serving_grams: num(grams) > 0 ? num(grams) : null,
        kcal: n.kcal,
        protein_g: n.p,
        fat_g: n.f,
        carbs_g: n.c,
      },
      {
        onSuccess: (food) =>
          router.replace({
            pathname: '/food/[id]',
            params: { id: food.id, meal: params.meal ?? 'snack', date: params.date ?? '' },
          }),
      },
    );

  return (
    <ScrollView
      className="flex-1 bg-bg"
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="gap-4 px-4 pt-5 pb-12"
    >
      <IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />
      <Text className="type-title text-text" accessibilityRole="header">
        create a food
      </Text>
      {params.barcode ? (
        <Text className="type-subhead text-text-muted">
          Barcode {params.barcode} wasn’t found. Copy the label and it’s saved to your foods.
        </Text>
      ) : null}
      <TextField label="name" value={name} onChangeText={setName} autoFocus={!name} />
      <TextField label="brand (optional)" value={brand} onChangeText={setBrand} />
      <View className="flex-row gap-2.5">
        <View className="w-24">
          <NumericField label="amount" value={qty} onChangeText={setQty} />
        </View>
        <View className="flex-1">
          <TextField label="unit" value={unit} onChangeText={setUnit} placeholder="cup, bar, g…" />
        </View>
        <View className="w-28">
          <NumericField label="weighs" unit="g" value={grams} onChangeText={setGrams} />
        </View>
      </View>
      <NumericField label="calories per serving" unit="kcal" value={kcal} onChangeText={setKcal} />
      <View className="flex-row gap-2.5">
        <View className="flex-1">
          <NumericField label="protein" unit="g" value={p} onChangeText={setP} />
        </View>
        <View className="flex-1">
          <NumericField label="carbs" unit="g" value={c} onChangeText={setC} />
        </View>
        <View className="flex-1">
          <NumericField label="fat" unit="g" value={f} onChangeText={setF} />
        </View>
      </View>
      <Button block icon="check" disabled={!valid} loading={create.isPending} onPress={save}>
        save food
      </Button>
      {create.error ? (
        <Text className="type-caption text-danger-text">{create.error.message}</Text>
      ) : null}
    </ScrollView>
  );
}
