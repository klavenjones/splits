import { Alert } from 'react-native';

/** "Remove X?" for a planned session; `onCancel` runs when the alert is dismissed without removing. */
export function confirmRemovePlanned(
  name: string,
  detail: string,
  onConfirm: () => void,
  onCancel?: () => void,
) {
  Alert.alert(
    `Remove ${name}?`,
    detail,
    [
      { text: 'cancel', style: 'cancel', onPress: onCancel },
      { text: 'remove', style: 'destructive', onPress: onConfirm },
    ],
    { cancelable: true, onDismiss: onCancel },
  );
}
