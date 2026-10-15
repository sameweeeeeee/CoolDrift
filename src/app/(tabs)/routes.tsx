// Routes screen — tap the map to choose a destination, then get a "cool route".
//  • Green line = cool route (goes past cool spots, with rest stops)
//  • Grey dashed line = the normal fastest route, for comparison
// See src/services/routing.ts for how the route is chosen.
// Phone: map on top, panel below. Computer: map on the left, panel on the right.

import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../../components/AppText';
import BigButton from '../../components/BigButton';
import CoolMap from '../../components/map/CoolMap';
import { MapFocus, MapLine, MapPoint } from '../../components/map/mapTypes';
import { useHeat } from '../../context/HeatContext';
import { useT } from '../../context/SettingsContext';
import { CoolRoutePlan, TravelMode, planCoolRoute } from '../../services/routing';
import { LatLng, formatDistance, formatDuration } from '../../utils/geo';
import { useIsDesktop } from '../../utils/useIsDesktop';
import { colors } from '../../theme';

type Destination = { coords: LatLng; name: string };

export default function RoutesScreen() {
  const { t } = useT();
  const { location, risk } = useHeat();
  const isDesktop = useIsDesktop();
  const params = useLocalSearchParams<{ lat?: string; lng?: string; name?: string }>();

  const [dest, setDest] = useState<Destination | null>(null);
  const [mode, setMode] = useState<TravelMode>('foot');
  const [plan, setPlan] = useState<CoolRoutePlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [focus, setFocus] = useState<MapFocus>({ points: [], version: 0 });

  /** Ask routing.ts for the routes, then zoom the map to show them. */
  const findRoute = async (to: Destination, travel: TravelMode) => {
    setLoading(true);
    setError(false);
    try {
      const result = await planCoolRoute(location, to.coords, travel);
      setPlan(result);
      setFocus((f) => ({ points: [location, to.coords, ...result.cool.path], version: f.version + 1 }));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // If another screen sent us here with a place ("Show route"), plan straight away.
  useEffect(() => {
    if (params.lat && params.lng) {
      // Setting state here is fine: we're reacting to a new place sent from another screen.
      const d = { coords: { latitude: Number(params.lat), longitude: Number(params.lng) }, name: params.name ?? t('routes.pinned') };
      setDest(d); // eslint-disable-line react-hooks/set-state-in-effect
      findRoute(d, mode);
    }
  }, [params.lat, params.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const onMapPress = (where: LatLng) => {
    setDest({ coords: where, name: t('routes.pinned') });
    setPlan(null);
  };

  const changeMode = (m: TravelMode) => {
    setMode(m);
    if (dest && plan) findRoute(dest, m);
  };

  const extraMin = plan ? Math.round((plan.cool.duration - plan.fastest.duration) / 60) : 0;

  // What to draw on the map
  const lines: MapLine[] = plan
    ? [
        { id: 'fast', path: plan.fastest.path, color: colors.fastRoute, width: 4, dashed: true },
        { id: 'cool', path: plan.cool.path, color: colors.coolRoute, width: 7 },
      ]
    : [];
  const points: MapPoint[] = [
    ...(plan?.restStops ?? []).map((s) => ({
      id: s.id,
      kind: 'rest' as const,
      latitude: s.latitude,
      longitude: s.longitude,
      title: `${t('routes.restStop')}: ${s.name}`,
      description: s.note,
    })),
    ...(dest ? [{ id: 'dest', kind: 'dest' as const, ...dest.coords, title: dest.name }] : []),
  ];

  return (
    <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column' }}>
      <View style={{ flex: 1 }}>
        <CoolMap
          initialCenter={location}
          userLocation={location}
          focus={focus}
          onPress={onMapPress}
          lines={lines}
          points={points}
        />

        {!dest && (
          <View style={styles.hint} pointerEvents="none">
            <Ionicons name="hand-left" size={26} color={colors.primary} />
            <AppText bold style={{ flex: 1 }}>
              {t('routes.tapDestination')}
            </AppText>
          </View>
        )}
      </View>

      {/* ---------- Side / bottom panel ---------- */}
      <ScrollView style={isDesktop ? styles.panelDesktop : styles.panel} contentContainerStyle={{ gap: 10, padding: 14 }}>
        {dest && (
          <AppText size="large" bold numberOfLines={isDesktop ? 2 : 1}>
            {t('routes.to', { name: dest.name })}
          </AppText>
        )}
        {isDesktop && !dest && <AppText>{t('routes.tapDestination')}</AppText>}

        {/* Walk / Cycle switch */}
        <View style={styles.row}>
          <BigButton style={{ flex: 1 }} small label={t('routes.walk')} icon="walk" variant={mode === 'foot' ? 'primary' : 'outline'} onPress={() => changeMode('foot')} />
          <BigButton style={{ flex: 1 }} small label={t('routes.cycle')} icon="bicycle" variant={mode === 'bike' ? 'primary' : 'outline'} onPress={() => changeMode('bike')} />
        </View>

        {dest && !plan && (
          <BigButton label={loading ? t('routes.planning') : t('routes.find')} icon="leaf" loading={loading} onPress={() => findRoute(dest, mode)} />
        )}
        {error && <AppText color={colors.high}>{t('routes.error')}</AppText>}

        {plan && (
          <>
            {risk === 'high' && (
              <View style={[styles.note, { borderColor: colors.high }]}>
                <Ionicons name="warning" size={22} color={colors.high} />
                <AppText style={{ flex: 1 }} bold>
                  {t('routes.highWarning')}
                </AppText>
              </View>
            )}

            {/* Cool route summary */}
            <View style={[styles.summary, { borderColor: colors.coolRoute }]}>
              <AppText bold color={colors.coolRoute}>
                🌿 {t('routes.cool')}
              </AppText>
              <AppText size="large" bold>
                {formatDuration(plan.cool.duration)} · {formatDistance(plan.cool.distance)}
              </AppText>
              <AppText size="small">
                {t('routes.stops', { count: plan.restStops.length })} · {t('routes.nearCool', { pct: plan.coolScore })}
                {extraMin > 0 ? ` · ${t('routes.extra', { min: extraMin })}` : ''}
              </AppText>
              {plan.restStops.map((s) => (
                <AppText key={s.id} size="small" color={colors.textMuted}>
                  • {s.name}
                </AppText>
              ))}
            </View>

            {/* Fastest route, for comparison */}
            <View style={[styles.summary, { borderColor: colors.fastRoute }]}>
              <AppText bold color={colors.fastRoute}>
                ⏱ {t('routes.fastest')}: {formatDuration(plan.fastest.duration)} · {formatDistance(plan.fastest.distance)}
              </AppText>
            </View>

            {plan.approximate && <AppText size="small" color={colors.moderate}>{t('routes.approximate')}</AppText>}

            <BigButton
              label={t('routes.clear')}
              variant="outline"
              small
              onPress={() => {
                setPlan(null);
                setDest(null);
                router.setParams({ lat: undefined, lng: undefined, name: undefined }); // so the same place can be chosen again
              }}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: {
    position: 'absolute',
    top: 12,
    left: Platform.OS === 'web' ? 60 : 12, // leaves room for the zoom buttons on the computer map
    right: 12,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  panel: { maxHeight: '48%', backgroundColor: colors.primaryLight },
  panelDesktop: { width: 420, flexGrow: 0, borderLeftWidth: 2, borderLeftColor: colors.border, backgroundColor: colors.primaryLight },
  row: { flexDirection: 'row', gap: 10 },
  summary: { backgroundColor: colors.white, borderRadius: 14, borderWidth: 2, padding: 12, gap: 4 },
  note: { flexDirection: 'row', gap: 8, alignItems: 'center', borderWidth: 2, borderRadius: 12, padding: 10, backgroundColor: colors.white },
});
