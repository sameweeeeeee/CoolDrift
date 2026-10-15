// Cool Spots screen — map + list of cool places, and the crowdsourced heat map.
//  • Green pins = cool places (from src/data/coolSpots.json)
//  • Coloured circles = hot spots reported by users (yellow → orange → red)
//  • "Report hot spot" lets you add your own report.
// Phone: map on top, list below. Computer: map on the left, list on the right.

import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../../components/AppText';
import BigButton from '../../components/BigButton';
import CoolMap from '../../components/map/CoolMap';
import { MapFocus } from '../../components/map/mapTypes';
import { useHeat } from '../../context/HeatContext';
import { useT } from '../../context/SettingsContext';
import { CoolSpotWithDistance, SPOT_ICON, SpotType, spotsByDistance } from '../../services/coolSpots';
import { HotLevel, HotSpotReport, addReport, loadReports } from '../../services/reports';
import { LatLng, formatDistance } from '../../utils/geo';
import { useIsDesktop } from '../../utils/useIsDesktop';
import { colors, coolingColor } from '../../theme';

// Button colours for "how hot": dark enough for white text to be readable.
const HEAT_SOLID: Record<HotLevel, string> = { 1: '#8A6D00', 2: '#B34700', 3: colors.high };

const MAP_PIN_LIMIT = 80;

const TYPES: SpotType[] = ['community_centre', 'library', 'mall', 'hawker', 'park', 'water_point'];

// Steps of reporting: not reporting → choosing a place → choosing how hot
type ReportStep = { step: 'none' } | { step: 'pick' } | { step: 'level'; where: LatLng };

