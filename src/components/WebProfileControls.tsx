import { useEffect, useState } from 'react'
import { LogIn, LogOut, User, Users } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import type { WebIdentityMode } from '@/lib/web-session'

type WebProfileControlsProps = {
  displayName: string
  onSave: (name: string) => void
  identityMode: WebIdentityMode
  supabaseConfigured: boolean
  busy: boolean
  profileError: string | null
  onDismissProfileError: () => void
  onEnableCloud: () => void
  onDisableCloud: () => void
  onSignInDiscord: () => void
}

function identityLabel(mode: WebIdentityMode): string {
  switch (mode) {
    case 'guest':
      return 'Guest'
    case 'cloud_anonymous':
      return 'Online backup'
    case 'cloud_discord':
      return 'Discord account'
    case 'cloud_other':
      return 'Signed in'
    default:
      return 'Player'
  }
}

export function WebProfileControls({
  displayName,
  onSave,
  identityMode,
  supabaseConfigured,
  busy,
  profileError,
  onDismissProfileError,
  onEnableCloud,
  onDisableCloud,
  onSignInDiscord,
}: WebProfileControlsProps) {
  const [draft, setDraft] = useState(displayName)

  useEffect(() => {
    setDraft(displayName)
  }, [displayName])

  const isGuest = identityMode === 'guest'

  return (
    <header className="border-b bg-card/90 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-4">
        {profileError ? (
          <Alert variant="destructive" className="relative">
            <AlertTitle>Profile</AlertTitle>
            <AlertDescription className="pr-8">{profileError}</AlertDescription>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2 h-7 px-2"
              onClick={onDismissProfileError}
            >
              Dismiss
            </Button>
          </Alert>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">Web play</span>
          <Separator orientation="vertical" className="hidden h-4 sm:block" />
          <Badge variant={isGuest ? 'outline' : 'secondary'} className="gap-1 font-normal">
            <User className="size-3" aria-hidden />
            {identityLabel(identityMode)}
          </Badge>
          {!supabaseConfigured ? (
            <span className="text-xs text-muted-foreground">
              Add Supabase env vars for optional online profiles.
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="web-display-name">Display name</Label>
            <Input
              id="web-display-name"
              type="text"
              value={draft}
              maxLength={40}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="How others see you in-game"
              aria-label="Display name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSave(draft)
              }}
            />
            <p className="text-xs text-muted-foreground">
              {isGuest
                ? 'Saved on this device only. No account required.'
                : 'Synced to your online profile when possible.'}
            </p>
          </div>
          <Button
            type="button"
            className="shrink-0 sm:min-w-[5rem]"
            disabled={busy}
            onClick={() => onSave(draft)}
          >
            Save name
          </Button>
        </div>

        {supabaseConfigured ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4" aria-hidden />
                Account (optional)
              </CardTitle>
              <CardDescription>
                Play as a guest by default. Turn on an online profile to keep the same identity when
                you clear site data, or sign in with Discord for a stable account (good for future
                stats and cross-save).
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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
                    Save progress online
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={onSignInDiscord}
                    className="gap-2"
                  >
                    Sign in with Discord
                  </Button>
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
                    Play as guest only
                  </Button>
                  {identityMode === 'cloud_anonymous' ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={onSignInDiscord}
                      className="gap-2"
                    >
                      Link Discord account
                    </Button>
                  ) : null}
                </>
              )}
            </CardContent>
            <p className="px-6 pb-4 text-xs text-muted-foreground">
              Switching guest ↔ online changes your in-game user id — you may show as a new player
              in an open room. Enable the Discord provider in Supabase Auth and add your site URL to
              redirect allow list for “Sign in with Discord”.
            </p>
          </Card>
        ) : null}
      </div>
    </header>
  )
}
