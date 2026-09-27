import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Card, Chip, FocusSlider, StepScreen, WeekPreview } from '@/components';
import { defaultSplit, splitSummary } from '@/engine/focus';
import { useDraft } from '@/onboarding/draft';

const MILEAGE = ['0–5', '5–15', '15–25', '25+'] as const;

/** Step 2: run ↔ lift focus (sets the default split), mileage, and lifting experience. */
export default function TrainingFocus() {
  const { draft, update } = useDraft();
  // Shown for context; not stored yet (no column in docs/data-model.md).
  const [mileage, setMileage] = useState<(typeof MILEAGE)[number] | null>(null);
  const mileageUnit = draft.unitSystem === 'imperial' ? 'mi' : 'km';

  return (
    <StepScreen
      step={2}
      total={5}
      onBack={() => router.back()}
      title="training focus"
      subtitle="This sets how your week splits between runs and lifts."
      footer={
        <Button
          block
          disabled={draft.experience === null}
          onPress={() => router.push('/onboarding/goal')}
        >
          continue
        </Button>
      }
    >
      <FocusSlider value={draft.focus} onChange={(focus) => update({ focus })} />
      <Text className="text-center type-subhead text-text-muted">{splitSummary(draft.focus)}</Text>

      <Card className="gap-6">
        <Text className="type-title text-text">your typical week</Text>
        <WeekPreview days={defaultSplit(draft.focus)} />
      </Card>

      <View className="gap-3">
        <Text className="px-1 type-subhead text-text-muted">current weekly mileage</Text>
        <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
          {MILEAGE.map((m) => (
            <Chip
              key={m}
              label={`${m} ${mileageUnit}`}
              selected={mileage === m}
              onPress={() => setMileage(m)}
            />
          ))}
        </View>
      </View>

      <View className="gap-3">
        <Text className="px-1 type-subhead text-text-muted">lifting experience</Text>
        <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
          <Chip
            label="beginner · under a year"
            selected={draft.experience === 'beginner'}
            onPress={() => update({ experience: 'beginner' })}
          />
          <Chip
            label="intermediate · 1 year +"
            selected={draft.experience === 'intermediate'}
            onPress={() => update({ experience: 'intermediate' })}
          />
        </View>
      </View>
    </StepScreen>
  );
}
