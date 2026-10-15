// _layout.tsx (root) — the first thing that loads.
// It wraps the whole app in our two "providers" (settings + heat data),
// sets up notifications, and defines the screens: the tabs + Settings.

import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Vibration } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SettingsProvider, useSettings, useT } from '../context/SettingsContext';
import { HeatProvider } from '../context/HeatContext';
import { ALERT_VIBRATION, onRestReminder, setupNotifications } from '../services/notifications';
import { registerBackgroundCheck } from '../services/backgroundCheck';
import { speak } from '../services/speech';
import { colors } from '../theme';
import HeaderBackground from '../components/ui/HeaderBackground';

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
  const pathname = usePathname(); // e.g. "/" or "/spots"

  // iPhone only: the real iOS tabs have no title bar, so this Stack shows it instead,
  // with the title of whichever tab is open.
  const tabTitles: Record<string, string> = {
    '/spots': t('tabs.spots'),
    '/routes': t('tabs.routes'),
    '/chat': t('tabs.chat'),
  };
  const settingsButton = () => (
    <Pressable
      onPress={() => router.push('/settings')}
      accessibilityRole="button"
      accessibilityLabel={t('common.settings')}
      hitSlop={12}
      style={styles.settingsButton}
    >
      <Ionicons name="settings-sharp" size={26} color={colors.white} />
    </Pressable>
  );

  return (
    <Stack
      screenOptions={{
        headerBackground: HeaderBackground,
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '800' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="(tabs)"
        options={
          Platform.OS === 'ios'
            ? {
                title: tabTitles[pathname] ?? 'CoolDrift',
                headerTitleStyle: { fontWeight: '800', fontSize: 22 },
                headerRight: settingsButton,
              }
            : { headerShown: false } // the tabs draw their own title bar
        }
      />
      <Stack.Screen name="settings" options={{ title: t('common.settings'), presentation: 'modal' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
