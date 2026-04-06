export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'imposter-theme-preference'

function readPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* ignore */
  }
  return 'system'
}

function isDarkForPreference(p: ThemePreference): boolean {
  if (p === 'dark') return true
  if (p === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** Apply `dark` class on `<html>` from stored preference (or system). */
export function applyThemePreference(p: ThemePreference = readPreference()): void {
  document.documentElement.classList.toggle('dark', isDarkForPreference(p))
}

export function getThemePreference(): ThemePreference {
  return readPreference()
}

export function setThemePreference(p: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, p)
  } catch {
    /* ignore */
  }
  applyThemePreference(p)
}

/** Call once at startup: apply saved preference and listen for system changes when in "system" mode. */
export function initTheme(): void {
  applyThemePreference()
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (readPreference() === 'system') applyThemePreference('system')
  })
}
