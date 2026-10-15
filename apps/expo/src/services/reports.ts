// reports.ts — the crowdsourced "hot spot" reports.
// Right now every report is saved ON THIS PHONE ONLY (AsyncStorage).
// To share reports between everyone's phones, fill in syncReportToBackend()
// and fetchSharedReports() below with a real database (e.g. Firebase).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LatLng } from '../utils/geo';

/** 1 = warm, 2 = hot, 3 = very hot */
export type HotLevel = 1 | 2 | 3;

export type HotSpotReport = LatLng & {
  id: string;
  level: HotLevel;
  createdAt: number; // time in milliseconds
};

const KEY = 'cooldrift.hotReports';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // reports older than 24 hours are hidden (heat changes daily)

/** Loads saved reports from the last 24 hours. */
export async function loadReports(): Promise<HotSpotReport[]> {
  const saved = await AsyncStorage.getItem(KEY);
  const all: HotSpotReport[] = saved ? JSON.parse(saved) : [];
  const fresh = all.filter((r) => Date.now() - r.createdAt < MAX_AGE_MS);
  const shared = await fetchSharedReports();
  return [...fresh, ...shared];
}

/** Saves a new report and returns the updated list. */
export async function addReport(where: LatLng, level: HotLevel): Promise<HotSpotReport[]> {
  const report: HotSpotReport = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    latitude: where.latitude,
    longitude: where.longitude,
    level,
    createdAt: Date.now(),
  };
  const saved = await AsyncStorage.getItem(KEY);
  const all: HotSpotReport[] = saved ? JSON.parse(saved) : [];
  const updated = [...all.filter((r) => Date.now() - r.createdAt < MAX_AGE_MS), report];
  await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  await syncReportToBackend(report);
  return updated;
}

/** Deletes all reports saved on this phone. */
export async function clearReports(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

// ======================================================================
// 🔌 BACKEND HOOK: add a shared database here later (e.g. Firebase).
// Right now these functions do nothing, so the app works fully offline
// and no data leaves the phone.
// Only send the report's location and heat level. Never send who sent it.
// ======================================================================
async function syncReportToBackend(_report: HotSpotReport): Promise<void> {
  // Example with Firebase Firestore (needs a Firebase project, so ask first):
  //   await addDoc(collection(db, 'hotReports'), _report);
}

async function fetchSharedReports(): Promise<HotSpotReport[]> {
  // Example: return (await getDocs(collection(db, 'hotReports'))).docs.map(d => d.data());
  return [];
}
