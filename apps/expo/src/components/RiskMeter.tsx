// RiskMeter.tsx — the Low / Moderate / High heat card at the top of the Home screen.
// One solid colour per level, the level in big type, what to do right now,
// and a 3-step scale so people can see how far it is from the next level.

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from './AppText';
import { colors, radius, riskColor } from '../theme';
import { RiskLevel } from '../services/weather';
import { useT } from '../context/SettingsContext';

const LEVELS: RiskLevel[] = ['low', 'moderate', 'high'];

type Props = {
  risk: RiskLevel;
  huge?: boolean; // senior mode
  advice?: string; // one line of what to do now
  onSpeak?: () => void; // shows a small "Read aloud" link
};

export default function RiskMeter({ risk, huge, advice, onSpeak }: Props) {
  const { t } = useT();

  return (
    <View style={[styles.card, { backgroundColor: riskColor[risk] }]}>
      <View style={styles.topRow}>
        <AppText size="small" bold color="rgba(255,255,255,0.8)">
          {t('risk.title')}
        </AppText>
        {onSpeak && (
          <Pressable onPress={onSpeak} hitSlop={10} accessibilityRole="button" style={styles.speak}>
            <Ionicons name="volume-high" size={18} color={colors.white} />
            <AppText size="small" bold color={colors.white}>
              {t('home.readAloud')}
            </AppText>
          </Pressable>
        )}
      </View>

      <AppText
        size="huge"
        bold
        color={colors.white}
        style={huge && { fontSize: 64, lineHeight: 72 }}
        accessibilityLabel={`${t('risk.title')}: ${t(`risk.${risk}`)}`}
      >
        {t(`risk.${risk}`)}
      </AppText>

      {advice && (
        <AppText size="large" color={colors.white}>
          {advice}
        </AppText>
      )}

      <View style={styles.scale} accessible={false}>
        {LEVELS.map((level) => (
          <View key={level} style={{ flex: 1, gap: 4 }}>
            <View style={[styles.step, { opacity: level === risk ? 1 : 0.3 }]} />
            <AppText size="small" bold={level === risk} color={level === risk ? colors.white : 'rgba(255,255,255,0.7)'} numberOfLines={1}>
              {t(`risk.${level}`)}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, padding: 18, gap: 6 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  speak: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scale: { flexDirection: 'row', gap: 4, marginTop: 10 },
  step: { height: 4, backgroundColor: colors.white },
});
