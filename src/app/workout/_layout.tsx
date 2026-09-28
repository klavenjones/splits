import { Stack } from 'expo-router';

export default function WorkoutLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" options={{ gestureEnabled: false }} />
      <Stack.Screen name="summary/[id]" options={{ gestureEnabled: false }} />
      <Stack.Screen name="swap" options={{ presentation: 'modal' }} />
      <Stack.Screen name="demo" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
