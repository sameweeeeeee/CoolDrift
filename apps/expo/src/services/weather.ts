// weather.ts — gets live weather from data.gov.sg and works out the heat risk.
//
// We use three FREE government APIs (no API key needed):
//   1. Air temperature   https://api-open.data.gov.sg/v2/real-time/api/air-temperature
//   2. Relative humidity https://api-open.data.gov.sg/v2/real-time/api/relative-humidity
//   3. WBGT heat stress  https://api-open.data.gov.sg/v2/real-time/api/weather?api=wbgt
//
// WBGT ("Wet Bulb Globe Temperature") is what NEA uses for heat-stress advisories.
// It combines temperature, humidity, sunshine and wind. NEA's levels are:
//   Low: below 31°C · Moderate: 31 to below 33°C · High: 33°C and above
//
// If WBGT is missing, we fall back to a "heat index" (feels-like temperature)
// worked out from temperature + humidity.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LatLng, distanceM } from '../utils/geo';

export type RiskLevel = 'low' | 'moderate' | 'high';

export type HeatReading = {
  risk: RiskLevel;
  source: 'wbgt' | 'heatIndex'; // which measurement decided the risk
  temperature?: number; // °C
  humidity?: number; // %
  wbgt?: number; // °C
  heatIndex?: number; // °C, "feels like"
  stationName?: string; // nearest weather station
  observedAt: string; // time of the reading (from the API)
  fromCache: boolean; // true = we're offline and showing saved data
};

const BASE = 'https://api-open.data.gov.sg/v2/real-time/api';
const URLS = {
  temperature: `${BASE}/air-temperature`,
  humidity: `${BASE}/relative-humidity`,
  wbgt: `${BASE}/weather?api=wbgt`,
};
const CACHE_KEY = 'cooldrift.weatherCache';

// ---------- Types that match the real API responses ----------

// Air temperature and humidity share this shape.
type StationApi = {
  code: number;
  data: {
    stations: { id: string; name: string; location: { latitude: number; longitude: number } }[];
    readings: { timestamp: string; data: { stationId: string; value: number }[] }[];
  };
};

// WBGT has a different shape. Note: numbers come back as STRINGS here.
type WbgtApi = {
  code: number;
  data: {
    records: {
      datetime: string;
      item: {
        readings: {
          station: { id: string; name: string; townCenter?: string };
          location: { latitude: string; longitude: string };
          wbgt: string;
          heatStress: string; // "Low" | "Moderate" | "High"
        }[];
      };
    }[];
  };
};

type RawWeather = { temperature?: StationApi; humidity?: StationApi; wbgt?: WbgtApi; savedAt: number };

// ---------- Downloading ----------

/** fetch() with a 10-second timeout, so a bad connection doesn't hang the app. */
async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.code !== 0) throw new Error(json.errorMsg ?? 'API error');
    return json as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Downloads all three datasets. Any one of them may fail — that's OK. */
async function downloadAll(): Promise<RawWeather> {
  const [t, h, w] = await Promise.allSettled([
    fetchJson<StationApi>(URLS.temperature),
    fetchJson<StationApi>(URLS.humidity),
    fetchJson<WbgtApi>(URLS.wbgt),
  ]);
  const raw: RawWeather = {
    temperature: t.status === 'fulfilled' ? t.value : undefined,
    humidity: h.status === 'fulfilled' ? h.value : undefined,
    wbgt: w.status === 'fulfilled' ? w.value : undefined,
    savedAt: Date.now(),
  };
  if (!raw.temperature && !raw.humidity && !raw.wbgt) throw new Error('No weather data');
  return raw;
}

// ---------- Picking the nearest station ----------

/** Finds the reading from the station closest to the user. */
function nearestStationValue(api: StationApi | undefined, here: LatLng) {
  const latest = api?.data.readings[0];
  if (!api || !latest) return undefined;
  let best: { value: number; name: string; time: string; dist: number } | undefined;
  for (const r of latest.data) {
    const station = api.data.stations.find((s) => s.id === r.stationId);
    if (!station) continue;
    const dist = distanceM(here, station.location);
    if (!best || dist < best.dist) best = { value: r.value, name: station.name, time: latest.timestamp, dist };
  }
  return best;
}

