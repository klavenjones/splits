import { Stack } from 'expo-router';

import { DraftProvider } from '@/onboarding/draft';

export const unstable_settings = { initialRouteName: 'about' };

export default function OnboardingLayout() {
  return (
    <DraftProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </DraftProvider>
  );
}
