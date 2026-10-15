// BigButton.tsx — a large, easy-to-tap button with an optional icon.
// Main buttons have a green gradient and a shadow; they squish a little when pressed.

import React from 'react';
import { ActivityIndicator, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppText from './AppText';
import ScalePressable from './ui/ScalePressable';
import { colors, gradients, radius, shadow, touchSize } from '../theme';
import { useSettings } from '../context/SettingsContext';

type Props = {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'outline' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  small?: boolean;
};

export default function BigButton({ label, onPress, icon, variant = 'primary', loading, disabled, style, small }: Props) {
  const { textScale } = useSettings();
  const filled = variant !== 'outline';
  const fg = filled ? colors.white : colors.primary;

  return (
    <ScalePressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.button,
        { minHeight: (small ? 46 : touchSize) * Math.min(textScale, 1.2) },
        filled ? { boxShadow: shadow.button } : styles.outline,
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      {/* The gradient fills the button behind the text */}
      {filled && (
        <LinearGradient
          colors={variant === 'danger' ? gradients.danger : gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius.button }]}
        />
      )}
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Ionicons name={icon} size={(small ? 20 : 24) * textScale} color={fg} />}
          <AppText bold color={fg} size={small ? 'small' : 'large'} center>
            {label}
          </AppText>
        </View>
      )}
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.button,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.white },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
});
