import { useTranslation } from 'react-i18next'
import { Volume2, VolumeX } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { useSfx } from './use-sfx'

export function SfxToggle() {
  const { t } = useTranslation()
  const { sfxEnabled, setSfxEnabled, reducedMotion } = useSfx()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-9 gap-2 text-muted-foreground hover:text-foreground"
      aria-pressed={sfxEnabled}
      aria-label={sfxEnabled ? t('sfx.soundOn') : t('sfx.soundOff')}
      title={
        reducedMotion
          ? t('sfx.titleReducedMotion')
          : sfxEnabled
            ? t('sfx.titleTurnOff')
            : t('sfx.titleTurnOn')
      }
      onClick={() => setSfxEnabled(!sfxEnabled)}
    >
      {sfxEnabled ? (
        <Volume2 className="size-4 shrink-0" aria-hidden />
      ) : (
        <VolumeX className="size-4 shrink-0" aria-hidden />
      )}
      <span className="text-xs font-medium">{t('sfx.soundLabel')}</span>
      <span className="sr-only">{sfxEnabled ? t('sfx.on') : t('sfx.off')}</span>
    </Button>
  )
}
