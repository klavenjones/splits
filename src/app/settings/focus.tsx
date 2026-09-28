import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useAuth } from '@/auth';
import { Button, FocusSlider, WeekPreview } from '@/components';
import { useUpdateProfile } from '@/db/queries/profile';
import { defaultSplit, splitSummary, type Focus } from '@/engine/focus';

/** Change training focus: preview the split, then save. */
export default function FocusSetting() {
  const { userId, profile } = useAuth();
  const update = useUpdateProfile(userId);
  const [focus, setFocus] = useState<Focus>(profile?.focus ?? 'balanced');

  return (
    <View className="gap-5 bg-surface-card px-5 pt-6 pb-10">
      <Text className="type-title text-text" accessibilityRole="header">
        training focus
      </Text>
      <FocusSlider value={focus} onChange={setFocus} />
      <Text className="text-center type-subhead text-text-muted">{splitSummary(focus)}</Text>
      <WeekPreview days={defaultSplit(focus)} />
      <Text className="type-caption text-text-muted">
        Sets the split used by “fill week from focus” on the Plan tab. Weeks you’ve already planned
        stay as they are.
      </Text>
      {update.error ? (
        <Text className="type-caption text-danger-text">{update.error.message}</Text>
      ) : null}
      <Button
        block
        loading={update.isPending}
        disabled={focus === profile?.focus}
        onPress={() => update.mutate({ focus }, { onSuccess: () => router.back() })}
      >
        save focus
      </Button>
    </View>
  );
}
