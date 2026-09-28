import { ActionSheetIOS, Alert, Platform } from 'react-native';

export type MenuItem = { label: string; destructive?: boolean; onPress: () => void };

/** An action sheet on iOS, an alert elsewhere, with a trailing "cancel". */
export function showMenu(title: string | undefined, items: MenuItem[]) {
  if (Platform.OS === 'ios') {
    const destructive = items.findIndex((i) => i.destructive);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [...items.map((i) => i.label), 'cancel'],
        cancelButtonIndex: items.length,
        destructiveButtonIndex: destructive >= 0 ? destructive : undefined,
      },
      (i) => items[i]?.onPress(),
    );
  } else {
    Alert.alert(title ?? '', undefined, [
      ...items.map((i) => ({
        text: i.label,
        style: i.destructive ? ('destructive' as const) : undefined,
        onPress: i.onPress,
      })),
      { text: 'cancel', style: 'cancel' as const },
    ]);
  }
}
