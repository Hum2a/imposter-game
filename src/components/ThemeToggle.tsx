import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Monitor, Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { getThemePreference, setThemePreference, type ThemePreference } from '@/lib/theme'

export function ThemeToggle() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<ThemePreference>(() => getThemePreference())

  const cycle = useCallback(() => {
    const order: ThemePreference[] = ['system', 'light', 'dark']
    const i = order.indexOf(mode)
    const next = order[(i + 1) % order.length]!
    setThemePreference(next)
    setMode(next)
  }, [mode])

  const Icon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor
  const label =
    mode === 'light'
      ? t('theme.light')
      : mode === 'dark'
        ? t('theme.dark')
        : t('theme.system')

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-9 gap-1.5 px-2.5"
      onClick={cycle}
      aria-label={t('theme.cycleAria', { current: label })}
      title={t('theme.cycleTitle', { current: label })}
    >
      <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
      <span className="hidden text-xs font-medium sm:inline">{label}</span>
    </Button>
  )
}
