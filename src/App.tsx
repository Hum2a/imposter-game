import { useEffect, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import {
  AppConfigWarning,
  AppErrorState,
  AppLoadingState,
} from './components/layout/AppStates'
import { WebProfileControls } from './components/WebProfileControls'
import { useDiscord } from './hooks/useDiscord'
import { useGameAnalytics } from './hooks/useGameAnalytics'
import { trackEvent } from './lib/analytics'
import { isSupabaseConfigured } from './lib/supabase-client'
import { useParty } from './hooks/useParty'
import { fetchPartyJoinJwt, usePartyJoinJwtEnabled } from './lib/party-jwt-mint'
import { PhaseSfxListener, SfxProvider, SfxToggle } from './sfx'
import Lobby from './screens/Lobby'
import Game from './screens/Game'
import Voting from './screens/Voting'
import Reveal from './screens/Reveal'
import type { Phase } from './types/game'

function InlineCode({ children }: { children?: ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
      {children}
    </code>
  )
}

export default function App() {
  const { t } = useTranslation()
  const partyJwtMode = usePartyJoinJwtEnabled()
  const {
    auth,
    error,
    partyRoomId,
    webMode,
    webIdentityMode,
    webAuthBusy,
    webProfileError,
    clearWebProfileError,
    setWebDisplayName,
    enableWebCloud,
    disableWebCloud,
    signInDiscordOnWeb,
    isDiscordActivity,
    joinWebPartyRoom,
    createNewWebLobby,
    joinLobbyError,
    clearJoinLobbyError,
    discordLobbySuffix,
    setDiscordLobbySuffix,
  } = useDiscord()
  const partyHost = import.meta.env.VITE_PARTYKIT_HOST
  const { gameState, send, connection, socketOpenNonce, partyErrorCode, clearPartyError } =
    useParty(partyRoomId ?? undefined, auth?.user.id)

  useGameAnalytics(gameState, auth?.user.id)

  useEffect(() => {
    if (error) trackEvent('ClientError', { area: 'discord_setup' })
  }, [error])

  useEffect(() => {
    if (partyErrorCode) trackEvent('PartyError', { code: partyErrorCode })
  }, [partyErrorCode])

  useEffect(() => {
    if (joinLobbyError) trackEvent('JoinLobbyError', { reason: 'invalid_code' })
  }, [joinLobbyError])

  useEffect(() => {
    if (connection !== 'open' || !auth) return
    let cancelled = false
    const accessToken = auth.access_token
    const hasRealDiscordToken =
      Boolean(accessToken) &&
      !accessToken!.startsWith('browser-dev') &&
      accessToken !== 'mock'

    void (async () => {
      let partyJwt: string | undefined
      if (partyJwtMode && hasRealDiscordToken && accessToken) {
        const pj = await fetchPartyJoinJwt(accessToken)
        if (!cancelled && pj) partyJwt = pj
      }

      if (cancelled) return

      send({
        type: 'JOIN',
        userId: auth.user.id,
        name: auth.user.global_name ?? auth.user.username,
        avatar: auth.user.avatar ?? '',
        ...(partyJwt ? { partyJwt } : {}),
        ...(isDiscordActivity &&
        hasRealDiscordToken &&
        accessToken &&
        !partyJwtMode
          ? { accessToken }
          : {}),
      })
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- JOIN on socket open + stable identity fields (omit `auth` ref churn)
  }, [
    connection,
    socketOpenNonce,
    send,
    isDiscordActivity,
    auth?.user.id,
    auth?.user.global_name,
    auth?.user.username,
    auth?.user.avatar,
    auth?.access_token,
    partyJwtMode,
  ])

  if (error) {
    return (
      <AppErrorState
        message={error}
        hint={
          <>
            <p className="mb-3">
              <Trans
                i18nKey="app.discordErrorHintP1"
                components={{
                  code0: <InlineCode />,
                  code1: <InlineCode />,
                  code2: <InlineCode />,
                }}
              />
            </p>
            <p>
              <Trans
                i18nKey="app.discordErrorHintP2"
                components={{ code0: <InlineCode /> }}
              />
            </p>
          </>
        }
      />
    )
  }

  if (!auth) {
    return <AppLoadingState label={t('app.connecting')} />
  }

  if (!partyHost) {
    return (
      <AppConfigWarning
        title={t('app.gameServerNotConfigured')}
        body={t('app.gameServerNotConfiguredBody')}
        codeHint={
          <Trans
            i18nKey="app.partyHostHint"
            components={{
              code0: <InlineCode />,
              code1: <InlineCode />,
              code2: <InlineCode />,
              code3: <InlineCode />,
            }}
          />
        }
      />
    )
  }

  if (!gameState) {
    if (connection === 'closed') {
      return (
        <AppLoadingState
          label={t('app.reconnectingGameServer')}
          description={t('app.reconnectingGameServerDesc')}
        />
      )
    }
    return <AppLoadingState label={t('app.connectingGameServer')} />
  }

  const me = gameState.players[auth.user.id]
  if (!me) {
    if (partyErrorCode === 'JOIN_VERIFY_FAILED') {
      return (
        <AppConfigWarning
          title={t('app.verifyDiscordFailed')}
          body={t('app.verifyDiscordFailedBody')}
        />
      )
    }
    if (partyErrorCode === 'JOIN_NEED_TOKEN') {
      return (
        <AppConfigWarning
          title={t('app.discordTokenRequired')}
          body={t('app.discordTokenRequiredBody')}
        />
      )
    }
    if (partyErrorCode === 'JOIN_PARTY_JWT_REQUIRED') {
      return (
        <AppConfigWarning title={t('app.partyJwtRequired')} body={t('app.partyJwtRequiredBody')} />
      )
    }
    if (partyErrorCode === 'JOIN_PARTY_JWT_INVALID') {
      return (
        <AppConfigWarning title={t('app.partyJwtInvalid')} body={t('app.partyJwtInvalidBody')} />
      )
    }
    if (partyErrorCode === 'JOIN_PARTY_JWT_MISCONFIG') {
      return (
        <AppConfigWarning title={t('app.partyJwtMisconfig')} body={t('app.partyJwtMisconfigBody')} />
      )
    }
    if (gameState.phase !== 'lobby') {
      return (
        <AppLoadingState
          label={t('app.joiningRound')}
          description={t('app.joiningRoundDesc')}
        />
      )
    }
    return <AppLoadingState label={t('app.joiningRoom')} />
  }

  const isHost = gameState.hostId === auth.user.id
  const props = { gameState, send, me, isHost, auth }

  const shell = (body: ReactNode, phase: Phase) => (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      {connection === 'closed' ? (
        <div
          className="border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-center text-sm text-amber-950 dark:text-amber-100"
          role="status"
          aria-live="polite"
        >
          {t('app.reconnectBanner')}
        </div>
      ) : null}
      <SfxProvider>
        <PhaseSfxListener phase={phase} />
        <div className="flex justify-end border-b border-border/60 px-2 sm:px-4">
          <SfxToggle />
        </div>
        {webMode ? (
          <WebProfileControls
            displayName={auth.user.global_name ?? auth.user.username}
            onSave={setWebDisplayName}
            identityMode={webIdentityMode}
            supabaseConfigured={isSupabaseConfigured()}
            busy={webAuthBusy}
            profileError={webProfileError}
            onDismissProfileError={clearWebProfileError}
            onEnableCloud={enableWebCloud}
            onDisableCloud={disableWebCloud}
            onSignInDiscord={signInDiscordOnWeb}
          />
        ) : null}
        <div className="flex flex-1 flex-col">{body}</div>
      </SfxProvider>
    </div>
  )

  switch (gameState.phase) {
    case 'lobby':
      return shell(
        <Lobby
          {...props}
          partyRoomId={partyRoomId ?? ''}
          webMode={webMode}
          isDiscordActivity={isDiscordActivity}
          onJoinWebLobby={joinWebPartyRoom}
          onCreateWebLobby={createNewWebLobby}
          joinLobbyError={joinLobbyError}
          onDismissJoinLobbyError={clearJoinLobbyError}
          discordLobbySuffix={discordLobbySuffix}
          onDiscordLobbySuffixChange={setDiscordLobbySuffix}
          partyErrorCode={partyErrorCode}
          onDismissPartyError={clearPartyError}
          savedWordListsEnabled={
            webMode && isSupabaseConfigured() && webIdentityMode !== 'guest'
          }
        />,
        gameState.phase
      )
    case 'discussion':
      return shell(<Game {...props} />, gameState.phase)
    case 'voting':
      return shell(<Voting {...props} />, gameState.phase)
    case 'reveal':
      return shell(<Reveal {...props} partyRoomId={partyRoomId ?? ''} />, gameState.phase)
    default:
      return shell(
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          {t('app.unknownPhase')}
        </div>,
        gameState.phase
      )
  }
}
