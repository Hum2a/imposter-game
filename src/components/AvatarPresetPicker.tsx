import { useTranslation } from 'react-i18next'

import { AVATAR_PRESETS } from '@/data/avatar-presets'
import { cn } from '@/lib/utils'

type AvatarPresetPickerProps = {
  value: string | null
  onChange: (presetId: string) => void
  disabled?: boolean
  className?: string
}

export function AvatarPresetPicker({
  value,
  onChange,
  disabled,
  className,
}: AvatarPresetPickerProps) {
  const { t } = useTranslation()

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t('profile.avatarPresetLabel')}
      </p>
      <div
        className="grid w-full gap-2 [grid-template-columns:repeat(auto-fill,minmax(3rem,1fr))] sm:[grid-template-columns:repeat(auto-fill,minmax(3.25rem,1fr))]"
        role="listbox"
        aria-label={t('profile.avatarPresetLabel')}
      >
        {AVATAR_PRESETS.map((p) => {
          const selected = value === p.id
          return (
            <button
              key={p.id}
              type="button"
              disabled={disabled}
              role="option"
              aria-selected={selected}
              onClick={() => onChange(p.id)}
              className={cn(
                'flex aspect-square w-full min-w-0 items-center justify-center rounded-lg border-2 text-xl leading-none transition-[border-color,box-shadow,opacity]',
                'hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selected
                  ? 'border-primary bg-primary/10 shadow-sm'
                  : 'border-transparent bg-muted/50',
                disabled && 'pointer-events-none opacity-50'
              )}
              title={p.id}
            >
              <span aria-hidden>{p.emoji}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
