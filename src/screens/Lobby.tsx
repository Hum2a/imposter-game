import { Avatar } from '../components/Avatar'
import type { GameState } from '../types/game'
import type { ClientMessage } from '../types/game'

type LobbyProps = {
  gameState: GameState
  send: (msg: ClientMessage) => void
  isHost: boolean
}

export default function Lobby({ gameState, send, isHost }: LobbyProps) {
  const players = Object.values(gameState.players)

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8 text-left">
      <div className="flex flex-col items-center gap-3 sm:items-start">
        <img
          src="/logo.svg"
          alt="Imposter"
          className="h-auto w-full max-w-md"
          width={600}
          height={300}
          decoding="async"
        />
        <h1 className="text-lg font-medium text-zinc-300">Lobby</h1>
        <p className="text-sm text-zinc-400">
          Waiting for players. The host can start when everyone has joined.
        </p>
        <p className="mt-3 text-xs text-zinc-500">
          Room stats (persisted){' '}
          <span className="text-zinc-400">
            rounds {gameState.stats.roundsCompleted} · crew {gameState.stats.crewWins} ·
            imposter {gameState.stats.imposterWins}
          </span>
        </p>
      </div>

      <ul className="flex flex-col gap-2 rounded-xl border border-zinc-700 bg-zinc-900/60 p-3">
        {players.length === 0 ? (
          <li className="text-sm text-zinc-500">No players yet…</li>
        ) : (
          players.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-lg px-2 py-2 text-zinc-200"
            >
              <Avatar user={{ id: p.id, name: p.name, avatar: p.avatar }} size={40} />
              <span className="font-medium">{p.name}</span>
              {p.id === gameState.hostId ? (
                <span className="ml-auto text-xs text-violet-400">Host</span>
              ) : null}
            </li>
          ))
        )}
      </ul>

      {isHost ? (
        <button
          type="button"
          className="rounded-lg bg-violet-600 px-4 py-3 font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={players.length === 0}
          onClick={() => send({ type: 'START_GAME' })}
        >
          Start game
        </button>
      ) : (
        <p className="text-center text-sm text-zinc-500">
          Only the host can start the game.
        </p>
      )}
    </div>
  )
}
