import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import { Button, Card, MicroLabel, SafeAreaView, TopNav } from '@/components';
import { useExercises } from '@/db/queries/exercises';
import { pickExercises } from '@/exercises/picker';

/** Dev harness for the exercise picker until the template builder (step 3) uses it. */
export default function PickerHarness() {
  const { userId } = useAuth();
  const list = useExercises(userId);
  const [picked, setPicked] = useState<string[] | null>(null);
  const names = (picked ?? []).map((id) => list.data?.find((e) => e.id === id)?.name ?? id);

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} className="flex-1">
        <ScrollView contentContainerClassName="gap-5 px-4 pt-2 pb-12">
          <TopNav onBack={() => router.back()} title="picker harness" />
          <Button onPress={async () => setPicked(await pickExercises())}>open picker</Button>
          <Button
            variant="secondary"
            onPress={async () =>
              setPicked(await pickExercises({ title: 'swap exercise', single: true }))
            }
          >
            open single-pick
          </Button>
          <Card className="gap-2">
            <MicroLabel>result</MicroLabel>
            <Text className="type-body text-text" accessibilityLabel="picker result">
              {picked === null ? 'cancelled / none' : names.join(', ') || 'empty'}
            </Text>
            <Text className="type-caption text-text-muted">{JSON.stringify(picked)}</Text>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
