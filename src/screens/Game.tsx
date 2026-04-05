import { useEffect, useState } from 'react'
import type { Player } from '../types/game'
import type { AuthUserProps } from './types'
import type { ClientMessage } from '../types/game'

type GameProps = AuthUserProps & {
  me: Player
  send: (msg: ClientMessage) => void
}

export default function Game({ gameState, me }: GameProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [])

  const word = me.isImposter ? gameState.imposterWord : gameState.word
  const ends = gameState.discussionEndsAt
  const remaining =
    ends != null ? Math.max(0, Math.ceil((ends - now) / 1000)) : null

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-10 text-center">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Discussion
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-100">Your word</h1>
      </div>

      <div className="rounded-2xl border border-violet-500/40 bg-violet-950/40 px-6 py-10">
        <p className="text-4xl font-bold tracking-tight text-violet-200">{word}</p>
      </div>

      {remaining != null ? (
        <p className="text-lg text-zinc-400">
          Voting in <span className="font-mono text-zinc-200">{remaining}s</span>
        </p>
      ) : null}

      <p className="text-sm text-zinc-500">
        Don’t say your word out loud — describe it without giving it away.
      </p>
    </div>
  )
}
