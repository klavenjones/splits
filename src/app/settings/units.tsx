import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { useAuth } from '@/auth';
import { RadioOptionCard } from '@/components';
import { useUpdateProfile } from '@/db/queries/profile';
import type { UnitSystem } from '@/units';

const OPTIONS: { value: UnitSystem; title: string; subtitle: string }[] = [
  { value: 'imperial', title: 'imperial', subtitle: 'lb · in · mi' },
  { value: 'metric', title: 'metric', subtitle: 'kg · cm · km' },
];

/** Display units. Data stays metric; only what's shown changes. */
export default function Units() {
  const { userId, profile } = useAuth();
  const update = useUpdateProfile(userId);

  return (
    <View className="gap-3 bg-surface-card px-5 pt-6 pb-10">
      <Text className="mb-2 type-title text-text" accessibilityRole="header">
        units
      </Text>
      {OPTIONS.map((o) => (
        <RadioOptionCard
          key={o.value}
          title={o.title}
          subtitle={o.subtitle}
          selected={profile?.unit_system === o.value}
          onPress={() =>
            update.mutate({ unit_system: o.value }, { onSuccess: () => router.back() })
          }
        />
      ))}
      {update.error ? (
        <Text className="type-caption text-danger-text">{update.error.message}</Text>
      ) : null}
    </View>
  );
}
