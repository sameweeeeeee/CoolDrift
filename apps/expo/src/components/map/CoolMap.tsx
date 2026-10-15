// CoolMap.tsx — the map on PHONES (iOS/Android), using react-native-maps.
// On computers, CoolMap.web.tsx is used instead (Expo picks the right file).

import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Circle, Marker, Polyline } from 'react-native-maps';
import { CoolMapProps, HEAT_FILL, PIN_COLOR } from './mapTypes';

// react-native-maps only understands a few pin colour names on Android.
const NATIVE_PIN = { spot: 'green', rest: 'turquoise', dest: 'red' } as const;

export default function CoolMap({ initialCenter, points = [], circles = [], lines = [], focus, onPress }: CoolMapProps) {
  const mapRef = useRef<MapView>(null);

  // Move the camera whenever `focus.version` changes.
  useEffect(() => {
    if (!focus || focus.points.length === 0) return;
    if (focus.points.length === 1) {
      mapRef.current?.animateToRegion({ ...focus.points[0], latitudeDelta: 0.012, longitudeDelta: 0.012 }, 500);
    } else {
      mapRef.current?.fitToCoordinates(focus.points, {
        edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
        animated: true,
      });
    }
  }, [focus?.version]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={{ ...initialCenter, latitudeDelta: 0.04, longitudeDelta: 0.04 }}
      showsUserLocation
      onPress={(e) => onPress?.(e.nativeEvent.coordinate)}
    >
      {lines.map((l) => (
        <Polyline
          key={l.id}
          coordinates={l.path}
          strokeColor={l.color}
          strokeWidth={l.width}
          lineDashPattern={l.dashed ? [8, 8] : undefined}
        />
      ))}

      {/* Heat layer: two circles per report (soft outer glow + stronger centre) */}
      {circles.map((c) => (
        <React.Fragment key={c.id}>
          <Circle center={c} radius={120 + c.level * 60} fillColor={HEAT_FILL[c.level]} strokeWidth={0} />
          <Circle center={c} radius={50 + c.level * 20} fillColor={HEAT_FILL[c.level]} strokeWidth={0} />
        </React.Fragment>
      ))}

      {points.map((p) => (
        <Marker
          key={p.id}
          coordinate={p}
          title={p.title}
          description={p.description}
          pinColor={p.color ?? NATIVE_PIN[p.kind] ?? PIN_COLOR[p.kind]}
        />
      ))}
    </MapView>
  );
}
