// ScalePressable.tsx — a button that gently "squishes" when you press it,
// and gives a tiny vibration (haptic) on phones. Makes taps feel responsive.

import React, { useState } from 'react';
import { Animated, Platform, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { NATIVE_DRIVER, useReducedMotion } from '../../utils/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  haptic?: boolean; // small vibration on tap (phones only)
  children?: React.ReactNode;
};

export default function ScalePressable({ style, haptic = true, onPress, children, ...rest }: Props) {
  const reduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));

  // A "spring" animation overshoots a tiny bit, like a real button.
  const springTo = (value: number) =>
    Animated.spring(scale, { toValue: value, speed: 40, bounciness: 8, useNativeDriver: NATIVE_DRIVER }).start();

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        if (!reduced) springTo(0.96);
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        springTo(1);
        rest.onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic && Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
        onPress?.(e);
      }}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}
