import { Stack } from 'expo-router';

import { radius } from '@/theme';

const sheet = {
  presentation: 'formSheet',
  sheetAllowedDetents: 'fitToContents',
  sheetGrabberVisible: true,
  sheetCornerRadius: radius.sheet,
} as const;

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="profile" options={sheet} />
      <Stack.Screen name="units" options={sheet} />
      <Stack.Screen name="focus" options={sheet} />
    </Stack>
  );
}
