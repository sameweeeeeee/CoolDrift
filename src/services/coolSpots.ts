// coolSpots.ts — loads the list of cool places and sorts them by distance.
// The data lives in src/data/coolSpots.json. Swap that file to use real data.

import data from '../data/coolSpots.json';
import { LatLng, distanceM } from '../utils/geo';

export type SpotType = 'community_centre' | 'library' | 'mall' | 'hawker' | 'park' | 'water_point';

export type CoolSpot = {
  id: string;
  name: string;
  type: SpotType;
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

/** Returns the spots sorted from nearest to furthest away. */
export function spotsByDistance(from: LatLng): CoolSpotWithDistance[] {
  return COOL_SPOTS.map((s) => ({ ...s, distance: distanceM(from, s) })).sort(
    (a, b) => a.distance - b.distance,
  );
}

/** The single nearest cool spot. */
export function nearestSpot(from: LatLng): CoolSpotWithDistance {
  return spotsByDistance(from)[0];
}
