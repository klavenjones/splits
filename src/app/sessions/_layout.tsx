import { Stack } from 'expo-router';

export default function SessionsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="add" />
      <Stack.Screen name="fill" />
      <Stack.Screen name="reschedule" options={{ presentation: 'modal' }} />
      <Stack.Screen name="skip" options={{ presentation: 'transparentModal', animation: 'fade' }} />
    </Stack>
  );
}
