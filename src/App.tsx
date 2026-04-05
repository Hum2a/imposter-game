import { useEffect } from 'react'
import { useDiscord } from './hooks/useDiscord'
import { useParty } from './hooks/useParty'
import Lobby from './screens/Lobby'
import Game from './screens/Game'
import Voting from './screens/Voting'
import Reveal from './screens/Reveal'

export default function App() {
  const { auth, error, partyRoomId } = useDiscord()
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
    })
  }, [auth, gameState, send])

  if (error) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-2 bg-zinc-950 px-6 text-center">
        <p className="text-red-400">{error}</p>
        <p className="max-w-md text-sm text-zinc-500">
          In Discord: set <code className="text-zinc-400">VITE_DISCORD_CLIENT_ID</code>, map{' '}
          <code className="text-zinc-400">/api/token</code> to your Worker, and set{' '}
          <code className="text-zinc-400">VITE_DISCORD_TOKEN_URL</code> to the full Worker URL
          if the app origin is not the same as the token endpoint. Outside Discord, the app
          uses a browser dev user automatically; use{' '}
          <code className="text-zinc-400">VITE_DISCORD_MOCK=1</code> to force the fixed mock
          user and room.
        </p>
      </div>
    )
  }

  if (!auth) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-zinc-950 text-zinc-400">
        Connecting…
      </div>
    )
  }

  if (!partyHost) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-2 bg-zinc-950 px-6 text-center text-amber-400">
        <p>Missing VITE_PARTYKIT_HOST</p>
        <p className="text-sm text-zinc-500">
          Run Partykit in <code className="text-zinc-400">server/</code> (
          <code className="text-zinc-400">npm run dev</code>) and set{' '}
          <code className="text-zinc-400">VITE_PARTYKIT_HOST=localhost:1999</code> in{' '}
          <code className="text-zinc-400">.env</code>.
        </p>
      </div>
    )
  }

  if (!gameState) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-zinc-950 text-zinc-400">
        Connecting to game server…
      </div>
    )
  }

  const me = gameState.players[auth.user.id]
  if (!me) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-zinc-950 text-zinc-400">
        Joining room…
      </div>
    )
  }

  const isHost = gameState.hostId === auth.user.id
  const props = { gameState, send, me, isHost, auth }

  switch (gameState.phase) {
    case 'lobby':
      return <Lobby {...props} />
    case 'discussion':
      return <Game {...props} />
    case 'voting':
      return <Voting {...props} />
    case 'reveal':
      return <Reveal {...props} />
    default:
      return (
        <div className="flex min-h-svh items-center justify-center bg-zinc-950 text-zinc-400">
          Unknown phase
        </div>
      )
  }
}
