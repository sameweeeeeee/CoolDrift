// Home screen — the heat-risk meter, live numbers, safety tips and nearest cool place.
// In Senior mode it shows a much simpler screen with huge text and a voice button.

import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../../components/AppText';
import BigButton from '../../components/BigButton';
import RiskMeter from '../../components/RiskMeter';
import StatusBanners from '../../components/StatusBanners';
import { useHeat } from '../../context/HeatContext';
import { useSettings, useT } from '../../context/SettingsContext';
import { nearestSpot, SPOT_ICON } from '../../services/coolSpots';
import { speak } from '../../services/speech';
import { formatDistance } from '../../utils/geo';
import { formatTime, spokenSummary } from '../../utils/summary';
import { colors, riskColor } from '../../theme';
import { useIsDesktop } from '../../utils/useIsDesktop';

export default function HomeScreen() {
  const { t, tList, language } = useT();
  const { settings } = useSettings();
  const { reading, risk, loading, error, location, refresh } = useHeat();
  const isDesktop = useIsDesktop(); // computer: two columns side by side

  // First load: show a spinner.
  if (!risk && loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText size="large">{t('common.loading')}</AppText>
      </View>
    );
  }

  // No live data and nothing saved: show an error with a retry button.
  if (!risk && error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline" size={64} color={colors.textMuted} />
        <AppText size="large" center>
          {t('common.noData')}
        </AppText>
        <BigButton label={t('common.retry')} icon="refresh" onPress={refresh} />
      </View>
    );
  }
  if (!risk) return null;

  const spot = nearestSpot(location);
  const readAloud = () => speak(spokenSummary(risk, location), language);
  const goToSpot = () =>
    router.push({
      pathname: '/routes',
      params: { lat: String(spot.latitude), lng: String(spot.longitude), name: spot.name },
    });

  if (settings.seniorMode) {
    return (
      <SeniorHome
        risk={risk}
        spotName={spot.name}
        spotDist={formatDistance(spot.distance)}
        onSpeak={readAloud}
        onGo={goToSpot}
      />
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}
    >
      <StatusBanners />
      <View style={isDesktop ? styles.columns : styles.stack}>
        {/* ----- Left column (or top on phones) ----- */}
        <View style={isDesktop ? styles.columnDesktop : styles.stack}>
          <RiskMeter risk={risk} />

          {/* Live numbers from data.gov.sg */}
          {reading && (
            <View style={styles.card}>
              <View style={styles.statsRow}>
                <Stat label={t('home.temperature')} value={fmt(reading.temperature, '°C')} />
                <Stat label={t('home.humidity')} value={fmt(reading.humidity, '%')} />
              </View>
              <View style={styles.statsRow}>
                <Stat label={t('home.wbgt')} value={fmt(reading.wbgt, '°C')} />
                <Stat label={t('home.feelsLike')} value={fmt(reading.heatIndex, '°C')} />
              </View>
              <AppText size="small" color={colors.textMuted}>
                {reading.source === 'wbgt' ? t('home.sourceWbgt') : t('home.sourceHi')}
                {'\n'}
                {t('home.updated', { time: formatTime(reading.observedAt), station: reading.stationName ?? '' })}
              </AppText>
            </View>
          )}

          <BigButton label={t('home.readAloud')} icon="volume-high" onPress={readAloud} />
          {/* Computers can't "pull down to refresh", so they get a button */}
          {isDesktop && (
            <BigButton
              small
              variant="outline"
              label={t('common.refresh')}
              icon="refresh"
              loading={loading}
              onPress={refresh}
            />
          )}
        </View>

        {/* ----- Right column (or bottom on phones) ----- */}
        <View style={isDesktop ? styles.columnDesktop : styles.stack}>
          {/* Safety tips for this risk level */}
          <View style={[styles.card, { borderLeftWidth: 8, borderLeftColor: riskColor[risk] }]}>
            <AppText size="large" bold>
              {t('home.tipsTitle')}
            </AppText>
            {tList(`tips.${risk}`).map((tip) => (
              <View key={tip} style={styles.tipRow}>
                <Ionicons name="checkmark-circle" size={24} color={riskColor[risk]} />
                <AppText style={{ flex: 1 }}>{tip}</AppText>
              </View>
            ))}
          </View>

          {/* Nearest cool place */}
          <View style={styles.card}>
            <AppText size="small" bold color={colors.textMuted}>
              {t('home.nearest')}
            </AppText>
            <View style={styles.tipRow}>
              <Ionicons name={SPOT_ICON[spot.type] as any} size={32} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <AppText size="large" bold>
                  {spot.name}
                </AppText>
                <AppText color={colors.textMuted}>
                  {t(`spots.types.${spot.type}`)} · {formatDistance(spot.distance)}
                </AppText>
              </View>
            </View>
            <BigButton label={t('home.goThere')} icon="navigate" variant="outline" onPress={goToSpot} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

/** Senior mode: one huge meter, one huge voice button, one "take me there" button. */
function SeniorHome(props: {
  risk: 'low' | 'moderate' | 'high';
  spotName: string;
  spotDist: string;
  onSpeak: () => void;
  onGo: () => void;
}) {
  const { t, tList } = useT();
  const spoke = useRef(false);

  // Read the advice aloud once when the screen opens.
  useEffect(() => {
    if (!spoke.current) {
      spoke.current = true;
      props.onSpeak();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <StatusBanners />
      <RiskMeter risk={props.risk} huge />
      <BigButton label={t('home.readAloud')} icon="volume-high" onPress={props.onSpeak} style={{ minHeight: 96 }} />
      <View style={styles.card}>
        <AppText size="title" bold>
          {tList(`tips.${props.risk}`)[0]}
        </AppText>
      </View>
      <View style={styles.card}>
        <AppText size="large" color={colors.textMuted}>
          {t('home.nearest')}
        </AppText>
        <AppText size="title" bold>
          {props.spotName} · {props.spotDist}
        </AppText>
        <BigButton label={t('home.goThere')} icon="navigate" onPress={props.onGo} style={{ minHeight: 80 }} />
      </View>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <AppText size="small" color={colors.textMuted}>
        {label}
      </AppText>
      <AppText size="title" bold>
        {value}
      </AppText>
    </View>
  );
}

/** Shows "—" when a number is missing. */
const fmt = (n: number | undefined, unit: string) => (n === undefined ? '—' : `${Math.round(n * 10) / 10}${unit}`);

const styles = StyleSheet.create({
  // maxWidth + centre keeps things readable on big computer screens
  page: { padding: 16, gap: 14, paddingBottom: 32, width: '100%', maxWidth: 1100, alignSelf: 'center' },
  stack: { gap: 14 },
  columns: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  columnDesktop: { flex: 1, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 16, gap: 10 },
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: colors.primaryLight, borderRadius: 12, padding: 10 },
  tipRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
});