function nearestWbgt(api: WbgtApi | undefined, here: LatLng) {
  const record = api?.data.records[0];
  if (!record) return undefined;
  let best: { wbgt: number; level: string; name: string; time: string; dist: number } | undefined;
  for (const r of record.item.readings) {
    const loc = { latitude: parseFloat(r.location.latitude), longitude: parseFloat(r.location.longitude) };
    const dist = distanceM(here, loc);
    if (!best || dist < best.dist) {
      best = {
        wbgt: parseFloat(r.wbgt),
        level: r.heatStress,
        name: r.station.townCenter ?? r.station.name,
        time: record.datetime,
        dist,
      };
    }
  }
  return best;
}

// ---------- Turning numbers into a risk level ----------

/** NEA WBGT levels → our risk level. */
export function riskFromWbgt(wbgt: number): RiskLevel {
  if (wbgt >= 33) return 'high';
  if (wbgt >= 31) return 'moderate';
  return 'low';
}

/**
 * Heat index ("feels like" temperature) in °C, from the US weather service
 * formula. It's only used when WBGT is not available.
 */
export function heatIndexC(tempC: number, humidity: number): number {
  const T = (tempC * 9) / 5 + 32; // the formula works in °F
  const R = humidity;
  let hi = 0.5 * (T + 61 + (T - 68) * 1.2 + R * 0.094); // simple version
  if ((hi + T) / 2 >= 80) {
    // full version for hot weather
    hi =
      -42.379 + 2.04901523 * T + 10.14333127 * R - 0.22475541 * T * R - 0.00683783 * T * T -
      0.05481717 * R * R + 0.00122874 * T * T * R + 0.00085282 * T * R * R - 0.00000199 * T * T * R * R;
  }
  return ((hi - 32) * 5) / 9;
}

/** Heat index → risk level. (41°C+ is the US "Danger" level.) */
export function riskFromHeatIndex(hiC: number): RiskLevel {
  if (hiC >= 41) return 'high';
  if (hiC >= 33) return 'moderate';
  return 'low';
}

/** Combines the raw API data into one simple HeatReading for this location. */
function buildReading(raw: RawWeather, here: LatLng, fromCache: boolean): HeatReading {
  const t = nearestStationValue(raw.temperature, here);
  const h = nearestStationValue(raw.humidity, here);
  const w = nearestWbgt(raw.wbgt, here);
  const hi = t && h ? heatIndexC(t.value, h.value) : undefined;

  const base = {
    temperature: t?.value,
    humidity: h?.value,
    heatIndex: hi !== undefined ? Math.round(hi * 10) / 10 : undefined,
    fromCache,
  };

  // Prefer the official WBGT measurement.
  if (w && !isNaN(w.wbgt)) {
    return { ...base, risk: riskFromWbgt(w.wbgt), source: 'wbgt', wbgt: w.wbgt, stationName: w.name, observedAt: w.time };
  }
  if (hi !== undefined && t) {
    return { ...base, risk: riskFromHeatIndex(hi), source: 'heatIndex', stationName: t.name, observedAt: t.time };
  }
  // Only temperature: treat 35°C+ as high, 32°C+ as moderate.
  const temp = t?.value ?? 30;
  return {
    ...base,
    risk: temp >= 35 ? 'high' : temp >= 32 ? 'moderate' : 'low',
    source: 'heatIndex',
    stationName: t?.name,
    observedAt: t?.time ?? new Date(raw.savedAt).toISOString(),
  };
}

// ---------- The function the rest of the app calls ----------

/**
 * Gets the current heat risk for a location.
 * 1. Try the internet → save a copy (cache) for later.
 * 2. If offline or the API fails → use the saved copy.
 * 3. If there's no saved copy either → throw an error (the screen shows a message).
 */
export async function getHeatReading(here: LatLng): Promise<HeatReading> {
  try {
    const raw = await downloadAll();
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(raw));
    return buildReading(raw, here, false);
  } catch (err) {
    const saved = await AsyncStorage.getItem(CACHE_KEY);
    if (saved) return buildReading(JSON.parse(saved), here, true);
    throw err;
  }
}
