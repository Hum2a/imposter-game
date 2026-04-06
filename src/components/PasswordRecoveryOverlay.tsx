import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  meetsSupabaseStylePasswordRules,
  WEB_PASSWORD_MIN_LENGTH,
} from '@/lib/password-policy'

type PasswordRecoveryOverlayProps = {
  open: boolean
  busy: boolean
  apiError: string | null
  onDismissApiError: () => void
  onSubmit: (newPassword: string) => void | Promise<void>
  onCancel: () => void | Promise<void>
}

export function PasswordRecoveryOverlay({
  open,
  busy,
  apiError,
  onDismissApiError,
  onSubmit,
  onCancel,
}: PasswordRecoveryOverlayProps) {
  const { t } = useTranslation()
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  if (!open) return null

  const submit = () => {
    setLocalError(null)
    if (next.length < WEB_PASSWORD_MIN_LENGTH) {
      setLocalError(
        t('profile.emailPasswordShort', { min: WEB_PASSWORD_MIN_LENGTH })
      )
      return
    }
    if (next !== confirm) {
      setLocalError(t('profile.passwordMismatch'))
      return
    }
    if (!meetsSupabaseStylePasswordRules(next)) {
      setLocalError(t('profile.passwordRulesHint'))
      return
    }
    void onSubmit(next)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-title"
    >
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle id="recovery-title">{t('profile.recoveryTitle')}</CardTitle>
          <CardDescription>{t('profile.recoveryDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {apiError ? (
            <div
              className="relative rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              <span className="pr-8">{apiError}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-7 px-2"
                onClick={onDismissApiError}
              >
                {t('lobby.dismiss')}
              </Button>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="recovery-new">{t('profile.newPasswordLabel')}</Label>
            <Input
              id="recovery-new"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recovery-confirm">{t('profile.confirmPasswordLabel')}</Label>
            <Input
              id="recovery-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
              }}
            />
          </div>
          {localError ? (
            <p className="text-sm text-destructive" role="alert">
              {localError}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={busy} onClick={() => void onCancel()}>
              {t('profile.recoveryCancel')}
            </Button>
            <Button type="button" disabled={busy} onClick={submit}>
              {t('profile.recoverySave')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
