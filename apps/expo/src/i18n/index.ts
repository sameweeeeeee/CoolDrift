// i18n/index.ts — sets up translations (i18n = "internationalisation").
// Use it in screens like this:   const { t } = useT();   t('home.readAloud')

import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import en, { Translations } from './en';
import zh from './zh';
import ms from './ms';
import ta from './ta';

// Lets other language files leave out keys (they fall back to English).
type DeepPartial<T> = { [K in keyof T]?: T[K] extends string[] ? string[] : T[K] extends object ? DeepPartial<T[K]> : T[K] };
export type PartialTranslations = DeepPartial<Translations>;

export type Language = 'en' | 'zh' | 'ms' | 'ta';

/** The languages shown in Settings, each written in its own script. */
export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
  { code: 'ms', label: 'Bahasa Melayu' },
  { code: 'ta', label: 'தமிழ்' },
];

/** Voice to use for text-to-speech in each language. */
export const SPEECH_LANGUAGE: Record<Language, string> = {
  en: 'en-SG',
  zh: 'zh-CN',
  ms: 'ms-MY',
  ta: 'ta-IN',
};

export const i18n = new I18n({ en, zh, ms, ta });
i18n.defaultLocale = 'en';
i18n.enableFallback = true; // missing text → English

/** Switch the language used by t() everywhere in the app. */
export function setLanguage(lang: Language) {
  i18n.locale = lang;
}

/** Picks the phone's language on first launch if we support it. */
export function deviceLanguage(): Language {
  const code = getLocales()[0]?.languageCode ?? 'en';
  return (['en', 'zh', 'ms', 'ta'] as const).find((l) => l === code) ?? 'en';
}
setLanguage(deviceLanguage()); // until saved settings load

/** Translate one key, e.g. t('risk.high') or t('routes.stops', { count: 2 }). */
export function t(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options);
}

/** Translate a key that holds a LIST of strings (like the safety tips). */
export function tList(key: string): string[] {
  const value = i18n.t(key, { returnObjects: true }) as unknown;
  return Array.isArray(value) ? value : [];
}
