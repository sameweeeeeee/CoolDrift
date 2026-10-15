// GlassTabBar.tsx — a floating "frosted glass" tab bar for Android and phone browsers.
// (iPhones get the real iOS Liquid Glass bar instead — see (tabs)/_layout.ios.tsx.)
//
// How the glass look is made:
//   1. A see-through white background, blurred on the web (backdropFilter).
//   2. A thin bright border + a soft shine across the top half.
//   3. A shadow underneath so it floats above the page.
// The selected tab has a green "lens" that slides between tabs.

import React, { useEffect, useState } from 'react';
import { Animated, LayoutChangeEvent, Platform, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Tabs } from 'expo-router';
import AppText from '../AppText';
import { useSettings } from '../../context/SettingsContext';
import { colors, radius } from '../../theme';
import { NATIVE_DRIVER, useReducedMotion } from '../../utils/motion';
import { GLASS_BAR_GAP, GLASS_BAR_HEIGHT } from '../../utils/useTabBarSpace';

// The props Expo Router's <Tabs> gives a custom tab bar.
type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

const INSET = 6; // gap between the bar's edge and the sliding lens

export default function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { textScale } = useSettings();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [lensX] = useState(() => new Animated.Value(0));

  const tabWidth = width > 0 ? (width - INSET * 2) / state.routes.length : 0;

  // Slide the lens under the selected tab.
  useEffect(() => {
    const to = state.index * tabWidth;
    if (reduced || tabWidth === 0) lensX.setValue(to);
    else Animated.spring(lensX, { toValue: to, speed: 16, bounciness: 8, useNativeDriver: NATIVE_DRIVER }).start();
  }, [state.index, tabWidth, reduced, lensX]);

  return (
    <View
      style={[styles.bar, { bottom: Math.max(insets.bottom, GLASS_BAR_GAP) }]}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
    >
      {/* Shine across the top half of the glass */}
      <LinearGradient
        colors={['rgba(255,255,255,0.75)', 'rgba(255,255,255,0)']}
        style={styles.shine}
        pointerEvents="none"
      />

      {tabWidth > 0 && (
        <Animated.View style={[styles.lens, { width: tabWidth, transform: [{ translateX: lensX }] }]} pointerEvents="none" />
      )}

      {state.routes.map((route, i) => {
        const { options } = descriptors[route.key];
        const focused = state.index === i;
        const color = focused ? colors.primary : colors.textMuted;
        const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : (options.title ?? route.name);

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
          >
            {options.tabBarIcon?.({ focused, color, size: 26 })}
            <AppText bold numberOfLines={1} color={color} style={{ fontSize: 12 * Math.min(textScale, 1.2) }}>
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: GLASS_BAR_HEIGHT,
    flexDirection: 'row',
    padding: INSET,
    borderRadius: radius.pill,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    boxShadow: '0px 12px 32px rgba(16, 70, 40, 0.22), 0px 2px 6px rgba(16, 70, 40, 0.10)',
    // Android can't blur what's behind a view cheaply, so it gets a more solid glass.
    backgroundColor: Platform.OS === 'web' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.92)',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(22px) saturate(180%)' } : null),
  },
  shine: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%' },
  lens: {
    position: 'absolute',
    top: INSET,
    bottom: INSET,
    left: INSET,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(27, 122, 67, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 1 },
});
