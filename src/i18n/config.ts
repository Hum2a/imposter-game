import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { mergeTranslation } from './merge-translation'
import en from './locales/en.json'
import esOverrides from './locales/es.overrides.json'

const STORAGE_KEY = 'i18nextLng'

function detectLng(): string {
  if (typeof window === 'undefined') return 'en'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'es' || stored === 'en') return stored
  const nav = window.navigator.language?.slice(0, 2).toLowerCase()
  return nav === 'es' ? 'es' : 'en'
}

const es = mergeTranslation(
  en as unknown as Record<string, unknown>,
  esOverrides as unknown as Record<string, unknown>
) as typeof en

void i18n.use(initReactI18next).init({
  lng: detectLng(),
  fallbackLng: 'en',
  supportedLngs: ['en', 'es'],
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  interpolation: { escapeValue: false },
})

export function persistLanguage(lng: string): void {
  if (typeof window === 'undefined') return
  if (lng === 'en' || lng === 'es') {
    window.localStorage.setItem(STORAGE_KEY, lng)
  }
}

export default i18n
