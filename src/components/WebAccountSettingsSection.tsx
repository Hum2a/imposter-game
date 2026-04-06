import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, KeyRound, Mail, Shield } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  meetsSupabaseStylePasswordRules,
  WEB_PASSWORD_MIN_LENGTH,
} from '@/lib/password-policy'

type WebAccountSettingsSectionProps = {
  accountEmail: string | null
  hasEmailPasswordProvider: boolean
  busy: boolean
  onChangePassword: (currentPassword: string, newPassword: string) => void | Promise<void>
  onRequestEmailChange: (newEmail: string) => void | Promise<void>
  onSendPasswordReset: (email: string) => void | Promise<void>
}

export function WebAccountSettingsSection({
  accountEmail,
  hasEmailPasswordProvider,
  busy,
  onChangePassword,
  onRequestEmailChange,
  onSendPasswordReset,
}: WebAccountSettingsSectionProps) {
  const { t } = useTranslation()
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const submitPassword = () => {
    setLocalError(null)
    if (newPw.length < WEB_PASSWORD_MIN_LENGTH) {
      setLocalError(
        t('profile.emailPasswordShort', { min: WEB_PASSWORD_MIN_LENGTH })
      )
      return
    }
    if (!meetsSupabaseStylePasswordRules(newPw)) {
      setLocalError(t('profile.passwordRulesHint'))
      return
    }
    if (newPw !== confirmPw) {
      setLocalError(t('profile.passwordMismatch'))
      return
    }
    void onChangePassword(currentPw, newPw)
  }

  const submitEmail = () => {
    setLocalError(null)
    const trimmed = newEmail.trim()
    if (!trimmed.includes('@')) {
      setLocalError(t('profile.emailInvalid'))
      return
    }
    if (accountEmail && trimmed.toLowerCase() === accountEmail.toLowerCase()) {
      setLocalError(t('profile.emailSameAsCurrent'))
      return
    }
    void onRequestEmailChange(trimmed)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="size-4" aria-hidden />
          {t('profile.settingsTitle')}
        </CardTitle>
        <CardDescription>{t('profile.settingsDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-border/80 bg-muted/30 px-3 py-2 text-sm">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Mail className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            {t('profile.profileSummaryTitle')}
          </div>
          {accountEmail ? (
            <p className="mt-1 break-all text-muted-foreground">{accountEmail}</p>
          ) : (
            <p className="mt-1 text-muted-foreground">{t('profile.noEmailOnAccount')}</p>
          )}
          {!hasEmailPasswordProvider ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {t('profile.passwordManagedExternally')}
            </p>
          ) : null}
        </div>

        {localError ? (
          <p className="text-sm text-destructive" role="alert">
            {localError}
          </p>
        ) : null}

        {hasEmailPasswordProvider ? (
          <details className="group rounded-md border border-border/60">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <KeyRound className="size-4 text-muted-foreground" aria-hidden />
                {t('profile.changePasswordTitle')}
              </span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-3 border-t border-border/60 px-3 py-3">
              <p className="text-xs text-muted-foreground">{t('profile.passwordRulesHint')}</p>
              <div className="space-y-2">
                <Label htmlFor="acct-current-pw">{t('profile.currentPasswordLabel')}</Label>
                <Input
                  id="acct-current-pw"
                  type="password"
                  autoComplete="current-password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acct-new-pw">{t('profile.newPasswordLabel')}</Label>
                <Input
                  id="acct-new-pw"
                  type="password"
                  autoComplete="new-password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acct-confirm-pw">{t('profile.confirmPasswordLabel')}</Label>
                <Input
                  id="acct-confirm-pw"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  disabled={busy}
                />
              </div>
              <Button type="button" size="sm" disabled={busy} onClick={submitPassword}>
                {t('profile.saveNewPassword')}
              </Button>
            </div>
          </details>
        ) : null}

        {hasEmailPasswordProvider && accountEmail ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void onSendPasswordReset(accountEmail)}
            >
              {t('profile.sendResetToEmail')}
            </Button>
          </div>
        ) : null}

        {hasEmailPasswordProvider ? (
          <details className="group rounded-md border border-border/60">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" aria-hidden />
                {t('profile.changeEmailTitle')}
              </span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-3 border-t border-border/60 px-3 py-3">
              <p className="text-xs text-muted-foreground">{t('profile.changeEmailHelp')}</p>
              <div className="space-y-2">
                <Label htmlFor="acct-new-email">{t('profile.newEmailLabel')}</Label>
                <Input
                  id="acct-new-email"
                  type="email"
                  autoComplete="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={t('profile.emailPlaceholder')}
                  disabled={busy}
                />
              </div>
              <Button type="button" size="sm" disabled={busy} onClick={submitEmail}>
                {t('profile.requestEmailChange')}
              </Button>
            </div>
          </details>
        ) : null}
      </CardContent>
    </Card>
  )
}
