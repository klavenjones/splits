import { router, type Href } from 'expo-router';
import { Alert } from 'react-native';

/** Back to where a sheet was opened from, or `fallback` when it was opened by a link. */
export const closeOr = (fallback: Href) =>
  router.canGoBack() ? router.back() : router.replace(fallback);

/** Runs are logged from your watch; importing them arrives in build step 6. */
export function startRun(name: string) {
  Alert.alert(
    `start ${name}`,
    'Run it with your watch. Importing runs arrives in the next build step.',
  );
}

/** Leaves the workout modal (logger, summary) for Today. */
export function exitWorkout() {
  if (router.canDismiss()) router.dismissAll();
  router.navigate('/today');
}
