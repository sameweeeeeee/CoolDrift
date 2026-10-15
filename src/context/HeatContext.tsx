// HeatContext.tsx — the "brain" that every screen shares.
// It knows: where the user is, the latest weather, and the heat risk.
// It refreshes every 15 minutes while the app is open, and when you come back to the app.
// Screens use it with:  const { risk, reading, location, refresh } = useHeat();

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { HeatReading, RiskLevel, getHeatReading } from '../services/weather';
import { getUserLocation } from '../services/location';
import { alertIfRiskBecameHigh, startWorkerReminders, stopWorkerReminders } from '../services/notifications';
import { LatLng, SINGAPORE_CENTRE } from '../utils/geo';
import { useSettings } from './SettingsContext';

const REFRESH_EVERY_MS = 15 * 60 * 1000; // 15 minutes

type HeatContextValue = {
  location: LatLng;
  locationStatus: 'granted' | 'denied' | 'error' | 'unknown';
  reading: HeatReading | null;
  risk: RiskLevel | null; // the risk to SHOW (includes demo mode)
  loading: boolean;
  error: boolean; // true = no live data AND no saved data
  refresh: () => Promise<void>;
};

const HeatContext = createContext<HeatContextValue | null>(null);

export function HeatProvider({ children }: { children: React.ReactNode }) {
  const { settings, ready } = useSettings();
  const [location, setLocation] = useState<LatLng>(SINGAPORE_CENTRE);
  const [locationStatus, setLocationStatus] = useState<HeatContextValue['locationStatus']>('unknown');
  const [reading, setReading] = useState<HeatReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Demo mode pretends the risk is High so you can show alerts to judges.
  const risk: RiskLevel | null = settings.demoHigh ? 'high' : (reading?.risk ?? null);

  // Keep the latest settings in a "ref" so refresh() always sees them.
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  /** Get location → get weather → work out risk → alert if needed. */
  const refresh = useCallback(async () => {
    setLoading(true);
    const loc = await getUserLocation();
    setLocation(loc.coords);
    setLocationStatus(loc.status);
    try {
      const r = await getHeatReading(loc.coords);
      setReading(r);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Start checking once settings are loaded, then every 15 minutes,
  // and again whenever the user comes back to the app.
  useEffect(() => {
    if (!ready) return;
    // Fetching data from outside the app is exactly what effects are for.
    refresh(); // eslint-disable-line react-hooks/set-state-in-effect
    const timer = setInterval(refresh, REFRESH_EVERY_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [ready, refresh]);

  // When the risk changes, check if we need to send a High heat alert.
  useEffect(() => {
    if (risk) alertIfRiskBecameHigh(risk, settingsRef.current.highAlerts);
  }, [risk]);

  // Outdoor worker mode: rest reminders only when risk is Moderate or High.
  const remind = settings.workerMode && (risk === 'moderate' || risk === 'high');
  useEffect(() => {
    if (!ready) return;
    if (remind) startWorkerReminders(settings.workerInterval);
    else stopWorkerReminders();
  }, [ready, remind, settings.workerInterval, settings.language]);

  return (
    <HeatContext.Provider value={{ location, locationStatus, reading, risk, loading, error, refresh }}>
      {children}
    </HeatContext.Provider>
  );
}

export function useHeat() {
  const ctx = useContext(HeatContext);
  if (!ctx) throw new Error('useHeat must be used inside HeatProvider');
  return ctx;
}
