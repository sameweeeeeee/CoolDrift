// _layout.tsx (root) — the first thing that loads.
// It wraps the whole app in our two "providers" (settings + heat data),
// sets up notifications, and defines the screens: the tabs + Settings.

import React, { useEffect } from 'react';
import { Vibration } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SettingsProvider, useSettings, useT } from '../context/SettingsContext';
import { HeatProvider } from '../context/HeatContext';
import { ALERT_VIBRATION, onRestReminder, setupNotifications } from '../services/notifications';
import { registerBackgroundCheck } from '../services/backgroundCheck';
import { speak } from '../services/speech';
import { colors } from '../theme';

/** Listens for rest reminders while the app is open and reads them aloud. */
function ReminderVoice() {
  const { settings } = useSettings();
  const { t } = useT();

  useEffect(() => {
    return onRestReminder(() => {
      Vibration.vibrate(ALERT_VIBRATION);
      speak(t('notif.restSpeech'), settings.language); // audio, so riders don't need to look
    });
  }, [settings.language, t]);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    setupNotifications();
    registerBackgroundCheck();
  }, []);

  return (
    <SettingsProvider>
      <HeatProvider>
        <StatusBar style="light" />
        <ReminderVoice />
        <Screens />
      </HeatProvider>
    </SettingsProvider>
  );
}

function Screens() {
  const { t } = useT();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.primaryLight },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: t('common.settings'), presentation: 'modal' }} />
    </Stack>
  );
}
