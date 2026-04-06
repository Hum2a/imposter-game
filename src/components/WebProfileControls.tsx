import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LogIn, LogOut, User, Users } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { fetchPlayerStats, type PlayerStatsSnapshot } from '@/lib/player-stats'
import { fetchRecentPlayerRounds, type PlayerRoundRow } from '@/lib/record-player-round'
import type { WebIdentityMode } from '@/lib/web-session'

const MIN_PASSWORD_LEN = 6

type WebProfileControlsProps = {
  displayName: string
  onSave: (name: string) => void
  identityMode: WebIdentityMode
  supabaseConfigured: boolean
  busy: boolean
  profileError: string | null
  profileInfoKey: string | null
  onDismissProfileError: () => void
  onDismissProfileInfo: () => void
  onEnableCloud: () => void
  onDisableCloud: () => void
  onSignInDiscord: () => void
  onSignUpEmail: (email: string, password: string) => void | Promise<void>
  onSignInEmail: (email: string, password: string) => void | Promise<void>
  onResetEmailPassword: (email: string) => void | Promise<void>
}

function identityLabelKey(mode: WebIdentityMode): string {
  switch (mode) {
    case 'guest':
      return 'profile.guest'
    case 'cloud_anonymous':
      return 'profile.onlineBackup'
    case 'cloud_discord':
      return 'profile.discordAccount'
    case 'cloud_email':
      return 'profile.emailAccount'
    case 'cloud_other':
      return 'profile.signedIn'
    default:
      return 'profile.player'
  }
}

