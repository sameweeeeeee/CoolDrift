// useTabBarSpace.ts — how much room the floating glass tab bar covers at the bottom.
// Screens add this as bottom padding so the last item can scroll out from under the bar.
//
// - iPhone: 0, because the real iOS tab bar tells the screen its size by itself
//   (scroll views use contentInsetAdjustmentBehavior="automatic", fixed bars use TabBarSafeArea).
// - Computer: 0, because the tabs are on the left side.

import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsDesktop } from './useIsDesktop';

export const GLASS_BAR_HEIGHT = 68;
export const GLASS_BAR_GAP = 12; // space between the bar and the bottom edge of the screen

export function useTabBarSpace(): number {
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();
  if (Platform.OS === 'ios' || isDesktop) return 0;
  return GLASS_BAR_HEIGHT + Math.max(insets.bottom, GLASS_BAR_GAP) + 12;
}
