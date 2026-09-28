import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import { Button, IconButton, NumericField, TextField, TipCard } from '@/components';
import { MEAL_LABEL, useLogFoods, type Meal } from '@/db/queries/nutrition';
import { toLocalDate } from '@/engine/calendar';
import { exitFood } from '@/lib/nav';
import { macrosFit } from '@/nutrition/describe';

const num = (s: string) => (s.trim() === '' ? 0 : Number(s.replace(',', '.')));

/** Quick add (mockup 05/04): calories and macros only, with an optional name. */
export default function QuickAdd() {
  const params = useLocalSearchParams<{ meal?: Meal; date?: string }>();
  const { userId } = useAuth();
  const meal = params.meal ?? 'snack';
  const date = params.date ?? toLocalDate(new Date());
  const log = useLogFoods(userId);
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [p, setP] = useState('');
  const [cb, setC] = useState('');
  const [f, setF] = useState('');
  const values = [kcal, p, cb, f].map(num);
  const valid = values.every((v) => Number.isFinite(v) && v >= 0) && values[0] > 0;
  const fits = macrosFit(values[0], values[1], values[3], values[2]);

  return (
    <ScrollView
      className="flex-1 bg-bg"
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="gap-4 px-4 pt-5 pb-12"
    >
      <IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />
      <Text className="type-title text-text" accessibilityRole="header">
        quick add to {MEAL_LABEL[meal]}
      </Text>
      <TextField
        label="name (optional)"
        value={name}
        onChangeText={setName}
        placeholder="e.g. office cookies"
      />
      <NumericField label="calories" unit="kcal" value={kcal} onChangeText={setKcal} autoFocus />
      <View className="flex-row gap-2.5">
        <View className="flex-1">
          <NumericField label="protein" unit="g" value={p} onChangeText={setP} />
        </View>
        <View className="flex-1">
          <NumericField label="carbs" unit="g" value={cb} onChangeText={setC} />
        </View>
        <View className="flex-1">
          <NumericField label="fat" unit="g" value={f} onChangeText={setF} />
        </View>
      </View>
      {!fits ? (
        <TipCard icon="alert" title="the macros don’t add up">
          {`Protein and carbs are 4 kcal per gram and fat is 9: these come to ${Math.round(values[1] * 4 + values[2] * 4 + values[3] * 9)} kcal, not ${Math.round(values[0])}.`}
        </TipCard>
      ) : null}
      <Button
        block
        icon="plus"
        disabled={!valid}
        loading={log.isPending}
        onPress={() =>
          log.mutate(
            {
              date,
              meal,
              items: [
                {
                  name: name.trim() || undefined,
                  kcal: values[0],
                  protein_g: values[1],
                  carbs_g: values[2],
                  fat_g: values[3],
                },
              ],
            },
            { onSuccess: exitFood },
          )
        }
      >
        {`add to ${MEAL_LABEL[meal]}`}
      </Button>
    </ScrollView>
  );
}
