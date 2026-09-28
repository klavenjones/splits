import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * The status-bar inset. Inside a full-screen modal the safe-area context can report 0, so fall
 * back to the window's insets from launch.
 */
export function useTopInset(): number {
  const insets = useSafeAreaInsets();
  return insets.top || initialWindowMetrics?.insets.top || 0;
}
