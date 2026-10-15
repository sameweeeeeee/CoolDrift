// geo.ts — small maths helpers for working with map coordinates.

export type LatLng = { latitude: number; longitude: number };

const EARTH_RADIUS_M = 6371000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Distance between two points in METRES, using the "haversine" formula.
 * (It works out the distance along the curved surface of the Earth.)
 */
export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Turns 850 into "850 m" and 2300 into "2.3 km". */
export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}

/** Turns seconds into "12 min" or "1 h 5 min". */
export function formatDuration(seconds: number): string {
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min`;
}

/**
 * How far point P is from the straight line A→B (in metres), and where along
 * the line it sits (t = 0 at A, t = 1 at B).
 * Singapore is small, so we can treat the map as flat here — it's accurate enough.
 */
export function offsetFromLine(p: LatLng, a: LatLng, b: LatLng): { offsetM: number; t: number } {
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos(toRad(a.latitude));
  // Convert to flat x/y in metres, with A at (0,0)
  const bx = (b.longitude - a.longitude) * mPerDegLng;
  const by = (b.latitude - a.latitude) * mPerDegLat;
  const px = (p.longitude - a.longitude) * mPerDegLng;
  const py = (p.latitude - a.latitude) * mPerDegLat;
  const lenSq = bx * bx + by * by || 1;
  const t = (px * bx + py * by) / lenSq;
  const clamped = Math.max(0, Math.min(1, t));
  const dx = px - clamped * bx;
  const dy = py - clamped * by;
  return { offsetM: Math.sqrt(dx * dx + dy * dy), t };
}

/** Shortest distance from a point to any point on a path (approximate, checks every vertex). */
export function distanceToPathM(p: LatLng, path: LatLng[]): number {
  let best = Infinity;
  for (const q of path) best = Math.min(best, distanceM(p, q));
  return best;
}

/** Centre of Singapore — used when we don't know where the user is. */
export const SINGAPORE_CENTRE: LatLng = { latitude: 1.3521, longitude: 103.8198 };
