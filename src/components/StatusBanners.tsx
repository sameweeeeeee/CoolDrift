// StatusBanners.tsx — small notices at the top of a screen:
// "location is off", "you're offline", "demo mode is on".

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from './AppText';
import { colors } from '../theme';
import { useHeat } from '../context/HeatContext';
import { useSettings, useT } from '../context/SettingsContext';
import { formatTime } from '../utils/summary';

function Banner({ icon, text, color }: { icon: keyof typeof Ionicons.glyphMap; text: string; color: string }) {
  return (
    <View style={[styles.banner, { borderColor: color }]}>
      <Ionicons name={icon} size={22} color={color} />
      <AppText size="small" style={{ flex: 1 }}>
        {text}
      </AppText>
    </View>
  );
}

export default function StatusBanners() {
  const { t } = useT();
  const { settings } = useSettings();
  const { locationStatus, reading } = useHeat();

  return (
    <>
      {settings.demoHigh && <Banner icon="flask" text={t('risk.demo')} color={colors.high} />}
      {(locationStatus === 'denied' || locationStatus === 'error') && (
        <Banner icon="location-outline" text={t('common.locationDenied')} color={colors.moderate} />
      )}
      {reading?.fromCache && (
        <Banner
          icon="cloud-offline-outline"
          text={t('common.offline', { time: formatTime(reading.observedAt) })}
          color={colors.moderate}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderRadius: 12,
    padding: 10,
    backgroundColor: colors.white,
  },
});
