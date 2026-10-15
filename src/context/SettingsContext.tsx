// SettingsContext.tsx — keeps the user's settings and saves them on the phone.
// Any screen can read or change settings with:  const { settings, update } = useSettings();

import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, deviceLanguage, setLanguage, t, tList } from '../i18n';

export type Settings = {
  language: Language;
  largeText: boolean;
  seniorMode: boolean;
  highAlerts: boolean; // notify when risk becomes High
  workerMode: boolean; // rest/water reminders
  workerInterval: number; // minutes between reminders
  demoHigh: boolean; // pretend risk is High (for demos)
};

const DEFAULTS: Settings = {
  language: 'en',
  largeText: false,
  seniorMode: false,
  highAlerts: true,
  workerMode: false,
  workerInterval: 30,
  demoHigh: false,
};

const KEY = 'cooldrift.settings';

type SettingsContextValue = {
  settings: Settings;
  update: (changes: Partial<Settings>) => void;
  ready: boolean; // false until saved settings have loaded
  textScale: number; // multiply font sizes by this
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>({ ...DEFAULTS, language: deviceLanguage() });
  const [ready, setReady] = useState(false);

  // Load saved settings once when the app starts.
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((saved) => {
        if (!saved) return;
        const loaded: Partial<Settings> = JSON.parse(saved);
        if (loaded.language) setLanguage(loaded.language);
        setSettings((s) => ({ ...s, ...loaded }));
      })
      .finally(() => setReady(true));
  }, []);

  // Change some settings and save them.
  const update = (changes: Partial<Settings>) => {
    if (changes.language) setLanguage(changes.language); // tell the translation library
    setSettings((old) => {
      const next = { ...old, ...changes };
      AsyncStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  };

  const textScale = settings.largeText || settings.seniorMode ? 1.35 : 1;

  return (
    <SettingsContext.Provider value={{ settings, update, ready, textScale }}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}

/**
 * Translation hook. Using this (instead of importing t directly) makes the
 * screen redraw when the language changes.
 */
export function useT() {
  const { settings } = useSettings();
  return { t, tList, language: settings.language };
}

/** Reads saved settings without React (used by the background task). */
export async function loadSettingsDirect(): Promise<Settings> {
  const saved = await AsyncStorage.getItem(KEY);
  return { ...DEFAULTS, ...(saved ? JSON.parse(saved) : {}) };
}
