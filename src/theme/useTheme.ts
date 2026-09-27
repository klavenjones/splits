import { useColorScheme } from 'react-native';
import { colors, shadow, type ThemeColors } from './tokens';

/** Current Splits colors as plain values, for SVG, charts, BlurView and navigation themes. */
export function useTheme(): {
  scheme: 'light' | 'dark';
  c: ThemeColors;
  shadow: { [K in keyof (typeof shadow)['light']]: string };
} {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { scheme, c: colors[scheme], shadow: shadow[scheme] };
}
