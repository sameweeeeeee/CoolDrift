// RiskMeter.tsx — the big Low / Moderate / High heat meter on the Home screen.
// It shows three coloured blocks, and the current level is big and highlighted.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from './AppText';
import { colors, riskColor } from '../theme';
import { RiskLevel } from '../services/weather';
import { useT } from '../context/SettingsContext';

const LEVELS: RiskLevel[] = ['low', 'moderate', 'high'];
const ICONS = { low: 'happy', moderate: 'alert-circle', high: 'warning' } as const;

export default function RiskMeter({ risk, huge }: { risk: RiskLevel; huge?: boolean }) {
  const { t } = useT();
  const color = riskColor[risk];

  return (
    <View
      style={[styles.card, { borderColor: color }]}
      accessible
      accessibilityLabel={`${t('risk.title')}: ${t(`risk.${risk}`)}`}
    >
      <AppText size="body" bold color={colors.textMuted} center>
        {t('risk.title')}
      </AppText>

      {/* Big level text with icon */}
      <View style={[styles.levelBox, { backgroundColor: color }]}>
        <Ionicons name={ICONS[risk]} size={huge ? 64 : 44} color={colors.white} />
        <AppText size="huge" bold color={colors.white} center style={huge && { fontSize: 64, lineHeight: 76 }}>
          {t(`risk.${risk}`)}
        </AppText>
      </View>

      {/* The 3-step scale underneath, so you can see where we are */}
      <View style={styles.scale}>
        {LEVELS.map((level) => (
          <View
            key={level}
            style={[
              styles.step,
              { backgroundColor: riskColor[level], opacity: level === risk ? 1 : 0.25 },
              level === risk && styles.stepActive,
            ]}
          >
            <AppText size="small" bold color={colors.white} center numberOfLines={1}>
              {t(`risk.${level}`)}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 4,
    padding: 16,
    gap: 12,
  },
  levelBox: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 4,
  },
  scale: { flexDirection: 'row', gap: 6 },
  step: { flex: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 2 },
  stepActive: { transform: [{ scaleY: 1.15 }] },
});
