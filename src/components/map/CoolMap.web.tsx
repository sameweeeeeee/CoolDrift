// CoolMap.web.tsx — the map on COMPUTERS (web browser), using Leaflet + OpenStreetMap.
// Free, no API key. Expo automatically uses this file instead of CoolMap.tsx on the web.
// We draw pins as coloured dots (CircleMarker), so we don't need any image files.

import React, { useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { MapContainer, TileLayer, CircleMarker, Circle, Polyline, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { CoolMapProps, HEAT_HEX, PIN_COLOR } from './mapTypes';
import { colors } from '../../theme';

export default function CoolMap({ initialCenter, points = [], circles = [], lines = [], focus, userLocation, onPress }: CoolMapProps) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <MapContainer
        center={[initialCenter.latitude, initialCenter.longitude]}
        zoom={14}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom
      >
        {/* The map pictures ("tiles") come from OpenStreetMap */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {lines.map((l) => (
          <Polyline
            key={l.id}
            positions={l.path.map((p) => [p.latitude, p.longitude])}
            pathOptions={{ color: l.color, weight: l.width, dashArray: l.dashed ? '8 8' : undefined }}
          />
        ))}

        {/* Heat layer: two circles per report (soft outer glow + stronger centre) */}
        {circles.map((c) => (
          <React.Fragment key={c.id}>
            <Circle
              center={[c.latitude, c.longitude]}
              radius={120 + c.level * 60}
              pathOptions={{ stroke: false, fillColor: HEAT_HEX[c.level], fillOpacity: 0.35 }}
            />
            <Circle
              center={[c.latitude, c.longitude]}
              radius={50 + c.level * 20}
              pathOptions={{ stroke: false, fillColor: HEAT_HEX[c.level], fillOpacity: 0.4 }}
            />
          </React.Fragment>
        ))}

        {points.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.latitude, p.longitude]}
            radius={p.kind === 'dest' ? 11 : 9}
            pathOptions={{ color: colors.white, weight: 3, fillColor: PIN_COLOR[p.kind], fillOpacity: 1 }}
          >
            {p.title && (
              <Tooltip>
                <b>{p.title}</b>
                {p.description ? <br /> : null}
                {p.description}
              </Tooltip>
            )}
          </CircleMarker>
        ))}

        {/* "You are here" blue dot */}
        {userLocation && (
          <CircleMarker
            center={[userLocation.latitude, userLocation.longitude]}
            radius={8}
            pathOptions={{ color: colors.white, weight: 3, fillColor: '#1E88E5', fillOpacity: 1 }}
          />
        )}

        <ClickHandler onPress={onPress} />
        <CameraController focus={focus} />
      </MapContainer>
    </View>
  );
}

/** Sends map clicks back to the screen. */
function ClickHandler({ onPress }: { onPress?: CoolMapProps['onPress'] }) {
  useMapEvents({
    click: (e) => onPress?.({ latitude: e.latlng.lat, longitude: e.latlng.lng }),
  });
  return null;
}

/**
 * Moves the map when `focus.version` changes.
 *
 * Tricky bit: Leaflet measures its box when it starts, but in React Native Web the
 * box often gets its real size a moment later. If we zoom while the box is still
 * tiny, the zoom is wrong (or the map goes grey). So we:
 *   1. watch the box size and tell Leaflet to re-measure when it changes, and
 *   2. if the box is too small to zoom yet, remember the request and do it once it has a size.
 */
function CameraController({ focus }: { focus?: CoolMapProps['focus'] }) {
  const map = useMap();
  const waiting = useRef<CoolMapProps['focus'] | null>(null);

  const move = useCallback(
    (f: NonNullable<CoolMapProps['focus']>) => {
      const box = map.getContainer();
      if (box.clientWidth < 50 || box.clientHeight < 50) {
        waiting.current = f; // too small right now, try again after the next resize
        return;
      }
      waiting.current = null;
      map.invalidateSize();
      // animate: false = jump straight there. (Animations can get stuck if the
      // window is in the background, which leaves the pins un-drawn.)
      if (f.points.length === 1) {
        map.setView([f.points[0].latitude, f.points[0].longitude], 16, { animate: false });
      } else {
        map.fitBounds(
          f.points.map((p) => [p.latitude, p.longitude] as [number, number]),
          { padding: [40, 40], animate: false },
        );
      }
    },
    [map],
  );

  // 1. Re-measure when the box changes size (and do any waiting zoom).
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
      if (waiting.current) move(waiting.current);
    });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map, move]);

  // 2. Zoom when asked to.
  useEffect(() => {
    if (focus && focus.points.length > 0) move(focus);
  }, [focus?.version]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
