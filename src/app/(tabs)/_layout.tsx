// (tabs)/_layout.tsx — the 4 main tabs, plus the ⚙️ settings button at the top right.
// Phones (Android + phone browsers): a floating frosted-glass bar at the bottom (GlassTabBar).
// Wide screens (computers): the tabs move to the left side.
// iPhones use _layout.ios.tsx instead, with the real iOS Liquid Glass tab bar.

import React, { useEffect, useState } from 'react';
import { Animated, ColorValue, Pressable, StyleSheet, View } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GlassTabBar from '../../components/ui/GlassTabBar';
import HeaderBackground from '../../components/ui/HeaderBackground';
import { useSettings, useT } from '../../context/SettingsContext';
import { colors, radius } from '../../theme';
import { NATIVE_DRIVER, useReducedMotion } from '../../utils/motion';
import { useIsDesktop } from '../../utils/useIsDesktop';

/** A tab icon that grows a little when selected. */
function TabIcon({ name, color, focused }: { name: keyof typeof Ionicons.glyphMap; color: ColorValue; focused: boolean }) {
  const reduced = useReducedMotion();
  const [active] = useState(() => new Animated.Value(focused ? 1 : 0));

  useEffect(() => {
    const to = focused ? 1 : 0;
    if (reduced) active.setValue(to);
    else Animated.spring(active, { toValue: to, speed: 18, bounciness: 10, useNativeDriver: NATIVE_DRIVER }).start();
  }, [focused, reduced, active]);

  return (
    <View style={styles.iconBox}>
      <Animated.View style={{ transform: [{ scale: active.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] }}>
        <Ionicons name={name} size={26} color={color as string} />
      </Animated.View>
    </View>
  );
}

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
      style={styles.settingsButton}
    >
      <Ionicons name="settings-sharp" size={26} color={colors.white} />
    </Pressable>
  );

  const icon = (name: keyof typeof Ionicons.glyphMap) =>
    function Icon({ color, focused }: { color: ColorValue; focused: boolean }) {
      return <TabIcon name={name} color={color} focused={focused} />;
    };

  return (
    <Tabs
      tabBar={isDesktop ? undefined : (props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerBackground: HeaderBackground,
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '800', fontSize: 22 },
        headerShadowVisible: false,
        headerRight: settingsButton,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 13 * Math.min(textScale, 1.2), fontWeight: '700' },
        tabBarPosition: isDesktop ? 'left' : 'bottom',
        tabBarVariant: isDesktop ? 'material' : 'uikit', // 'material' shows icon + label in a side bar
        tabBarStyle: { minWidth: 190, paddingTop: 12, borderRightWidth: 0, boxShadow: '2px 0px 16px rgba(16,70,40,0.08)' }, // computer side bar only
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'CoolDrift', tabBarLabel: t('tabs.home'), tabBarIcon: icon('thermometer') }} />
      <Tabs.Screen name="spots" options={{ title: t('tabs.spots'), tabBarIcon: icon('map') }} />
      <Tabs.Screen name="routes" options={{ title: t('tabs.routes'), tabBarIcon: icon('walk') }} />
      <Tabs.Screen name="chat" options={{ title: t('tabs.chat'), tabBarIcon: icon('chatbubbles') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconBox: { alignItems: 'center', justifyContent: 'center', width: 64, height: 30 },
  settingsButton: {
    marginHorizontal: 12,
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});
