// Home screen — the heat-risk meter, live numbers, safety tips and nearest cool places.
// In Senior mode it shows a much simpler screen with huge text and a voice button.
// Cards fade in one after another (see the `delay` on each Card).

import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../../components/AppText';
import BigButton from '../../components/BigButton';
import RiskMeter from '../../components/RiskMeter';
import StatusBanners from '../../components/StatusBanners';
import CoolingBadge, { CoolingIcon } from '../../components/CoolingBadge';
import Card from '../../components/ui/Card';
import FadeIn from '../../components/ui/FadeIn';
import ScalePressable from '../../components/ui/ScalePressable';
import { useHeat } from '../../context/HeatContext';
import { useSettings, useT } from '../../context/SettingsContext';
import { COOLING_ICON, COOLING_TYPES, CoolSpot, nearestSpot, SPOT_ICON } from '../../services/coolSpots';
import { RiskLevel } from '../../services/weather';
import { speak } from '../../services/speech';
import { formatDistance } from '../../utils/geo';
import { formatTime, spokenSummary } from '../../utils/summary';
import { useIsDesktop } from '../../utils/useIsDesktop';
import { useTabBarSpace } from '../../utils/useTabBarSpace';
import { colors, riskColor } from '../../theme';

/** Opens the Routes tab with this place as the destination. */
const routeTo = (spot: CoolSpot) =>
  router.push({
    pathname: '/routes',
    params: { lat: String(spot.latitude), lng: String(spot.longitude), name: spot.name },
  });

export default function HomeScreen() {
  const { t, tList, language } = useT();
  const { settings } = useSettings();
  const { reading, risk, loading, error, location, refresh } = useHeat();
  const isDesktop = useIsDesktop(); // computer: two columns side by side
  const tabSpace = useTabBarSpace(); // room for the floating tab bar

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

  const readAloud = () => speak(spokenSummary(risk, location), language);

  if (settings.seniorMode) {
    const spot = nearestSpot(location);
    return (
      <SeniorHome
        risk={risk}
        spotName={spot.name}
        spotDist={formatDistance(spot.distance)}
        onSpeak={readAloud}
        onGo={() => routeTo(spot)}
      />
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.page, { paddingBottom: 40 + tabSpace }]}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}
    >
      <StatusBanners />
      <View style={isDesktop ? styles.columns : styles.stack}>
        {/* ----- Left column (or top on phones) ----- */}
        <View style={isDesktop ? styles.columnDesktop : styles.stack}>
          <RiskMeter risk={risk} />

          {/* Live numbers from data.gov.sg */}
          {reading && (
            <Card delay={100}>
              <View style={styles.statsRow}>
                <Stat icon="thermometer" label={t('home.temperature')} value={fmt(reading.temperature, '°C')} />
                <Stat icon="water" label={t('home.humidity')} value={fmt(reading.humidity, '%')} />
              </View>
              <View style={styles.statsRow}>
                <Stat icon="sunny" label={t('home.wbgt')} value={fmt(reading.wbgt, '°C')} />
                <Stat icon="body" label={t('home.feelsLike')} value={fmt(reading.heatIndex, '°C')} />
              </View>
              <AppText size="small" color={colors.textMuted}>
                {reading.source === 'wbgt' ? t('home.sourceWbgt') : t('home.sourceHi')}
                {'\n'}
                {t('home.updated', { time: formatTime(reading.observedAt), station: reading.stationName ?? '' })}
              </AppText>
            </Card>
          )}

          <FadeIn delay={180}>
            <BigButton label={t('home.readAloud')} icon="volume-high" onPress={readAloud} />
          </FadeIn>
          {/* Computers can't "pull down to refresh", so they get a button */}
          {isDesktop && (
            <BigButton small variant="outline" label={t('common.refresh')} icon="refresh" loading={loading} onPress={refresh} />
          )}
        </View>

        {/* ----- Right column (or bottom on phones) ----- */}
        <View style={isDesktop ? styles.columnDesktop : styles.stack}>
          {/* Safety tips for this risk level */}
          <Card delay={240} accent={riskColor[risk]}>
            <AppText size="large" bold>
              {t('home.tipsTitle')}
            </AppText>
            {tList(`tips.${risk}`).map((tip, i) => (
              <FadeIn key={tip} delay={320 + i * 80} from="left" style={styles.tipRow}>
                <Ionicons name="checkmark-circle" size={24} color={riskColor[risk]} />
                <AppText style={{ flex: 1 }}>{tip}</AppText>
              </FadeIn>
            ))}
          </Card>

          {/* Nearest place of each cooling type: air-con, shaded, green */}
          <Card delay={380}>
            <View>
              <AppText size="large" bold>
                {t('home.nearestTitle')}
              </AppText>
              <AppText size="small" color={colors.textMuted}>
                {t('home.nearestHint')}
              </AppText>
            </View>
            {COOLING_TYPES.map((cooling, i) => {
              const spot = nearestSpot(location, cooling);
              return (
                <FadeIn key={cooling} delay={460 + i * 90}>
                  <ScalePressable
                    style={styles.placeRow}
                    onPress={() => routeTo(spot)}
                    accessibilityRole="button"
                    accessibilityLabel={`${t(`cooling.${cooling}`)}: ${spot.name}, ${formatDistance(spot.distance)}`}
                  >
                    <CoolingIcon cooling={cooling} icon={COOLING_ICON[cooling]} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText bold numberOfLines={1}>
                        {spot.name}
                      </AppText>
                      <View style={styles.metaRow}>
                        <CoolingBadge cooling={cooling} />
                        <Ionicons name={SPOT_ICON[spot.type] as any} size={14} color={colors.textMuted} />
                        <AppText size="small" color={colors.textMuted}>
                          {formatDistance(spot.distance)}
                        </AppText>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
                  </ScalePressable>
                </FadeIn>
              );
            })}
          </Card>
        </View>
      </View>
    </ScrollView>
  );
}