export default function SpotsScreen() {
  const { t } = useT();
  const { location } = useHeat();
  const isDesktop = useIsDesktop();

  const [filter, setFilter] = useState<SpotType | null>(null);
  const [reports, setReports] = useState<HotSpotReport[]>([]);
  const [showHeat, setShowHeat] = useState(true);
  const [report, setReport] = useState<ReportStep>({ step: 'none' });
  const [message, setMessage] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocus>({ points: [], version: 0 });

  // Load saved hot spot reports.
  useEffect(() => {
    loadReports().then(setReports);
  }, []);

  // When we learn the user's location, show it together with the 3 nearest cool spots.
  useEffect(() => {
    const nearby = spotsByDistance(location).slice(0, 3);
    setFocus((f) => ({ points: [location, ...nearby], version: f.version + 1 })); // eslint-disable-line react-hooks/set-state-in-effect
  }, [location]);

  // Spots sorted by distance (recalculated only when location or filter changes).
  const spots = useMemo(
    () => spotsByDistance(location).filter((s) => !filter || s.type === filter),
    [location, filter],
  );

  const onMapPress = (where: LatLng) => {
    if (report.step === 'pick') setReport({ step: 'level', where });
  };

  const saveReport = async (level: HotLevel) => {
    if (report.step !== 'level') return;
    setReports(await addReport(report.where, level));
    setReport({ step: 'none' });
    setShowHeat(true);
    setMessage(t('spots.saved'));
    setTimeout(() => setMessage(null), 3000);
  };

  const focusSpot = (s: CoolSpotWithDistance) => setFocus((f) => ({ points: [s], version: f.version + 1 }));

  const routeTo = (s: CoolSpotWithDistance) =>
    router.push({ pathname: '/routes', params: { lat: String(s.latitude), lng: String(s.longitude), name: s.name } });

  // ---------- The map (with floating buttons) ----------
  const map = (
    <View style={isDesktop ? styles.mapDesktop : styles.mapPhone}>
      <CoolMap
        initialCenter={location}
        userLocation={location}
        focus={focus}
        onPress={onMapPress}
        points={[
          // Only the 80 nearest go on the map, so phones stay smooth (the list still has all of them).
          ...spots.slice(0, MAP_PIN_LIMIT).map((s) => ({
            id: s.id,
            kind: 'spot' as const,
            color: coolingColor[s.cooling], // blue = air-con, brown = shaded, green = green area
            latitude: s.latitude,
            longitude: s.longitude,
            title: s.name,
            description: `${t(`spots.types.${s.type}`)} · ${formatDistance(s.distance)}`,
          })),
          ...(report.step === 'level' ? [{ id: 'new-report', kind: 'dest' as const, ...report.where }] : []),
        ]}
        circles={showHeat ? reports : []}
      />

      {report.step === 'none' && (
        <View style={styles.mapButtons} pointerEvents="box-none">
          <BigButton small label={t('spots.report')} icon="flame" variant="danger" onPress={() => setReport({ step: 'pick' })} />
          <BigButton
            small
            label={t('spots.showReports')}
            icon={showHeat ? 'eye' : 'eye-off'}
            variant="outline"
            onPress={() => setShowHeat(!showHeat)}
          />
        </View>
      )}
      {message && (
        <View style={styles.toast}>
          <AppText bold color={colors.white} center>
            {message}
          </AppText>
        </View>
      )}
    </View>
  );

  // ---------- Reporting panels ----------
  const pickPanel = (
    <View style={styles.panel}>
      <AppText size="large" bold center>
        {t('spots.tapToPin')}
      </AppText>
      <BigButton label={t('spots.useMyLocation')} icon="locate" onPress={() => setReport({ step: 'level', where: location })} />
      <BigButton label={t('common.cancel')} variant="outline" onPress={() => setReport({ step: 'none' })} />
    </View>
  );

  const levelPanel = (
    <View style={styles.panel}>
      <AppText size="large" bold center>
        {t('spots.howHot')}
      </AppText>
      <View style={styles.levelRow}>
        {([1, 2, 3] as HotLevel[]).map((lvl) => (
          <Pressable
            key={lvl}
            onPress={() => saveReport(lvl)}
            style={[styles.levelBtn, { backgroundColor: HEAT_SOLID[lvl] }]}
            accessibilityRole="button"
            accessibilityLabel={t(`spots.level${lvl}`)}
          >
            <AppText size="title" color={colors.white} center>
              {'🔥'.repeat(lvl)}
            </AppText>
            <AppText bold color={colors.white} center>
              {t(`spots.level${lvl}`)}
            </AppText>
          </Pressable>
        ))}
      </View>
      <BigButton label={t('common.cancel')} variant="outline" onPress={() => setReport({ step: 'none' })} />
    </View>
  );

  // ---------- The list of spots ----------
  const list = (
    <FlatList
      style={{ flex: 1 }}
      data={spots}
      keyExtractor={(s) => s.id}
      contentContainerStyle={{ padding: 12, gap: 10 }}
      ListHeaderComponent={
        <View style={{ gap: 8 }}>
          {isDesktop && (
            <AppText size="large" bold>
              {t('spots.title')}
            </AppText>
          )}
          <ScrollView horizontal={!isDesktop} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label={t('spots.all')} active={!filter} onPress={() => setFilter(null)} />
            {TYPES.map((type) => (
              <Chip key={type} label={t(`spots.types.${type}`)} active={filter === type} onPress={() => setFilter(type)} />
            ))}
          </ScrollView>
          {showHeat && reports.length > 0 && (
            <AppText size="small" color={colors.textMuted}>
              {t('spots.legend')}
            </AppText>
          )}
        </View>
      }
      renderItem={({ item }) => (
        // The row is a plain View: a button inside a button isn't allowed on the web.
        <View style={styles.item}>
          <Pressable onPress={() => focusSpot(item)} style={styles.itemInfo} accessibilityRole="button">
            <Ionicons name={SPOT_ICON[item.type] as any} size={32} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <AppText bold>{item.name}</AppText>
              <AppText size="small" color={colors.textMuted}>
                {t(`spots.types.${item.type}`)} · {formatDistance(item.distance)}
                {item.note ? `\n${item.note}` : ''}
              </AppText>
            </View>
          </Pressable>
          <BigButton small label={t('spots.routeHere')} icon="navigate" onPress={() => routeTo(item)} />
        </View>
      )}
    />
  );

  const side = report.step === 'pick' ? pickPanel : report.step === 'level' ? levelPanel : list;

  return (
    <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column' }}>
      {map}
      <View style={isDesktop ? styles.sideDesktop : { flex: 1 }}>{side}</View>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: colors.primary }]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <AppText size="small" bold color={active ? colors.white : colors.primary}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  mapPhone: { flex: 1.1 },
  mapDesktop: { flex: 1 },
  sideDesktop: { width: 420, borderLeftWidth: 2, borderLeftColor: colors.border, backgroundColor: colors.primaryLight },
  // zIndex keeps the buttons above the web map
  mapButtons: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', gap: 8, justifyContent: 'flex-end', zIndex: 1000 },
  toast: { position: 'absolute', bottom: 12, left: 12, right: 12, backgroundColor: colors.primaryDark, borderRadius: 12, padding: 12, zIndex: 1000 },
  panel: { flex: 1, padding: 16, gap: 12, backgroundColor: colors.white },
  levelRow: { flexDirection: 'row', gap: 8 },
  levelBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: 14, padding: 12 },
  itemInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  chips: { gap: 8, flexWrap: 'wrap', flexDirection: 'row' },
  chip: { borderWidth: 2, borderColor: colors.primary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.white },
});
