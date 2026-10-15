// routing.ts — plans a "cool route" from A to B.
//
// HOW IT WORKS (the trade-off we chose):
// We don't have a map of every shady walkway in Singapore, so we can't do true
// "shade-aware" routing. Instead we use a simple, explainable trick:
//   1. Ask a FREE routing server (OSRM, run by the OpenStreetMap community at
//      routing.openstreetmap.de, no API key) for the normal fastest route.
//   2. Find cool spots that lie close to the straight line from A to B.
//   3. Ask OSRM again for a route that goes THROUGH those cool spots.
//      These become rest stops where you can cool down.
//   4. If the cool route is much longer (over 50% extra), we drop to fewer stops.
// Good: real walking/cycling paths, free, easy to explain.
// Not so good: it only knows about the spots in our list, not every tree or
// covered walkway. A real version could add NParks/LTA shelter data.
//
// If there is no internet, we draw straight lines between the points
// and estimate the time (marked "approximate").

import { COOL_SPOTS, CoolSpot } from './coolSpots';
import { LatLng, distanceM, distanceToPathM, offsetFromLine } from '../utils/geo';

export type TravelMode = 'foot' | 'bike';

export type Route = {
  path: LatLng[]; // the line to draw on the map
  distance: number; // metres
  duration: number; // seconds
};

export type CoolRoutePlan = {
  fastest: Route;
  cool: Route;
  restStops: CoolSpot[]; // places to rest along the cool route
  coolScore: number; // % of the cool route that is within 300 m of a cool spot
  approximate: boolean; // true = offline straight-line estimate
};

// Average speeds for the offline estimate (metres per second).
const SPEED = { foot: 1.3, bike: 4.2 };
const NEAR_ROUTE_M = 300; // "near a cool spot" means within 300 m

/** Asks OSRM for a route through the given points (in order). */
async function osrmRoute(points: LatLng[], mode: TravelMode): Promise<Route> {
  const profile = mode === 'foot' ? 'routed-foot' : 'routed-bike';
  // OSRM wants "longitude,latitude" pairs separated by ";"
  const coords = points.map((p) => `${p.longitude.toFixed(6)},${p.latitude.toFixed(6)}`).join(';');
  const url = `https://routing.openstreetmap.de/${profile}/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const json = await res.json();
    if (json.code !== 'Ok' || !json.routes?.length) throw new Error('No route found');
    const r = json.routes[0];
    return {
      path: r.geometry.coordinates.map(([lng, lat]: [number, number]) => ({ latitude: lat, longitude: lng })),
      distance: r.distance,
      duration: r.duration,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Offline backup: straight lines between the points. */
function straightLineRoute(points: LatLng[], mode: TravelMode): Route {
  let distance = 0;
  for (let i = 1; i < points.length; i++) distance += distanceM(points[i - 1], points[i]);
  distance *= 1.3; // real streets are ~30% longer than a straight line
  return { path: points, distance, duration: distance / SPEED[mode] };
}

/**
 * Picks cool spots to stop at between A and B.
 * Longer trips get more stops (one roughly every 1.5 km, max 3).
 */
function chooseStops(from: LatLng, to: LatLng): CoolSpot[] {
  const straight = distanceM(from, to);
  const corridor = Math.max(400, straight * 0.2); // how far off the line we'll look
  const numStops = Math.min(3, Math.max(1, Math.round(straight / 1500)));

  // Spots that sit between A and B, near the line
  const candidates = COOL_SPOTS.map((s) => ({ spot: s, ...offsetFromLine(s, from, to) })).filter(
    (c) => c.t > 0.1 && c.t < 0.9 && c.offsetM <= corridor,
  );

  // Split the trip into equal parts and pick the spot closest to the line in each part
  const stops: CoolSpot[] = [];
  for (let i = 0; i < numStops; i++) {
    const start = i / numStops;
    const end = (i + 1) / numStops;
    const inPart = candidates.filter((c) => c.t >= start && c.t < end).sort((a, b) => a.offsetM - b.offsetM);
    if (inPart[0]) stops.push(inPart[0].spot);
  }
  return stops;
}

/** What % of the path is within 300 m of a cool spot. */
function coolScore(path: LatLng[]): number {
  if (path.length === 0) return 0;
  const near = path.filter((p) => COOL_SPOTS.some((s) => distanceM(p, s) <= NEAR_ROUTE_M)).length;
  return Math.round((near / path.length) * 100);
}

/** The main function: plans both the fastest route and the cool route. */
export async function planCoolRoute(from: LatLng, to: LatLng, mode: TravelMode): Promise<CoolRoutePlan> {
  let stops = chooseStops(from, to);

  try {
    const fastest = await osrmRoute([from, to], mode);
    let cool = fastest;

    // Try with all stops, then with fewer, until the detour is acceptable (≤ 50% longer).
    while (stops.length > 0) {
      const attempt = await osrmRoute([from, ...stops, to], mode);
      if (attempt.distance <= fastest.distance * 1.5) {
        cool = attempt;
        break;
      }
      stops = stops.slice(0, -1);
    }

    // Also count any other cool spots the route passes close to as rest stops
    // (but not ones right at the start or the destination — you're already there!).
    // Only the 4 closest, so the list stays short and useful.
    const passing = COOL_SPOTS.filter((s) => !stops.includes(s) && distanceM(s, from) > 200 && distanceM(s, to) > 200)
      .map((s) => ({ spot: s, away: distanceToPathM(s, cool.path) }))
      .filter((p) => p.away <= 150)
      .sort((a, b) => a.away - b.away)
      .slice(0, 4)
      .map((p) => p.spot);
    return {
      fastest,
      cool,
      restStops: [...stops, ...passing],
      coolScore: coolScore(cool.path),
      approximate: false,
    };
  } catch {
    // Offline or routing server problem → straight-line estimate.
    const fastest = straightLineRoute([from, to], mode);
    const cool = straightLineRoute([from, ...stops, to], mode);
    return { fastest, cool, restStops: stops, coolScore: coolScore(cool.path), approximate: true };
  }
}
