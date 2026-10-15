// CoolingBadge.tsx — a small coloured label: ❄️ Air-con / ⛱️ Shaded / 🌳 Green area.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from './AppText';
import { useT } from '../context/SettingsContext';
import { COOLING_ICON, CoolingType } from '../services/coolSpots';
import { coolingColor, coolingTint, radius } from '../theme';

export default function CoolingBadge({ cooling }: { cooling: CoolingType }) {
  const { t } = useT();
  return (
    <View style={[styles.badge, { backgroundColor: coolingTint[cooling] }]}>
      <Ionicons name={COOLING_ICON[cooling] as any} size={14} color={coolingColor[cooling]} />
      <AppText size="small" bold color={coolingColor[cooling]}>
        {t(`cooling.${cooling}`)}
      </AppText>
    </View>
  );
}

/** A round coloured icon, used at the start of list rows. */
export function CoolingIcon({ cooling, icon, size = 46 }: { cooling: CoolingType; icon: string; size?: number }) {
  return (
    <View style={[styles.circle, { width: size, height: size, backgroundColor: coolingTint[cooling] }]}>
      <Ionicons name={icon as any} size={size * 0.5} color={coolingColor[cooling]} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  circle: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
