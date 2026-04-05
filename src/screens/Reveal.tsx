import { Avatar } from '../components/Avatar'
import type { AuthUserProps } from './types'
import type { ClientMessage } from '../types/game'

type RevealProps = AuthUserProps & {
  isHost: boolean
  send: (msg: ClientMessage) => void
}

export default function Reveal({ gameState, isHost, send }: RevealProps) {
  const imposter = Object.values(gameState.players).find((p) => p.isImposter)

  const winnerLabel =
    gameState.winner === 'crew'
      ? 'Crew wins'
      : gameState.winner === 'imposter'
        ? 'Imposter wins'
        : 'No votes cast'

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-8 text-center">
      <div>
        <h1 className="text-3xl font-bold text-zinc-100">Reveal</h1>
        <p className="mt-2 text-xl text-violet-300">{winnerLabel}</p>
      </div>

      {imposter ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-500/30 bg-red-950/30 py-6">
          <Avatar
            user={{
              id: imposter.id,
              name: imposter.name,
              avatar: imposter.avatar,
            }}
            size={80}
            className="border-2 border-red-400/50"
          />
          <p className="text-sm text-red-200/80">The imposter was</p>
          <p className="text-2xl font-semibold text-red-100">{imposter.name}</p>
        </div>
      ) : null}

      <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 px-4 py-4 text-left text-sm text-zinc-300">
        <p>
          <span className="text-zinc-500">Crew word:</span>{' '}
          <span className="font-medium text-zinc-100">{gameState.word || '—'}</span>
        </p>
        <p className="mt-2">
          <span className="text-zinc-500">Imposter word:</span>{' '}
          <span className="font-medium text-zinc-100">
            {gameState.imposterWord || '—'}
          </span>
        </p>
      </div>

      <div className="text-left">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Votes
        </p>
        <ul className="space-y-1 text-sm text-zinc-400">
          {Object.entries(gameState.votes).map(([voterId, targetId]) => {
            const voter = gameState.players[voterId]
            const target = gameState.players[targetId]
            return (
              <li key={voterId}>
                {voter?.name ?? voterId} → {target?.name ?? targetId}
              </li>
            )
          })}
          {Object.keys(gameState.votes).length === 0 ? (
            <li className="text-zinc-600">No votes.</li>
          ) : null}
        </ul>
      </div>

      {isHost ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="rounded-lg bg-violet-600 px-4 py-3 font-medium text-white hover:bg-violet-500"
            onClick={() => send({ type: 'NEXT_ROUND' })}
          >
            Next round
          </button>
          <button
            type="button"
            className="rounded-lg border border-zinc-600 px-4 py-3 font-medium text-zinc-200 hover:bg-zinc-800"
            onClick={() => send({ type: 'BACK_TO_LOBBY' })}
          >
            Back to lobby
          </button>
        </div>
      ) : null}
    </div>
  )
}
