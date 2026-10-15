// mapTypes.ts — what you can put on a CoolMap.
// The SAME props work on phones (CoolMap.tsx, Apple/Google maps)
// and on computers (CoolMap.web.tsx, OpenStreetMap via Leaflet).

import { LatLng } from '../../utils/geo';
import { colors } from '../../theme';

/** A pin on the map. `kind` decides its colour. */
export type MapPoint = LatLng & {
  id: string;
  kind: 'spot' | 'rest' | 'dest';
  title?: string;
  description?: string;
};

/** A hot spot report, drawn as a coloured circle. Level 1 = warm … 3 = very hot. */
export type HeatCircle = LatLng & { id: string; level: 1 | 2 | 3 };

/** A line, e.g. a route. */
export type MapLine = { id: string; path: LatLng[]; color: string; width: number; dashed?: boolean };

/**
 * Tell the map where to look. Change `version` each time you want it to move.
 * One point → zoom in on it. Several points → fit them all on screen.
 */
export type MapFocus = { points: LatLng[]; version: number };

export type CoolMapProps = {
  initialCenter: LatLng;
  points?: MapPoint[];
  circles?: HeatCircle[];
  lines?: MapLine[];
  focus?: MapFocus;
  userLocation?: LatLng; // drawn as a blue dot on computers (phones draw their own)
  onPress?: (where: LatLng) => void;
};

export const PIN_COLOR: Record<MapPoint['kind'], string> = {
  spot: colors.primary, // green
  rest: '#00897B', // turquoise
  dest: colors.high, // red
};

// Heat layer colours: yellow → orange → red, see-through so they blend.
export const HEAT_FILL: Record<1 | 2 | 3, string> = {
  1: 'rgba(255, 193, 7, 0.35)',
  2: 'rgba(255, 112, 0, 0.40)',
  3: 'rgba(211, 47, 47, 0.45)',
};
export const HEAT_HEX: Record<1 | 2 | 3, string> = { 1: '#FFC107', 2: '#FF7000', 3: '#D32F2F' };
