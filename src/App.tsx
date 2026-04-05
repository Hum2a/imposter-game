import { useEffect, type ReactNode } from 'react'
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
import Lobby from './screens/Lobby'
import Game from './screens/Game'
import Voting from './screens/Voting'
import Reveal from './screens/Reveal'

function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
      {children}
    </code>
  )
}

export default function App() {
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
    if (connection !== 'open' || !auth) return
    send({
      type: 'JOIN',
      userId: auth.user.id,
      name: auth.user.global_name ?? auth.user.username,
      avatar: auth.user.avatar ?? '',
      ...(isDiscordActivity &&
      auth.access_token &&
      !auth.access_token.startsWith('browser-dev') &&
      auth.access_token !== 'mock'
        ? { accessToken: auth.access_token }
        : {}),
    })
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
  ])

  if (error) {
    return (
      <AppErrorState
        message={error}
        hint={
          <>
            <p className="mb-3">
              In Discord: set <InlineCode>VITE_DISCORD_CLIENT_ID</InlineCode>, map{' '}
              <InlineCode>/api/token</InlineCode> to your Worker, and set{' '}
              <InlineCode>VITE_DISCORD_TOKEN_URL</InlineCode> if the app origin differs from the
              token endpoint.
            </p>
            <p>
              In the browser, a dev user is used automatically. Use{' '}
              <InlineCode>VITE_DISCORD_MOCK=1</InlineCode> for a fixed mock user and room.
            </p>
          </>
        }
      />
    )
  }

  if (!auth) {
    return <AppLoadingState label="Connecting…" />
  }

  if (!partyHost) {
    return (
      <AppConfigWarning
        title="Game server not configured"
        body="Partykit must be running and reachable so players can join the same room."
        codeHint={
          <>
            Run Partykit in <InlineCode>server/</InlineCode> (
            <InlineCode>npm run dev</InlineCode>), then set{' '}
            <InlineCode>VITE_PARTYKIT_HOST=localhost:1999</InlineCode> in{' '}
            <InlineCode>.env</InlineCode>.
          </>
        }
      />
    )
  }

  if (!gameState) {
    if (connection === 'closed') {
      return (
        <AppLoadingState
          label="Reconnecting to game server…"
          description="Connection dropped. Trying again — you can keep this tab open."
        />
      )
    }
    return <AppLoadingState label="Connecting to game server…" />
  }

  const me = gameState.players[auth.user.id]
  if (!me) {
    if (partyErrorCode === 'JOIN_VERIFY_FAILED') {
      return (
        <AppConfigWarning
          title="Could not verify your Discord account"
          body="This room requires a valid Discord sign-in. Try closing and reopening the Activity, or ask the host to turn off strict join verification for testing."
        />
      )
    }
    if (partyErrorCode === 'JOIN_NEED_TOKEN') {
      return (
        <AppConfigWarning
          title="Discord token required"
          body="The server is configured to verify Discord accounts on join, but no token was sent. Reopen the Activity from Discord or check Partykit JOIN_VERIFY settings."
        />
      )
    }
    if (gameState.phase !== 'lobby') {
      return (
        <AppLoadingState
          label="Joining this round…"
          description="If the game already started, you’ll appear as a spectator until the next lobby or round."
        />
      )
    }
    return <AppLoadingState label="Joining room…" />
  }

  const isHost = gameState.hostId === auth.user.id
  const props = { gameState, send, me, isHost, auth }

  const shell = (body: ReactNode) => (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      {connection === 'closed' ? (
        <div
          className="border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-center text-sm text-amber-950 dark:text-amber-100"
          role="status"
          aria-live="polite"
        >
          Reconnecting to the game server…
        </div>
      ) : null}
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
        />
      )
    case 'discussion':
      return shell(<Game {...props} />)
    case 'voting':
      return shell(<Voting {...props} />)
    case 'reveal':
      return shell(<Reveal {...props} />)
    default:
      return shell(
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          Unknown phase
        </div>
      )
  }
}
