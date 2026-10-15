// HeaderBackground.tsx — the solid green behind the title bar at the top.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme';

export default function HeaderBackground() {
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.primaryDark }]} />;
}
