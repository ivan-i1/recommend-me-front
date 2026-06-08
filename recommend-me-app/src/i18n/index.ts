import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import es from './es.json';

export const SUPPORTED_LANGUAGES = ['en', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Resolve the device/browser locale without a native module.
 * Hermes (native) and the browser (web) both implement Intl, and
 * `resolvedOptions().locale` reflects the device language.
 */
function resolveLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en';
  } catch {
    return 'en';
  }
}

/** Detected UI language, clamped to a supported language (fallback 'en'). */
export function detectLanguage(): SupportedLanguage {
  const lang = resolveLocale().split('-')[0].toLowerCase();
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lang)
    ? (lang as SupportedLanguage)
    : 'en';
}

/** Detected ISO region (e.g. "ES"), or '' when unavailable. Used later for streaming region. */
export function detectRegion(): string {
  const parts = resolveLocale().split('-');
  return parts[1] ? parts[1].toUpperCase() : '';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: detectLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
