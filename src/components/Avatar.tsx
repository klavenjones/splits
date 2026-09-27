import { Text, View } from 'react-native';

import { size } from '../theme/tokens';
import { cn } from './cn';

/** Circle with the first letter of a name. */
export function Avatar({ name, large }: { name: string; large?: boolean }) {
  const d = large ? size.fabSize : size.touchMin;
  return (
    <View
      className="items-center justify-center rounded-pill bg-primary-fill"
      style={{ width: d, height: d }}
    >
      <Text className={cn('text-on-primary', large ? 'type-title' : 'type-label')}>
        {(name.trim()[0] ?? '?').toUpperCase()}
      </Text>
    </View>
  );
}

/** The name to show: display name, else the part of the email before the @. */
export const displayNameOf = (displayName: string | null | undefined, email: string | undefined) =>
  displayName?.trim() || email?.split('@')[0] || 'you';
