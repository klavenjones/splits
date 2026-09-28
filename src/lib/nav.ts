import { router, type Href } from 'expo-router';
import { Alert } from 'react-native';

/** Back to where a sheet was opened from, or `fallback` when it was opened by a link. */
export const closeOr = (fallback: Href) =>
  router.canGoBack() ? router.back() : router.replace(fallback);

/** Start is a placeholder until live logging (build step 5); the session stays planned. */
export function startSession(name: string) {
  Alert.alert(`start ${name}`, 'Live logging arrives in the next build step.');
}
