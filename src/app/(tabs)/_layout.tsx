import { router, Tabs } from 'expo-router';

import { TabBar, type TabKey } from '@/components';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => (
        <TabBar
          active={state.routes[state.index].name as TabKey}
          onChange={(key) => navigation.navigate(key)}
          onAdd={() => router.push('/sheets/add')}
        />
      )}
    >
      <Tabs.Screen name="today" />
      <Tabs.Screen name="plan" />
      <Tabs.Screen name="nutrition" />
      <Tabs.Screen name="progress" />
    </Tabs>
  );
}
