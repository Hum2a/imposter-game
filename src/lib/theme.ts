export type UiThemeId =
  | 'system'
  | 'light'
  | 'dark'
  | 'among-us'
  | 'midnight'
  | 'brand'
  | 'dawn'
  | 'sand'
  | 'lavender'
  | 'ocean'

const STORAGE_KEY = 'imposter-ui-theme'
const LEGACY_STORAGE_KEY = 'imposter-theme-preference'

const ALL_IDS: readonly UiThemeId[] = [
  'system',
  'light',
  'dark',
  'among-us',
  'midnight',
  'brand',
  'dawn',
  'sand',
  'lavender',
  'ocean',
] as const

function isUiThemeId(v: string | null): v is UiThemeId {
  return v !== null && (ALL_IDS as readonly string[]).includes(v)
}

function readUiTheme(): UiThemeId {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (isUiThemeId(v)) return v
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy === 'light' || legacy === 'dark' || legacy === 'system') return legacy
  } catch {
    /* ignore */
  }
  return 'system'
}

function usesDefaultTokens(id: UiThemeId): boolean {
  return id === 'system' || id === 'light' || id === 'dark'
}

function isEffectiveDark(id: UiThemeId): boolean {
  if (id === 'light' || id === 'dawn' || id === 'sand' || id === 'lavender' || id === 'ocean') {
    return false
  }
  if (id === 'dark' || id === 'among-us' || id === 'midnight' || id === 'brand') {
    return true
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** Apply `data-ui-theme`, `dark` class, and default-token reset for classic modes. */
export function applyUiTheme(id: UiThemeId = readUiTheme()): void {
  const html = document.documentElement
  if (usesDefaultTokens(id)) {
    html.removeAttribute('data-ui-theme')
  } else {
    html.setAttribute('data-ui-theme', id)
  }
  html.classList.toggle('dark', isEffectiveDark(id))
}

export function getUiTheme(): UiThemeId {
  return readUiTheme()
}

export function setUiTheme(id: UiThemeId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    /* ignore */
  }
  applyUiTheme(id)
}

/** Call once at startup: apply saved theme and listen for system changes in "system" classic mode. */
export function initTheme(): void {
  applyUiTheme()
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (readUiTheme() === 'system') applyUiTheme('system')
  })
}
