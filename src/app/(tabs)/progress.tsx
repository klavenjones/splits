import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import { SafeAreaView, SegmentedControl } from '@/components';
import { toLocalDate } from '@/engine/calendar';
import { BodyView } from '@/progress/BodyView';
import { RunningView } from '@/progress/RunningView';
import { StrengthView } from '@/progress/StrengthView';

type View_ = 'strength' | 'running' | 'body';

/** Progress: strength, running and body over time. Only the chosen view is mounted. */
export default function ProgressScreen() {
  const { userId, profile } = useAuth();
  const units = profile?.unit_system ?? 'imperial';
  const today = toLocalDate(new Date());
  const [view, setView] = useState<View_>('strength');

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} className="flex-1">
        <ScrollView contentContainerClassName="gap-5 px-4 pt-4 pb-32">
          <Text className="px-1 type-display text-text" accessibilityRole="header">
            progress
          </Text>
          <SegmentedControl
            accessibilityLabel="progress views"
            segments={[
              { value: 'strength', label: 'strength' },
              { value: 'running', label: 'running' },
              { value: 'body', label: 'body' },
            ]}
            value={view}
            onChange={setView}
          />
          {view === 'strength' ? (
            <StrengthView userId={userId} units={units} today={today} />
          ) : view === 'running' ? (
            <RunningView userId={userId} units={units} today={today} />
          ) : (
            <BodyView userId={userId} units={units} today={today} />
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
