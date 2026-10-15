// coolSpots.ts — loads the list of cool places and sorts them by distance.
// The data lives in src/data/coolSpots.json. Community clubs, hawker centres and parks
// are real data from data.gov.sg (refresh with `npm run update:data`).
//
// Every spot has a COOLING TYPE, so users can pick what suits them:
//   ❄️ aircon — air-conditioned indoors (community clubs, libraries, malls)
//   ⛱️ shaded — roofed or sheltered (hawker centres, covered water points)
//   🌳 green  — parks with trees and shelters (natural cooling, no air-con used!)

import data from '../data/coolSpots.json';
import { LatLng, distanceM } from '../utils/geo';

export type SpotType = 'community_centre' | 'library' | 'mall' | 'hawker' | 'park' | 'water_point';

export type CoolingType = 'aircon' | 'shaded' | 'green';

export type CoolSpot = {
  id: string;
  name: string;
  type: SpotType;
  cooling: CoolingType;
  latitude: number;
  longitude: number;
  note?: string;
};

export type CoolSpotWithDistance = CoolSpot & { distance: number };

/** Every cool spot bundled with the app (works offline). */
export const COOL_SPOTS: CoolSpot[] = data.spots as CoolSpot[];

/** Icon name (from Ionicons) for each type of place. */
export const SPOT_ICON: Record<SpotType, string> = {
  community_centre: 'people',
  library: 'book',
  mall: 'storefront',
  hawker: 'restaurant',
  park: 'leaf',
  water_point: 'water',
};

/** The 3 cooling types, in the order we show them. */
export const COOLING_TYPES: CoolingType[] = ['aircon', 'shaded', 'green'];

/** Icon name (from Ionicons) for each cooling type. Colours are in theme.ts. */
export const COOLING_ICON: Record<CoolingType, string> = {
  aircon: 'snow',
  shaded: 'umbrella',
  green: 'leaf',
};

/**
 * Returns the spots sorted from nearest to furthest away.
 * Pass a cooling type to only get that kind (e.g. only green areas).
 */
export function spotsByDistance(from: LatLng, cooling?: CoolingType | null): CoolSpotWithDistance[] {
  return COOL_SPOTS.filter((s) => !cooling || s.cooling === cooling)
    .map((s) => ({ ...s, distance: distanceM(from, s) }))
    .sort((a, b) => a.distance - b.distance);
}

/** The single nearest cool spot (optionally of one cooling type). */
export function nearestSpot(from: LatLng, cooling?: CoolingType | null): CoolSpotWithDistance {
  return spotsByDistance(from, cooling)[0];
}
