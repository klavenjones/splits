import { SymbolView } from 'expo-symbols';
import { styled } from 'nativewind';

/** SymbolView with `className` support; a text color class (e.g. `text-label`) sets the tint. */
export const SymbolIcon = styled(SymbolView, {
  className: {
    target: 'style',
    nativeStyleMapping: { color: 'tintColor' },
  },
});
