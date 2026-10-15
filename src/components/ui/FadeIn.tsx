// FadeIn.tsx — wraps anything so it fades in and slides up a little when it appears.
// Give several items different `delay`s and they appear one after another.

import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';
import { NATIVE_DRIVER, useReducedMotion } from '../../utils/motion';

type Props = {
  children: React.ReactNode;
  delay?: number; // milliseconds to wait before starting
  from?: 'below' | 'left' | 'right'; // which direction it slides in from
  style?: StyleProp<ViewStyle>;
};

export default function FadeIn({ children, delay = 0, from = 'below', style }: Props) {
  const reduced = useReducedMotion();
  // useState(() => ...) creates the Animated.Value only once.
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduced) {
      progress.setValue(1); // no animation: just show it
      return;
    }
    Animated.timing(progress, {
      toValue: 1,
      duration: 450,
      delay,
      easing: Easing.out(Easing.cubic), // fast at first, then gently slows down
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [progress, delay, reduced]);

  // 0 → 1 becomes: 18px away → 0px (in place)
  const distance = progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const transform =
    from === 'below'
      ? [{ translateY: distance }]
      : [{ translateX: from === 'left' ? Animated.multiply(distance, -1) : distance }];

  return <Animated.View style={[{ opacity: progress, transform }, style]}>{children}</Animated.View>;
}
