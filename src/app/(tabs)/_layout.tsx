// (tabs)/_layout.tsx — the 4 main tabs at the bottom of the screen,
// plus the ⚙️ settings button at the top right.

import React from 'react';
import { Pressable } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettings, useT } from '../../context/SettingsContext';
import { colors } from '../../theme';
import { useIsDesktop } from '../../utils/useIsDesktop';

export default function TabsLayout() {
  const { t } = useT();
  const { textScale } = useSettings();
  const isDesktop = useIsDesktop(); // wide screen → tabs go down the left side

  // A big settings button for the top-right corner of every tab.
  const settingsButton = () => (
    <Pressable
      onPress={() => router.push('/settings')}
      accessibilityRole="button"
      accessibilityLabel={t('common.settings')}
      hitSlop={12}
      style={{ paddingHorizontal: 16 }}
    >
      <Ionicons name="settings-sharp" size={30} color={colors.white} />
    </Pressable>
  );

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700', fontSize: 22 },
        headerRight: settingsButton,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 13 * Math.min(textScale, 1.2), fontWeight: '700' },
        tabBarPosition: isDesktop ? 'left' : 'bottom',
        tabBarVariant: isDesktop ? 'material' : 'uikit', // 'material' shows icon + label in a side bar
        tabBarStyle: isDesktop
          ? { minWidth: 180, paddingTop: 12, borderRightWidth: 2, borderRightColor: colors.border }
          : { minHeight: 70, paddingTop: 6, borderTopWidth: 2, borderTopColor: colors.border },
        sceneStyle: { backgroundColor: colors.primaryLight },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'CoolDrift',
          tabBarLabel: t('tabs.home'),
          tabBarIcon: ({ color }) => <Ionicons name="thermometer" size={30} color={color} />,
        }}
      />
      <Tabs.Screen
        name="spots"
        options={{
          title: t('tabs.spots'),
          tabBarIcon: ({ color }) => <Ionicons name="map" size={30} color={color} />,
        }}
      />
      <Tabs.Screen
        name="routes"
        options={{
          title: t('tabs.routes'),
          tabBarIcon: ({ color }) => <Ionicons name="walk" size={30} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t('tabs.chat'),
          tabBarIcon: ({ color }) => <Ionicons name="chatbubbles" size={30} color={color} />,
        }}
      />
    </Tabs>
  );
}
