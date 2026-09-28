import '@/global.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from '@/auth';
import { persistQueryCache, restoreQueryCache, wireOnlineManager } from '@/db/persist';
import { HealthProvider } from '@/health/HealthProvider';
import { WorkoutProvider } from '@/workout/WorkoutProvider';
import { radius, useSplitsFonts } from '@/theme';

SplashScreen.preventAutoHideAsync();

const sheet = {
  presentation: 'formSheet',
  sheetAllowedDetents: 'fitToContents',
  sheetGrabberVisible: true,
  sheetCornerRadius: radius.sheet,
} as const;

export default function RootLayout() {
  const [queryClient] = useState(() => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: 1, staleTime: 30_000, gcTime: 24 * 60 * 60_000 } },
    });
    // Offline: restore the last saved cache before anything renders, keep saving it, and pause
    // queries while there's no connection.
    restoreQueryCache(qc);
    persistQueryCache(qc);
    wireOnlineManager();
    return qc;
  });
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootStack />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

/** Signed out → welcome; signed in without onboarding → onboarding; otherwise the tabs. */
function RootStack() {
  const colorScheme = useColorScheme();
  const fontsReady = useSplitsFonts();
  const { status } = useAuth();
  const ready = fontsReady && status !== 'loading';

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={status === 'signedOut'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'onboarding'}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'ready'}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="sheets/add" options={sheet} />
          <Stack.Screen name="settings" />
          <Stack.Screen name="exercises" />
          <Stack.Screen name="templates" options={{ presentation: 'modal' }} />
          <Stack.Screen name="sessions" options={{ presentation: 'modal' }} />
          <Stack.Screen
            name="workout"
            options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
          />
          <Stack.Screen name="sheets/pick-exercises" options={{ presentation: 'modal' }} />
          <Stack.Screen name="runs" options={{ presentation: 'modal' }} />
          <Stack.Screen name="sheets/link-run" options={sheet} />
        </Stack.Protected>
        <Stack.Screen name="auth/callback" />
      </Stack>
      {status === 'ready' ? (
        <>
          <WorkoutProvider />
          <HealthProvider />
        </>
      ) : null}
    </ThemeProvider>
  );
}
