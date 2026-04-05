import { useEffect, type ReactNode } from 'react'
import {
  AppConfigWarning,
  AppErrorState,
  AppLoadingState,
} from './components/layout/AppStates'
import { WebProfileControls } from './components/WebProfileControls'
import { useDiscord } from './hooks/useDiscord'
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
  const { auth, error, partyRoomId, webMode, setWebDisplayName, isDiscordActivity } =
    useDiscord()
  const partyHost = import.meta.env.VITE_PARTYKIT_HOST
  const { gameState, send } = useParty(partyRoomId ?? undefined, auth?.user.id)

  useEffect(() => {
    if (!auth || !gameState) return
    if (gameState.players[auth.user.id]) return
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
  }, [auth, gameState, send, isDiscordActivity])

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
    return <AppLoadingState label="Connecting to game server…" />
  }

  const me = gameState.players[auth.user.id]
  if (!me) {
    return <AppLoadingState label="Joining room…" />
  }

  const isHost = gameState.hostId === auth.user.id
  const props = { gameState, send, me, isHost, auth }

  const shell = (body: ReactNode) => (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      {webMode ? (
        <WebProfileControls
          displayName={auth.user.global_name ?? auth.user.username}
          onSave={setWebDisplayName}
        />
      ) : null}
      <div className="flex flex-1 flex-col">{body}</div>
    </div>
  )

  switch (gameState.phase) {
    case 'lobby':
      return shell(<Lobby {...props} />)
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
