import { styled } from 'nativewind';
import { SafeAreaView as BaseSafeAreaView } from 'react-native-safe-area-context';

/**
 * SafeAreaView that accepts `className` on native. NativeWind only maps `className` for core
 * React Native components; third-party ones need `styled()`. Without it, `flex-1` is dropped on
 * iOS/Android (web passes classes straight through), and scroll content collapses to zero height.
 * Its inset padding still overrides padding classes, so put padding on an inner View.
 */
export const SafeAreaView = styled(BaseSafeAreaView, { className: 'style' });
