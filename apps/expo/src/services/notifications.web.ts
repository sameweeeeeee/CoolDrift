// notifications.web.ts — the COMPUTER (web browser) version of notifications.ts.
// Expo automatically uses this file on the web. It has the same functions,
// but uses the browser's own notification pop-ups instead of phone notifications.
//
// Limits on a computer:
//  • Reminders only run while the CoolDrift tab is open (browsers stop timers in closed tabs).
//  • Vibration only works in browsers/devices that support it (most laptops can't vibrate).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { t } from '../i18n';
import { RiskLevel } from './weather';

const LAST_RISK_KEY = 'cooldrift.lastRisk';
export const ALERT_VIBRATION = [0, 600, 300, 600, 300, 600];

let reminderTimer: ReturnType<typeof setInterval> | null = null;
const restListeners = new Set<() => void>();

/** Nothing to set up in a browser. */
export async function setupNotifications() {}

/** Asks the browser for permission to show pop-up notifications. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false; // very old browser
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

/** Shows a browser pop-up (if allowed) and vibrates (if the device can). */
function show(title: string, body: string) {
  navigator.vibrate?.(ALERT_VIBRATION);
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

export async function sendHighHeatAlert() {
  show(t('notif.highTitle'), t('notif.highBody'));
}

/** Only alerts when the risk CHANGES to High. Same rule as the phone version. */
export async function alertIfRiskBecameHigh(risk: RiskLevel, alertsOn: boolean) {
  const last = await AsyncStorage.getItem(LAST_RISK_KEY);
  await AsyncStorage.setItem(LAST_RISK_KEY, risk);
  if (alertsOn && risk === 'high' && last !== 'high') {
    await ensureNotificationPermission();
    await sendHighHeatAlert();
  }
}

/** Fires a rest reminder: pop-up + tells the app to speak it aloud. */
function fireRestReminder() {
  show(t('notif.restTitle'), t('notif.restBody'));
  restListeners.forEach((listener) => listener());
}

/** Starts repeating rest reminders every `minutes` (while the tab is open). */
export async function startWorkerReminders(minutes: number) {
  await stopWorkerReminders();
  await ensureNotificationPermission();
  reminderTimer = setInterval(fireRestReminder, minutes * 60 * 1000);
}

export async function stopWorkerReminders() {
  if (reminderTimer) clearInterval(reminderTimer);
  reminderTimer = null;
}

/** One reminder in 2 seconds, for the "Test reminder" button. */
export async function sendTestReminder() {
  await ensureNotificationPermission();
  setTimeout(fireRestReminder, 2000);
  return true; // the spoken reminder works even if pop-ups are blocked
}

/** Calls `listener` every time a rest reminder fires. Returns a function to stop listening. */
export function onRestReminder(listener: () => void): () => void {
  restListeners.add(listener);
  return () => restListeners.delete(listener);
}
