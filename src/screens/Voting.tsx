import { useState } from 'react'
import { Avatar } from '../components/Avatar'
import type { Player } from '../types/game'
import type { AuthUserProps } from './types'
import type { ClientMessage } from '../types/game'

type VotingProps = AuthUserProps & {
  me: Player
  send: (msg: ClientMessage) => void
}

export default function Voting({ gameState, me, send }: VotingProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const players = Object.values(gameState.players)

  const confirm = () => {
    if (!selected || me.hasVoted) return
    send({ type: 'CAST_VOTE', targetId: selected })
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-zinc-100">Vote</h1>
        <p className="mt-1 text-sm text-zinc-400">Who is the imposter?</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {players.map((p) => {
          const isSelf = p.id === me.id
          const isSelected = selected === p.id
          return (
            <button
              key={p.id}
              type="button"
              disabled={me.hasVoted || isSelf}
              onClick={() => setSelected(p.id)}
              className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition ${
                isSelf
                  ? 'cursor-not-allowed border-zinc-800 opacity-40'
                  : isSelected
                    ? 'border-violet-500 bg-violet-950/50'
                    : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-500'
              }`}
            >
              <Avatar user={{ id: p.id, name: p.name, avatar: p.avatar }} size={56} />
              <span className="text-sm font-medium text-zinc-200">{p.name}</span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        disabled={!selected || me.hasVoted}
        onClick={confirm}
        className="rounded-lg bg-violet-600 px-4 py-3 font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {me.hasVoted ? 'Vote locked in' : 'Confirm vote'}
      </button>

      <ul className="text-center text-xs text-zinc-500">
        {players.map((p) => (
          <li key={p.id}>
            {p.name}: {p.hasVoted ? 'voted' : 'thinking…'}
          </li>
        ))}
      </ul>
    </div>
  )
}
