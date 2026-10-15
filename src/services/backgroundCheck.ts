// backgroundCheck.ts — checks the heat while the app is CLOSED or in the background.
//
// The phone's operating system decides exactly when this runs:
//  • Android: about every 15 minutes at best (the minimum Android allows).
//  • iOS: when iOS thinks it's a good time, which can be much less often.
// So this is a "bonus" safety net. While the app is OPEN, HeatContext checks
// every 15 minutes on its own.

import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { getHeatReading } from './weather';
import { lastKnownLocation } from './location';
import { alertIfRiskBecameHigh } from './notifications';
import { loadSettingsDirect } from '../context/SettingsContext';
import { i18n } from '../i18n';

export const HEAT_TASK = 'cooldrift-heat-check';

// This MUST be defined at the top level of a file (not inside a component),
// so the phone can run it without opening any screen.
TaskManager.defineTask(HEAT_TASK, async () => {
  try {
    const settings = await loadSettingsDirect();
    if (!settings.highAlerts) return BackgroundTask.BackgroundTaskResult.Success;
    i18n.locale = settings.language; // so the notification is in the right language
    const here = await lastKnownLocation(); // no GPS in background; use last saved spot
    const reading = await getHeatReading(here);
    await alertIfRiskBecameHigh(settings.demoHigh ? 'high' : reading.risk, true);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** Turns the background check on (call once at app start). */
export async function registerBackgroundCheck() {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
    if (await TaskManager.isTaskRegisteredAsync(HEAT_TASK)) return;
    await BackgroundTask.registerTaskAsync(HEAT_TASK, { minimumInterval: 15 }); // minutes
  } catch (e) {
    // Not available (e.g. iOS Simulator). The app still checks while it's open.
    console.log('Background check not available:', e);
  }
}
