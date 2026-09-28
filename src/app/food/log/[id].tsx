import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import { Button, Card, IconButton, Stepper } from '@/components';
import { supabase } from '@/db/client';
import { useUpdateLogServings, type FoodLog } from '@/db/queries/nutrition';
import { kcalText } from '@/nutrition/describe';
import { useTheme } from '@/theme';

/** Change the servings of a logged food; its snapshot scales with them. */
export default function EditLog() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const q = useQuery({
    queryKey: ['food-log', id],
    queryFn: async (): Promise<FoodLog> => {
      const { data, error } = await supabase
        .from('food_logs')
        .select('*, foods(serving_qty, serving_unit)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as unknown as FoodLog;
    },
  });
  const update = useUpdateLogServings(userId);
  const [servings, setServings] = useState<number | null>(null);
  const log = q.data;
  if (!log)
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color={c.textMuted} />
      </View>
    );
  const n = servings ?? Number(log.servings);
  const kcal = (Number(log.kcal) / Number(log.servings)) * n;
  return (
    <View className="flex-1 gap-5 bg-bg px-4 pt-5">
      <IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />
      <Text className="type-title text-text" accessibilityRole="header">
        {log.name_snapshot}
      </Text>
      <Card className="gap-4">
        <View className="flex-row items-center justify-between">
          <Text className="type-headline text-text">servings</Text>
          <Stepper
            label="servings"
            value={n}
            onChange={setServings}
            min={0.25}
            max={20}
            step={0.25}
          />
        </View>
        <Text className="type-subhead text-text-muted">
          <Text className="type-label text-text">{kcalText(kcal)}</Text> kcal
        </Text>
      </Card>
      <Button
        block
        icon="check"
        loading={update.isPending}
        onPress={() => update.mutate({ log, servings: n }, { onSuccess: () => router.back() })}
      >
        save
      </Button>
    </View>
  );
}
