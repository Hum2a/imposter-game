import { useTranslation } from 'react-i18next'

import { Label } from '@/components/ui/label'
import { persistLanguage } from '@/i18n/config'

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const lng = i18n.language?.startsWith('es') ? 'es' : 'en'

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="app-language" className="sr-only">
        {t('lang.label')}
      </Label>
      <select
        id="app-language"
        className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
        value={lng}
        onChange={(e) => {
          const next = e.target.value === 'es' ? 'es' : 'en'
          void i18n.changeLanguage(next)
          persistLanguage(next)
        }}
        aria-label={t('lang.label')}
      >
        <option value="en">{t('lang.en')}</option>
        <option value="es">{t('lang.es')}</option>
      </select>
    </div>
  )
}
