// location.ts — asks for permission and reads the phone's GPS position.
// PRIVACY: the location never leaves the phone. We only use it to pick the
// nearest weather station and sort cool spots. It is NOT sent to any server
// except as start/end points when you ask for a route (see routing.ts).

import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LatLng, SINGAPORE_CENTRE } from '../utils/geo';

export type LocationResult = {
  coords: LatLng;
  status: 'granted' | 'denied' | 'error';
};

const LAST_KEY = 'cooldrift.lastLocation';

/**
 * Gets the user's location.
 * If permission is denied or GPS fails, we use the last known spot,
 * or the centre of Singapore, so the app still works.
 */
export async function getUserLocation(): Promise<LocationResult> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { coords: await lastKnownLocation(), status: 'denied' };
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    await AsyncStorage.setItem(LAST_KEY, JSON.stringify(coords)); // saved on this phone only
    return { coords, status: 'granted' };
  } catch {
    return { coords: await lastKnownLocation(), status: 'error' };
  }
}

/** The last location we saved on this phone (used by the background check too). */
export async function lastKnownLocation(): Promise<LatLng> {
  const saved = await AsyncStorage.getItem(LAST_KEY);
  return saved ? JSON.parse(saved) : SINGAPORE_CENTRE;
}
