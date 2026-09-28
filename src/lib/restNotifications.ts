/**
 * The rest timer's local notification: scheduled for when rest ends so it arrives even with the
 * app in the background or closed. One at a time, under a fixed identifier.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const ID = 'rest-timer';
let asked = false;
let allowed = false;

if (Platform.OS !== 'web')
  Notifications.setNotificationHandler({
    // In the app the rest bar already shows it; a quiet banner is enough.
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

async function permission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (asked) return allowed;
  asked = true;
  const current = await Notifications.getPermissionsAsync();
  allowed = current.granted || (await Notifications.requestPermissionsAsync()).granted;
  return allowed;
}

/** (Re)schedules the "rest's up" notification for `endsAt` (ms since epoch). */
export async function scheduleRestEnd(endsAt: number, body: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(ID).catch(() => undefined);
    const seconds = Math.round((endsAt - Date.now()) / 1000);
    if (seconds < 1 || !(await permission())) return;
    await Notifications.scheduleNotificationAsync({
      identifier: ID,
      content: { title: 'rest’s up', body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
    });
  } catch {
    // Notifications are a nicety; the timer itself never depends on them.
  }
}

export async function cancelRestEnd() {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(ID).catch(() => undefined);
}
