// Card.tsx — a white box with a thin border.
// Pass `delay` to make it fade in after other cards.

import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import FadeIn from './FadeIn';
import { colors, radius } from '../../theme';

type Props = {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
  accent?: string; // optional coloured stripe on the left
};

export default function Card({ children, delay = 0, style, accent }: Props) {
  return (
    <FadeIn delay={delay}>
      <View style={[styles.card, accent ? { borderLeftWidth: 6, borderLeftColor: accent } : null, style]}>
        {children}
      </View>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
