// CoolingFilter.tsx — the row of filter buttons: All · Air-con · Shaded · Green.
// The chosen one fills with its colour. Each button is also the map legend
// (its colour matches the pins on the map).

import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from './AppText';
import ScalePressable from './ui/ScalePressable';
import { useT } from '../context/SettingsContext';
import { COOLING_ICON, COOLING_TYPES, CoolingType } from '../services/coolSpots';
import { colors, coolingColor, radius, shadow } from '../theme';

type Props = {
  value: CoolingType | null; // null = All
  onChange: (value: CoolingType | null) => void;
  wrap?: boolean; // true = wrap onto several lines instead of side-scrolling
};

export default function CoolingFilter({ value, onChange, wrap }: Props) {
  const { t } = useT();
  const options: { key: CoolingType | null; label: string; icon: string; color: string }[] = [
    { key: null, label: t('spots.all'), icon: 'apps', color: colors.primary },
    ...COOLING_TYPES.map((c) => ({ key: c, label: t(`cooling.${c}`), icon: COOLING_ICON[c], color: coolingColor[c] })),
  ];

  return (
    <ScrollView
      horizontal={!wrap}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, wrap && { flexWrap: 'wrap' }]}
    >
      {options.map((o) => {
        const active = value === o.key;
        return (
          <ScalePressable
            key={o.label}
            onPress={() => onChange(o.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.chip,
              { borderColor: o.color },
              active && { backgroundColor: o.color, boxShadow: shadow.button },
            ]}
          >
            <Ionicons name={o.icon as any} size={18} color={active ? colors.white : o.color} />
            <AppText size="small" bold color={active ? colors.white : o.color}>
              {o.label}
            </AppText>
          </ScalePressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 4, flexDirection: 'row' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
});