/** Senior mode: one huge meter, one huge voice button, one "take me there" button. */
function SeniorHome(props: { risk: RiskLevel; spotName: string; spotDist: string; onSpeak: () => void; onGo: () => void }) {
  const { t, tList } = useT();
  const tabSpace = useTabBarSpace();
  const spoke = useRef(false);

  // Read the advice aloud once when the screen opens.
  useEffect(() => {
    if (!spoke.current) {
      spoke.current = true;
      props.onSpeak();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={[styles.page, { paddingBottom: 40 + tabSpace }]}>
      <StatusBanners />
      <RiskMeter risk={props.risk} huge />
      <FadeIn delay={120}>
        <BigButton label={t('home.readAloud')} icon="volume-high" onPress={props.onSpeak} style={{ minHeight: 96 }} />
      </FadeIn>
      <Card delay={220} accent={riskColor[props.risk]}>
        <AppText size="title" bold>
          {tList(`tips.${props.risk}`)[0]}
        </AppText>
      </Card>
      <Card delay={320}>
        <AppText size="large" color={colors.textMuted}>
          {t('home.nearest')}
        </AppText>
        <AppText size="title" bold>
          {props.spotName} · {props.spotDist}
        </AppText>
        <BigButton label={t('home.goThere')} icon="navigate" onPress={props.onGo} style={{ minHeight: 80 }} />
      </Card>
    </ScrollView>
  );
}

function Stat({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={16} color={colors.primary} />
        <AppText size="small" color={colors.textMuted} numberOfLines={1} style={{ flex: 1 }}>
          {label}
        </AppText>
      </View>
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
  page: { padding: 16, gap: 16, paddingBottom: 40, width: '100%', maxWidth: 1100, alignSelf: 'center' },
  stack: { gap: 16 },
  columns: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  columnDesktop: { flex: 1, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: colors.background, borderRadius: 16, padding: 12, gap: 2 },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tipRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 16,
    backgroundColor: colors.background,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
});
