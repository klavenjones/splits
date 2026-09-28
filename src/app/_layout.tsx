import { navigationIntegration, Sentry, setSentryUser } from '@/lib/sentry';
import '@/global.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  DarkTheme,
  DefaultTheme,
  router,
  Stack,
  ThemeProvider,
  useNavigationContainerRef,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from '@/auth';
import { ErrorBoundary } from '@/components';
import { persistQueryCache, restoreQueryCache, wireOnlineManager } from '@/db/persist';
import { HealthProvider } from '@/health/HealthProvider';
import { NutritionProvider } from '@/nutrition/NutritionProvider';
import { WorkoutProvider } from '@/workout/WorkoutProvider';
import { radius, useSplitsFonts } from '@/theme';

SplashScreen.preventAutoHideAsync();

const sheet = {
  presentation: 'formSheet',
  sheetAllowedDetents: 'fitToContents',
  sheetGrabberVisible: true,
  sheetCornerRadius: radius.sheet,
} as const;

function RootLayout() {
  const navRef = useNavigationContainerRef();
  useEffect(() => {
    if (navRef) navigationIntegration.registerNavigationContainer(navRef);
  }, [navRef]);
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
  const { status, userId } = useAuth();
  const ready = fontsReady && status !== 'loading';

  useEffect(() => setSentryUser(userId ?? null), [userId]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ErrorBoundary
        name="root"
        screen
        title="something went wrong"
        body="Splits hit an error and it’s been reported. Your workouts are saved on this phone."
        closeLabel="go to today"
        onClose={(reset) => {
          reset();
          router.replace('/today');
        }}
      >
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
            <Stack.Screen name="sheets/food-search" options={{ presentation: 'modal' }} />
            <Stack.Screen name="sheets/weigh-in" options={sheet} />
            <Stack.Screen name="food" options={{ presentation: 'modal' }} />
            <Stack.Screen name="checkin" options={{ presentation: 'modal' }} />
          </Stack.Protected>
          <Stack.Screen name="auth/callback" />
        </Stack>
      </ErrorBoundary>
      {status === 'ready' ? (
        <>
          <WorkoutProvider />
          <HealthProvider />
          <NutritionProvider />
        </>
      ) : null}
    </ThemeProvider>
  );
}

export default Sentry.wrap(RootLayout);
