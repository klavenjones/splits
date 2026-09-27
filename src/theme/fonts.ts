import { useFonts } from 'expo-font';

/**
 * Loads the six Splits font files. Family names match the --font-* tokens in global.css.
 * Call once in app/_layout.tsx and keep the splash screen up until it returns true.
 */
export const splitsFonts = {
  'Archivo-Regular': require('@/assets/fonts/Archivo-Regular.ttf'),
  'Archivo-Medium': require('@/assets/fonts/Archivo-Medium.ttf'),
  'Archivo-SemiBold': require('@/assets/fonts/Archivo-SemiBold.ttf'),
  'Archivo-Bold': require('@/assets/fonts/Archivo-Bold.ttf'),
  'ArchivoExpanded-Bold': require('@/assets/fonts/ArchivoExpanded-Bold.ttf'),
  'ArchivoExpanded-ExtraBold': require('@/assets/fonts/ArchivoExpanded-ExtraBold.ttf'),
};

export function useSplitsFonts(): boolean {
  const [loaded, error] = useFonts(splitsFonts);
  if (error) console.warn('[splits] font load failed', error);
  return loaded || !!error;
}
