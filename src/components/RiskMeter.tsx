// RiskMeter.tsx — the big Low / Moderate / High heat meter on the Home screen.
//
// Animations (all skipped if the phone has "Reduce Motion" on):
//  • The icon has a soft "pulse" ring. It pulses faster when the risk is higher.
//  • A white marker slides along the gauge to the current level.
//  • When the level changes, the big word "pops" in.

import React, { useEffect, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppText from './AppText';
import FadeIn from './ui/FadeIn';
import { colors, gradients, radius, shadow } from '../theme';
import { RiskLevel } from '../services/weather';
import { useT } from '../context/SettingsContext';
import { NATIVE_DRIVER, useReducedMotion } from '../utils/motion';

const LEVELS: RiskLevel[] = ['low', 'moderate', 'high'];
const ICONS = { low: 'happy', moderate: 'alert-circle', high: 'warning' } as const;
const PULSE_MS = { low: 2400, moderate: 1600, high: 900 }; // faster pulse = more urgent
const MARKER = 26; // size of the gauge marker

export default function RiskMeter({ risk, huge }: { risk: RiskLevel; huge?: boolean }) {
  const { t } = useT();
  const reduced = useReducedMotion();
  const [pulse] = useState(() => new Animated.Value(0));
  const [pop] = useState(() => new Animated.Value(1));
  const [position] = useState(() => new Animated.Value(LEVELS.indexOf(risk)));
  const [gaugeWidth, setGaugeWidth] = useState(0);

  // Pulse ring: grows from 0 → 1 over and over.
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: PULSE_MS[risk], easing: Easing.out(Easing.ease), useNativeDriver: NATIVE_DRIVER }),
    );
    pulse.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [risk, reduced, pulse]);

  // When the risk changes: slide the marker and "pop" the big word.
  useEffect(() => {
    const index = LEVELS.indexOf(risk);
    if (reduced) {
      position.setValue(index);
      return;
    }
    Animated.spring(position, { toValue: index, speed: 8, bounciness: 10, useNativeDriver: NATIVE_DRIVER }).start();
    pop.setValue(0.85);
    Animated.spring(pop, { toValue: 1, speed: 12, bounciness: 12, useNativeDriver: NATIVE_DRIVER }).start();
  }, [risk, reduced, position, pop]);

  // Marker x-position: the middle of segment 0, 1 or 2.
  const segment = gaugeWidth / 3;
  const markerX = position.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [segment * 0.5 - MARKER / 2, segment * 1.5 - MARKER / 2, segment * 2.5 - MARKER / 2],
  });

  const iconSize = huge ? 60 : 44;

  return (
    <FadeIn>
      <View
        style={styles.shadowBox}
        accessible
        accessibilityLabel={`${t('risk.title')}: ${t(`risk.${risk}`)}`}
      >
        <LinearGradient colors={gradients[risk]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
          {/* Decorative soft circles in the background */}
          <View style={[styles.blob, { top: -40, right: -30, width: 160, height: 160 }]} />
          <View style={[styles.blob, { bottom: -50, left: -40, width: 140, height: 140 }]} />

          <AppText size="body" bold color="rgba(255,255,255,0.9)" center>
            {t('risk.title')}
          </AppText>

          {/* Icon with pulse ring */}
          <View style={[styles.iconWrap, { width: iconSize * 1.9, height: iconSize * 1.9 }]}>
            {!reduced && (
              <Animated.View
                style={[
                  styles.pulse,
                  {
                    width: iconSize * 1.9,
                    height: iconSize * 1.9,
                    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
                    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.25] }) }],
                  },
                ]}
              />
            )}
            <View style={[styles.iconCircle, { width: iconSize * 1.4, height: iconSize * 1.4 }]}>
              <Ionicons name={ICONS[risk]} size={iconSize} color={colors.white} />
            </View>
          </View>

          <Animated.View style={{ transform: [{ scale: pop }] }}>
            <AppText size="huge" bold color={colors.white} center style={huge && { fontSize: 64, lineHeight: 76 }}>
              {t(`risk.${risk}`)}
            </AppText>
          </Animated.View>

          {/* Gauge: 3 segments + sliding marker */}
          <View onLayout={(e: LayoutChangeEvent) => setGaugeWidth(e.nativeEvent.layout.width)} style={styles.gauge}>
            <View style={styles.track}>
              {LEVELS.map((level) => (
                <View key={level} style={[styles.segment, { opacity: level === risk ? 0.95 : 0.35 }]} />
              ))}
            </View>
            {gaugeWidth > 0 && (
              <Animated.View style={[styles.marker, { transform: [{ translateX: markerX }] }]}>
                <View style={[styles.markerDot, { backgroundColor: gradients[risk][0] }]} />
              </Animated.View>
            )}
            <View style={styles.labels}>
              {LEVELS.map((level) => (
                <AppText
                  key={level}
                  size="small"
                  bold={level === risk}
                  color={level === risk ? colors.white : 'rgba(255,255,255,0.7)'}
                  center
                  numberOfLines={1}
                  style={{ flex: 1 }}
                >
                  {t(`risk.${level}`)}
                </AppText>
              ))}
            </View>
          </View>
        </LinearGradient>
      </View>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  shadowBox: { borderRadius: radius.card + 4, boxShadow: shadow.raised },
  card: {
    borderRadius: radius.card + 4,
    padding: 20,
    gap: 10,
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  blob: { position: 'absolute', borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.08)' },
  iconWrap: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  pulse: { position: 'absolute', borderRadius: radius.pill, backgroundColor: colors.white },
  iconCircle: {
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gauge: { marginTop: 6, gap: 6 },
  track: { flexDirection: 'row', gap: 4, height: 12 },
  segment: { flex: 1, borderRadius: radius.pill, backgroundColor: colors.white },
  marker: {
    position: 'absolute',
    top: -(MARKER - 12) / 2,
    left: 0,
    width: MARKER,
    height: MARKER,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 6px rgba(0,0,0,0.3)',
  },
  markerDot: { width: 10, height: 10, borderRadius: radius.pill },
  labels: { flexDirection: 'row' },
});
