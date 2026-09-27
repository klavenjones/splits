/**
 * Raw color values for props that can't take a className (tintColor, native tab colors).
 * Prefer Tailwind classes (`text-label`, `bg-background`) everywhere else.
 *
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/theme/colors';

export type ThemeColor = keyof typeof Colors.light;

export function useTheme() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? 'dark' : 'light';

  return Colors[theme];
}
