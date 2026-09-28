import { router, Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ResumeBar, TabBar, type TabKey } from '@/components';
import { useWorkout } from '@/store/workout';
import { size } from '@/theme';
import { formatElapsed, useNow } from '@/workout/useNow';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => (
        <>
          <WorkoutInProgress />
          <TabBar
            active={state.routes[state.index].name as TabKey}
            onChange={(key) => navigation.navigate(key)}
            onAdd={() => router.push('/sheets/add')}
          />
        </>
      )}
    >
      <Tabs.Screen name="today" />
      <Tabs.Screen name="plan" />
      <Tabs.Screen name="nutrition" />
      <Tabs.Screen name="progress" />
    </Tabs>
  );
}

/** "in progress · 24:18 · resume" above the tab bar while the logger is closed. */
function WorkoutInProgress() {
  const active = useWorkout((s) => s.active);
  const insets = useSafeAreaInsets();
  if (!active) return null;
  return (
    <View className="absolute right-3 left-3" style={{ bottom: size.tabbarH + insets.bottom - 12 }}>
      <Elapsed
        name={active.name}
        startedAt={active.started_at}
        onPress={() => router.push({ pathname: '/workout/[id]', params: { id: active.id } })}
      />
    </View>
  );
}

function Elapsed({
  name,
  startedAt,
  onPress,
}: {
  name: string;
  startedAt: string;
  onPress: () => void;
}) {
  const now = useNow(1000);
  return (
    <ResumeBar name={name} elapsed={formatElapsed(now - Date.parse(startedAt))} onPress={onPress} />
  );
}