export function WebProfileControls({
  displayName,
  onSave,
  identityMode,
  supabaseConfigured,
  busy,
  profileError,
  profileInfoKey,
  onDismissProfileError,
  onDismissProfileInfo,
  onEnableCloud,
  onDisableCloud,
  onSignInDiscord,
  onSignUpEmail,
  onSignInEmail,
  onResetEmailPassword,
}: WebProfileControlsProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(displayName)
  const [roundHistory, setRoundHistory] = useState<PlayerRoundRow[] | null>(null)
  const [playerStats, setPlayerStats] = useState<PlayerStatsSnapshot | null>(null)
  const [emailMode, setEmailMode] = useState<'signIn' | 'signUp'>('signIn')
  const [emailDraft, setEmailDraft] = useState('')
  const [passwordDraft, setPasswordDraft] = useState('')
  const [emailFormError, setEmailFormError] = useState<string | null>(null)

  useEffect(() => {
    setDraft(displayName)
  }, [displayName])

  const isGuest = identityMode === 'guest'

  useEffect(() => {
    if (isGuest || !supabaseConfigured) {
      setRoundHistory(null)
      return
    }
    let cancelled = false
    void fetchRecentPlayerRounds(12).then((rows) => {
      if (!cancelled) setRoundHistory(rows)
    })
    return () => {
      cancelled = true
    }
  }, [isGuest, supabaseConfigured, identityMode])

  useEffect(() => {
    if (isGuest || !supabaseConfigured) {
      setPlayerStats(null)
      return
    }
    let cancelled = false
    void fetchPlayerStats().then((s) => {
      if (!cancelled) setPlayerStats(s)
    })
    return () => {
      cancelled = true
    }
  }, [isGuest, supabaseConfigured, identityMode])

  const submitEmailAuth = () => {
    setEmailFormError(null)
    const email = emailDraft.trim()
    if (!email.includes('@')) {
      setEmailFormError(t('profile.emailInvalid'))
      return
    }
    if (passwordDraft.length < MIN_PASSWORD_LEN) {
      setEmailFormError(t('profile.emailPasswordShort', { min: MIN_PASSWORD_LEN }))
      return
    }
    if (emailMode === 'signIn') {
      void onSignInEmail(email, passwordDraft)
    } else {
      void onSignUpEmail(email, passwordDraft)
    }
  }

  const submitPasswordReset = () => {
    setEmailFormError(null)
    const email = emailDraft.trim()
    if (!email.includes('@')) {
      setEmailFormError(t('profile.emailInvalid'))
      return
    }
    void onResetEmailPassword(email)
  }

  return (
    <header className="border-b bg-card/90 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-4">
        {profileInfoKey ? (
          <Alert className="relative border-emerald-600/35 bg-emerald-500/10 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-950/25 dark:text-emerald-50">
            <AlertTitle>{t('profile.title')}</AlertTitle>
            <AlertDescription className="pr-8">{t(profileInfoKey)}</AlertDescription>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2 h-7 px-2"
              onClick={onDismissProfileInfo}
            >
              {t('lobby.dismiss')}
            </Button>
          </Alert>
        ) : null}
        {profileError ? (
          <Alert variant="destructive" className="relative">
            <AlertTitle>{t('profile.title')}</AlertTitle>
            <AlertDescription className="pr-8">{profileError}</AlertDescription>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2 h-7 px-2"
              onClick={onDismissProfileError}
            >
              {t('lobby.dismiss')}
            </Button>
          </Alert>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">{t('profile.webPlay')}</span>
          <Separator orientation="vertical" className="hidden h-4 sm:block" />
          <Badge variant={isGuest ? 'outline' : 'secondary'} className="gap-1 font-normal">
            <User className="size-3" aria-hidden />
            {t(identityLabelKey(identityMode))}
          </Badge>
          {!supabaseConfigured ? (
            <span className="text-xs text-muted-foreground">{t('profile.supabaseHint')}</span>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="web-display-name">{t('profile.displayName')}</Label>
            <Input
              id="web-display-name"
              type="text"
              value={draft}
              maxLength={40}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('profile.namePlaceholder')}
              aria-label={t('profile.displayName')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSave(draft)
              }}
            />
            <p className="text-xs text-muted-foreground">
              {isGuest ? t('profile.guestHint') : t('profile.cloudHint')}
            </p>
          </div>
          <Button
            type="button"
            className="shrink-0 sm:min-w-[5rem]"
            disabled={busy}
            onClick={() => onSave(draft)}
          >
            {t('profile.saveName')}
          </Button>
        </div>

        {supabaseConfigured ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4" aria-hidden />
                {t('profile.accountTitle')}
              </CardTitle>
              <CardDescription>{t('profile.accountDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {isGuest ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={onEnableCloud}
                    className="gap-2"
                  >
                    <LogIn className="size-4" />
                    {t('profile.saveOnline')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={onSignInDiscord}
                    className="gap-2"
                  >
                    {t('profile.signInDiscord')}
                  </Button>
                  <Separator className="my-1 sm:col-span-full" />
                  <div className="flex w-full min-w-0 flex-col gap-3 sm:col-span-full">
                    <div>
                      <p className="text-sm font-medium">{t('profile.emailAuthTitle')}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('profile.emailAuthDesc')}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={emailMode === 'signIn' ? 'secondary' : 'outline'}
                        disabled={busy}
                        onClick={() => {
                          setEmailMode('signIn')
                          setEmailFormError(null)
                        }}
                      >
                        {t('profile.emailModeSignIn')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={emailMode === 'signUp' ? 'secondary' : 'outline'}
                        disabled={busy}
                        onClick={() => {
                          setEmailMode('signUp')
                          setEmailFormError(null)
                        }}
                      >
                        {t('profile.emailModeSignUp')}
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="web-auth-email">{t('profile.emailLabel')}</Label>
                        <Input
                          id="web-auth-email"
                          type="email"
                          autoComplete="email"
                          value={emailDraft}
                          onChange={(e) => setEmailDraft(e.target.value)}
                          placeholder={t('profile.emailPlaceholder')}
                          disabled={busy}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') submitEmailAuth()
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="web-auth-password">{t('profile.passwordLabel')}</Label>
                        <Input
                          id="web-auth-password"
                          type="password"
                          autoComplete={
                            emailMode === 'signIn' ? 'current-password' : 'new-password'
                          }
                          value={passwordDraft}
                          onChange={(e) => setPasswordDraft(e.target.value)}
                          placeholder={t('profile.passwordPlaceholder')}
                          disabled={busy}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') submitEmailAuth()
                          }}
                        />
                      </div>
                    </div>
                    {emailFormError ? (
                      <p className="text-sm text-destructive">{emailFormError}</p>
                    ) : null}
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                      <Button
                        type="button"
                        disabled={busy}
                        onClick={submitEmailAuth}
                        className="w-full sm:w-auto"
                      >
                        {emailMode === 'signIn'
                          ? t('profile.emailSignInAction')
                          : t('profile.emailSignUp')}
                      </Button>
                      {emailMode === 'signIn' ? (
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto px-0 text-muted-foreground"
                          disabled={busy}
                          onClick={submitPasswordReset}
                        >
                          {t('profile.forgotPassword')}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={onDisableCloud}
                    className="gap-2"
                  >
                    <LogOut className="size-4" />
                    {t('profile.playGuestOnly')}
                  </Button>
                  {identityMode === 'cloud_anonymous' ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={onSignInDiscord}
                      className="gap-2"
                    >
                      {t('profile.linkDiscord')}
                    </Button>
                  ) : null}
                </>
              )}
            </CardContent>
            <p className="px-6 pb-4 text-xs text-muted-foreground">{t('profile.footerHint')}</p>
          </Card>
        ) : null}

        {supabaseConfigured && !isGuest ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('profile.statsTitle')}</CardTitle>
              <CardDescription>{t('profile.statsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {playerStats === null ? (
                <p className="text-sm text-muted-foreground">{t('profile.statsLoading')}</p>
              ) : (
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div className="flex justify-between gap-2 sm:flex-col sm:justify-start">
                    <dt className="text-muted-foreground">{t('profile.statsRounds')}</dt>
                    <dd className="font-medium tabular-nums">{playerStats.rounds_played}</dd>
                  </div>
                  <div className="flex justify-between gap-2 sm:flex-col sm:justify-start">
                    <dt className="text-muted-foreground">{t('profile.statsWinCrew')}</dt>
                    <dd className="font-medium tabular-nums">{playerStats.wins_as_crew}</dd>
                  </div>
                  <div className="flex justify-between gap-2 sm:flex-col sm:justify-start">
                    <dt className="text-muted-foreground">{t('profile.statsWinImp')}</dt>
                    <dd className="font-medium tabular-nums">{playerStats.wins_as_imposter}</dd>
                  </div>
                  <div className="flex justify-between gap-2 sm:flex-col sm:justify-start">
                    <dt className="text-muted-foreground">{t('profile.statsLossCrew')}</dt>
                    <dd className="font-medium tabular-nums">{playerStats.losses_as_crew}</dd>
                  </div>
                  <div className="flex justify-between gap-2 sm:flex-col sm:justify-start sm:col-span-2">
                    <dt className="text-muted-foreground">{t('profile.statsLossImp')}</dt>
                    <dd className="font-medium tabular-nums">{playerStats.losses_as_imposter}</dd>
                  </div>
                </dl>
              )}
            </CardContent>
          </Card>
        ) : null}

        {supabaseConfigured && !isGuest ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('profile.roundHistoryTitle')}</CardTitle>
              <CardDescription>{t('profile.roundHistoryDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {roundHistory === null ? (
                <p className="text-sm text-muted-foreground">{t('profile.roundHistoryLoading')}</p>
              ) : roundHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('profile.roundHistoryEmpty')}</p>
              ) : (
                <ul className="max-h-48 space-y-1 overflow-y-auto text-sm text-muted-foreground">
                  {roundHistory.map((r) => {
                    const reason =
                      r.reveal_reason === 'wrong_accusation'
                        ? t('profile.roundTagWrong')
                        : r.reveal_reason === 'caught_imposter'
                          ? t('profile.roundTagCaught')
                          : ''
                    return (
                      <li key={r.id}>
                        {t('profile.roundLine', {
                          n: r.round_index,
                          winner: r.winner,
                          role: r.was_imposter
                            ? t('profile.roundRoleImposter')
                            : t('profile.roundRoleCrew'),
                          vote: r.voted_for ? t('profile.roundVote') : '',
                          reason,
                        })}
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </header>
  )
}
