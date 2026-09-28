import { Stack } from 'expo-router';

export default function TemplatesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
      {/* Page sheets (like the exercise picker): native form sheets don't lay out long scrolling forms. */}
      <Stack.Screen name="segment" options={{ presentation: 'modal' }} />
      <Stack.Screen name="exercise" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
