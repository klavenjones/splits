import { router, type Href } from 'expo-router';
import { Alert } from 'react-native';

/** Back to where a sheet was opened from, or `fallback` when it was opened by a link. */
export const closeOr = (fallback: Href) =>
  router.canGoBack() ? router.back() : router.replace(fallback);

/** Runs are recorded on the watch and imported from Apple Health. */
export function startRun(name: string) {
  Alert.alert(
    `start ${name}`,
    'Record it on your Apple Watch as an outdoor run. It shows up here when you open Splits.',
  );
}

/** Leaves the workout modal (logger, summary) for Today. */
export function exitWorkout() {
  if (router.canDismiss()) router.dismissAll();
  router.navigate('/today');
}

/** Closes the food sheets (search, detail, quick add…) and shows the diary. */
export function exitFood() {
  if (router.canDismiss()) router.dismissAll();
  router.navigate('/nutrition');
}
