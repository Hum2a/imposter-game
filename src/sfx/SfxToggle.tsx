import { Volume2, VolumeX } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { useSfx } from './use-sfx'

export function SfxToggle() {
  const { sfxEnabled, setSfxEnabled, reducedMotion } = useSfx()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-9 gap-2 text-muted-foreground hover:text-foreground"
      aria-pressed={sfxEnabled}
      aria-label={sfxEnabled ? 'Sound effects on' : 'Sound effects off'}
      title={
        reducedMotion
          ? 'Sounds are muted while “reduce motion” is on in your system settings'
          : sfxEnabled
            ? 'Turn sound effects off'
            : 'Turn sound effects on (off by default)'
      }
      onClick={() => setSfxEnabled(!sfxEnabled)}
    >
      {sfxEnabled ? (
        <Volume2 className="size-4 shrink-0" aria-hidden />
      ) : (
        <VolumeX className="size-4 shrink-0" aria-hidden />
      )}
      <span className="text-xs font-medium">Sound</span>
      <span className="sr-only">{sfxEnabled ? 'on' : 'off'}</span>
    </Button>
  )
}
