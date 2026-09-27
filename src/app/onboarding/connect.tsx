import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { useAuth } from '@/auth';
import { Button, cn, Icon, StepScreen, Toggle, type IconName } from '@/components';
import { useUpdateProfile } from '@/db/queries/profile';
import { size, useTheme } from '@/theme';

// Real connections arrive in build step 6; toggles are shown but not stored yet.
const APPS: { icon: IconName; tint: string; title: string; subtitle: string }[] = [
  {
    icon: 'body',
    tint: 'bg-body-soft',
    title: 'Apple Health',
    subtitle: 'runs, weight, and heart rate',
  },
  { icon: 'run', tint: 'bg-run-soft', title: 'Strava', subtitle: 'runs and splits' },
  {
    icon: 'timer',
    tint: 'bg-info-soft',
    title: 'morning reminder',
    subtitle: 'weigh-in prompt at 7:00 am',
  },
];

/** Step 5: connections (coming soon). Either button finishes onboarding and opens Today. */
export default function ConnectApps() {
  const { c } = useTheme();
  const { userId } = useAuth();
  const finish = useUpdateProfile(userId);
  const done = () => finish.mutate({ onboarding_completed_at: new Date().toISOString() });

  return (
    <StepScreen
      step={5}
      total={5}
      onBack={() => router.back()}
      title="connect apps"
      subtitle="Sync runs and weigh-ins so you log less by hand."
      footer={
        <>
          {finish.error ? (
            <Text className="text-center type-caption text-danger-text">
              {finish.error.message}
            </Text>
          ) : null}
          <Button block loading={finish.isPending} onPress={done}>
            finish setup
          </Button>
          <Button block variant="secondary" disabled={finish.isPending} onPress={done}>
            skip for now
          </Button>
        </>
      }
    >
      <View className="overflow-hidden rounded-card bg-surface-card shadow-card">
        {APPS.map((a, i) => (
          <View
            key={a.title}
            className={cn(
              'flex-row items-center gap-4 p-4',
              i < APPS.length - 1 && 'border-b border-hairline',
            )}
          >
            <View
              className={cn('items-center justify-center rounded-md', a.tint)}
              style={{ width: size.touchMin, height: size.touchMin }}
            >
              <Icon name={a.icon} size={size.iconMd} color={c.text} />
            </View>
            <View className="flex-1">
              <Text className="type-headline text-text">{a.title}</Text>
              <Text className="type-subhead text-text-muted">{a.subtitle}</Text>
            </View>
            <View className="items-end gap-1">
              <Toggle value={false} disabled accessibilityLabel={`${a.title}, available soon`} />
              <Text className="type-micro text-text-subtle">soon</Text>
            </View>
          </View>
        ))}
      </View>
      <Text className="px-1 type-subhead text-text-muted">
        Connections arrive in an upcoming update. You’ll turn them on in Settings.
      </Text>
    </StepScreen>
  );
}
