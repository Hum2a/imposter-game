import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

import { GameScreen } from '../components/layout/GameScreen'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { Player } from '../types/game'
import type { AuthUserProps } from './types'

type GameProps = AuthUserProps & {
  me: Player
}

export default function Game({ gameState, me }: GameProps) {
  const [now, setNow] = useState(() => Date.now())
  const [tabHidden, setTabHidden] = useState(
    () => typeof document !== 'undefined' && document.visibilityState === 'hidden'
  )

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const onVis = () => setTabHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const word = me.isImposter ? gameState.imposterWord : gameState.word
  const ends = gameState.discussionEndsAt
  const remaining =
    ends != null ? Math.max(0, Math.ceil((ends - now) / 1000)) : null

  return (
    <GameScreen className="text-center">
      <div className="flex flex-col items-center gap-2">
        <Badge variant="secondary">Discussion</Badge>
        {remaining != null ? (
          <Badge
            variant="outline"
            className="gap-1.5 font-mono text-sm tabular-nums"
            aria-live="polite"
            aria-atomic="true"
          >
            <Clock className="size-3.5" aria-hidden />
            Voting in {remaining}s
          </Badge>
        ) : null}
      </div>

      <Card className="overflow-hidden border-primary/25 bg-gradient-to-b from-card to-primary/5 shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl sm:text-3xl">
            {me.isImposter ? 'Your word (imposter)' : 'Your word'}
          </CardTitle>
          <CardDescription className="text-base">
            {me.isImposter
              ? 'You have a different word than the crew. Blend in without saying it outright.'
              : 'Describe it without naming it — the imposter is listening.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <div className="rounded-xl border border-primary/30 bg-primary/10 px-6 py-10">
            <p className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">{word}</p>
          </div>
        </CardContent>
      </Card>

      {tabHidden ? (
        <p className="text-center text-xs text-amber-700 dark:text-amber-400" role="status">
          Tab in background — the timer still runs on the server. Come back before time runs out.
        </p>
      ) : null}

      <Card className="border-dashed">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Tip: give clues that only someone who knows the real word would understand.
        </CardContent>
      </Card>
    </GameScreen>
  )
}
