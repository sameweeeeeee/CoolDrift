// TabBarSafeArea.tsx — wrap anything that sits at the very bottom of a tab
// (like the chat typing box) so the tab bar never covers it.

import React from 'react';
import { Platform, StyleProp, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTabBarSpace } from '../../utils/useTabBarSpace';

export default function TabBarSafeArea({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const space = useTabBarSpace();

  // On iPhone the real tab bar is part of the "safe area", so SafeAreaView handles it.
  if (Platform.OS === 'ios') {
    return (
      <SafeAreaView edges={['bottom']} style={style}>
        {children}
      </SafeAreaView>
    );
  }
  return <View style={[style, space > 0 && { paddingBottom: space }]}>{children}</View>;
}
