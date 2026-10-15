// (tabs)/_layout.ios.tsx — the 4 main tabs on iPhone/iPad, using the REAL iOS tab bar.
// On iOS 26+ this is the floating "Liquid Glass" bar; on older iOS it's the normal system bar.
// Android and computers use _layout.tsx instead.
// Native tabs have no title bar, so the title + ⚙️ button come from the root Stack (app/_layout.tsx).

import React from 'react';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useT } from '../../context/SettingsContext';
import { colors } from '../../theme';

export default function TabsLayout() {
  const { t } = useT();

  return (
    <NativeTabs
      tintColor={colors.primary} // colour of the selected tab
      minimizeBehavior="onScrollDown" // the bar shrinks while you scroll down (iOS 26+)
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf="thermometer.sun.fill" />
        <NativeTabs.Trigger.Label>{t('tabs.home')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="spots">
        <NativeTabs.Trigger.Icon sf="map.fill" />
        <NativeTabs.Trigger.Label>{t('tabs.spots')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="routes">
        <NativeTabs.Trigger.Icon sf="figure.walk" />
        <NativeTabs.Trigger.Label>{t('tabs.routes')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chat">
        <NativeTabs.Trigger.Icon sf="bubble.left.and.bubble.right.fill" />
        <NativeTabs.Trigger.Label>{t('tabs.chat')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
