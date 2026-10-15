// notifications.ts — local alerts (no internet or server needed).
//  • High-heat alert: one notification + strong vibration when risk turns High.
//  • Worker reminders: a repeating "rest and drink water" notification.
// Local notifications work in Expo Go on both iOS and Android.
// On computers, notifications.web.ts is used instead.

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Vibration } from 'react-native';
import { t } from '../i18n';
import { RiskLevel } from './weather';

const HEAT_CHANNEL = 'heat-alerts';
const REST_CHANNEL = 'rest-reminders';
const REMINDER_ID_KEY = 'cooldrift.reminderId';
const LAST_RISK_KEY = 'cooldrift.lastRisk';

// Vibration pattern: wait 0ms, buzz 600ms, pause 300ms, ... (easy to feel in a pocket)
export const ALERT_VIBRATION = [0, 600, 300, 600, 300, 600];

/** Run once when the app starts. */
export async function setupNotifications() {
  // Show notifications even while the app is open.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  // Android groups notifications into "channels" with their own sound/vibration.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(HEAT_CHANNEL, {
      name: 'High heat alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: ALERT_VIBRATION,
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync(REST_CHANNEL, {
      name: 'Rest and water reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: ALERT_VIBRATION,
      sound: 'default',
    });
  }
}

/** Asks for permission to show notifications. Returns true if allowed. */
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return true;
  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return asked.granted || asked.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;
}

/** Sends the "High heat" alert right now and vibrates the phone. */
export async function sendHighHeatAlert() {
  Vibration.vibrate(ALERT_VIBRATION);
  await Notifications.scheduleNotificationAsync({
    content: { title: t('notif.highTitle'), body: t('notif.highBody'), sound: 'default' },
    trigger: Platform.OS === 'android' ? { channelId: HEAT_CHANNEL } : null, // null = show now
  });
}

/**
 * Call this every time we get a new risk level.
 * It only alerts when the risk CHANGES to High (not every 15 minutes while it stays High).
 */
export async function alertIfRiskBecameHigh(risk: RiskLevel, alertsOn: boolean) {
  const last = await AsyncStorage.getItem(LAST_RISK_KEY);
  await AsyncStorage.setItem(LAST_RISK_KEY, risk);
  if (alertsOn && risk === 'high' && last !== 'high') {
    if (await ensureNotificationPermission()) await sendHighHeatAlert();
    else Vibration.vibrate(ALERT_VIBRATION);
  }
}

/** Starts repeating rest reminders every `minutes`. Replaces any old ones. */
export async function startWorkerReminders(minutes: number) {
  await stopWorkerReminders();
  if (!(await ensureNotificationPermission())) return;
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: t('notif.restTitle'),
      body: t('notif.restBody'),
      sound: 'default',
      data: { kind: 'rest' }, // lets the app know to speak it aloud
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: minutes * 60,
      repeats: true,
      channelId: REST_CHANNEL,
    },
  });
  await AsyncStorage.setItem(REMINDER_ID_KEY, id);
}

/** Stops the rest reminders. */
export async function stopWorkerReminders() {
  const id = await AsyncStorage.getItem(REMINDER_ID_KEY);
  if (id) await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  await AsyncStorage.removeItem(REMINDER_ID_KEY);
}

/** Sends one rest reminder in 2 seconds (for the "test" button and demos). */
export async function sendTestReminder() {
  if (!(await ensureNotificationPermission())) return false;
  await Notifications.scheduleNotificationAsync({
    content: { title: t('notif.restTitle'), body: t('notif.restBody'), sound: 'default', data: { kind: 'rest' } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
      channelId: REST_CHANNEL,
    },
  });
  return true;
}

/** Calls `listener` every time a rest reminder arrives while the app is open. Returns a function to stop listening. */
export function onRestReminder(listener: () => void): () => void {
  const sub = Notifications.addNotificationReceivedListener((n) => {
    if (n.request.content.data?.kind === 'rest') listener();
  });
  return () => sub.remove();
}
