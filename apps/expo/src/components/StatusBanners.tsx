// StatusBanners.tsx — small notices at the top of a screen:
// "location is off", "you're offline", "demo mode is on".

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from './AppText';
import FadeIn from './ui/FadeIn';
import { colors, radius } from '../theme';
import { useHeat } from '../context/HeatContext';
import { useSettings, useT } from '../context/SettingsContext';
import { formatTime } from '../utils/summary';

function Banner({ icon, text, color, tint }: { icon: keyof typeof Ionicons.glyphMap; text: string; color: string; tint: string }) {
  return (
    <FadeIn from="left">
      <View style={[styles.banner, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={22} color={color} />
        <AppText size="small" bold color={color} style={{ flex: 1 }}>
          {text}
        </AppText>
      </View>
    </FadeIn>
  );
}

export default function StatusBanners() {
  const { t } = useT();
  const { settings } = useSettings();
  const { locationStatus, reading } = useHeat();

  return (
    <>
      {settings.demoHigh && <Banner icon="flask" text={t('risk.demo')} color={colors.high} tint="#FDECEC" />}
      {(locationStatus === 'denied' || locationStatus === 'error') && (
        <Banner icon="location" text={t('common.locationDenied')} color="#7A4A00" tint="#FFF4E0" />
      )}
      {reading?.fromCache && (
        <Banner
          icon="cloud-offline"
          text={t('common.offline', { time: formatTime(reading.observedAt) })}
          color="#7A4A00"
          tint="#FFF4E0"
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.button,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
});
