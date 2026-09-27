import { styled } from 'nativewind';
import { SafeAreaView as BaseSafeAreaView } from 'react-native-safe-area-context';

/** react-native-safe-area-context's SafeAreaView with `className` support. */
export const SafeAreaView = styled(BaseSafeAreaView, { className: 'style' });
