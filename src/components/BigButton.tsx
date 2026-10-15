// BigButton.tsx — a large, easy-to-tap button with an optional icon.

import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from './AppText';
import { colors, touchSize } from '../theme';
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
  const bg = variant === 'primary' ? colors.primary : variant === 'danger' ? colors.high : colors.white;
  const fg = variant === 'outline' ? colors.primary : colors.white;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, minHeight: (small ? 44 : touchSize) * Math.min(textScale, 1.2) },
        variant === 'outline' && styles.outline,
        (pressed || disabled) && { opacity: 0.6 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Ionicons name={icon} size={(small ? 20 : 26) * textScale} color={fg} />}
          <AppText bold color={fg} size={small ? 'small' : 'large'} center>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: { borderWidth: 2, borderColor: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
});
