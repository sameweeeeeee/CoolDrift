// HeaderBackground.tsx — the green gradient behind the title bar at the top.

import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '../../theme';

export default function HeaderBackground() {
  return (
    <LinearGradient
      colors={gradients.header}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[StyleSheet.absoluteFill, { boxShadow: '0px 2px 10px rgba(10, 60, 30, 0.25)' }]}
    />
  );
}
