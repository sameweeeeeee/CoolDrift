// motion.ts — shared helpers for animations.
//
// We use React Native's built-in "Animated" library. The idea:
//   1. Make an Animated.Value (a number that can change smoothly, e.g. 0 → 1).
//   2. Start an animation (timing = smooth slide, spring = bouncy).
//   3. Connect the value to a style, e.g. opacity or position.

import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * On phones, animations run on the "native" side, which is smoother.
 * Web browsers don't support that, so we turn it off there.
 */
export const NATIVE_DRIVER = Platform.OS !== 'web';

/**
 * True if the user turned on "Reduce Motion" in their phone/computer settings.
 * Some people (including some seniors) feel dizzy with moving screens,
 * so we skip animations for them.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduced)
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub?.remove?.();
  }, []);
  return reduced;
}
