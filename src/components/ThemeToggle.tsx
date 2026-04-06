import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Label } from '@/components/ui/label'
import { getUiTheme, setUiTheme, type UiThemeId } from '@/lib/theme'

const THEME_IDS: readonly UiThemeId[] = [
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

function isUiThemeId(v: string): v is UiThemeId {
  return (THEME_IDS as readonly string[]).includes(v)
}

export function ThemeToggle() {
  const { t } = useTranslation()
  const [theme, setTheme] = useState<UiThemeId>(() => getUiTheme())

  return (
    <div className="flex min-w-0 max-w-full items-center gap-2">
      <Label htmlFor="app-ui-theme" className="sr-only">
        {t('theme.label')}
      </Label>
      <select
        id="app-ui-theme"
        className="h-9 min-w-0 max-w-[10.5rem] shrink rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:max-w-[14rem] dark:bg-input/30"
        value={theme}
        onChange={(e) => {
          const v = e.target.value
          if (!isUiThemeId(v)) return
          setUiTheme(v)
          setTheme(v)
        }}
        aria-label={t('theme.label')}
      >
        <optgroup label={t('theme.groupClassic')}>
          <option value="system">{t('theme.system')}</option>
          <option value="light">{t('theme.light')}</option>
          <option value="dark">{t('theme.dark')}</option>
        </optgroup>
        <optgroup label={t('theme.groupDarkStyles')}>
          <option value="among-us">{t('theme.amongUs')}</option>
          <option value="midnight">{t('theme.midnight')}</option>
          <option value="brand">{t('theme.brand')}</option>
        </optgroup>
        <optgroup label={t('theme.groupLightStyles')}>
          <option value="dawn">{t('theme.dawn')}</option>
          <option value="sand">{t('theme.sand')}</option>
          <option value="lavender">{t('theme.lavender')}</option>
          <option value="ocean">{t('theme.ocean')}</option>
        </optgroup>
      </select>
    </div>
  )
}
