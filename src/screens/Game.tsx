import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const [now, setNow] = useState(() => Date.now())
  const [tabHidden, setTabHidden] = useState(
    () => typeof document !== 'undefined' && document.visibilityState === 'hidden'
  )

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const onVis = () => setTabHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const isSpectator = me.isSpectator === true
  const word = me.isImposter ? gameState.imposterWord : gameState.word
  const ends = gameState.discussionEndsAt
  const remaining =
    ends != null ? Math.max(0, Math.ceil((ends - now) / 1000)) : null

  if (isSpectator) {
    return (
      <GameScreen className="text-center">
        <div className="flex flex-col items-center gap-2">
          <Badge variant="secondary">{t('game.discussion')}</Badge>
          <Badge variant="outline">{t('game.spectator')}</Badge>
        </div>
        <Card className="transition-[box-shadow,transform] duration-200 motion-reduce:transition-none">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">{t('game.watchingTitle')}</CardTitle>
            <CardDescription className="text-base">{t('game.watchingDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {remaining != null ? (
              <p className="text-sm text-muted-foreground">
                {t('game.votingSoon')}{' '}
                <span className="font-mono font-medium tabular-nums">{remaining}s</span>.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">{t('game.timerSyncing')}</p>
            )}
          </CardContent>
        </Card>
      </GameScreen>
    )
  }

  return (
    <GameScreen className="text-center">
      <div className="flex flex-col items-center gap-2">
        <Badge variant="secondary">{t('game.discussion')}</Badge>
        {remaining != null ? (
          <Badge
            variant="outline"
            className="gap-1.5 font-mono text-sm tabular-nums"
            aria-live="polite"
            aria-atomic="true"
          >
            <Clock className="size-3.5" aria-hidden />
            {t('game.votingIn')} {remaining}s
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="gap-1.5 text-sm text-muted-foreground"
            aria-live="polite"
            aria-atomic="true"
          >
            <Clock className="size-3.5" aria-hidden />
            {t('game.timerSyncing')}
          </Badge>
        )}
      </div>

      <Card className="overflow-hidden border-primary/25 bg-gradient-to-b from-card to-primary/5 shadow-md transition-[box-shadow,transform] duration-200 motion-reduce:transition-none">
        <CardHeader>
          <CardTitle className="text-2xl sm:text-3xl">
            {me.isImposter ? t('game.yourWordImposter') : t('game.yourWord')}
          </CardTitle>
          <CardDescription className="text-base">
            {me.isImposter ? t('game.imposterBlurb') : t('game.crewBlurb')}
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
          {t('game.tabHidden')}
        </p>
      ) : null}

      <Card className="border-dashed transition-shadow duration-200 motion-reduce:transition-none">
        <CardContent className="pt-6 text-sm text-muted-foreground">{t('game.tipTitle')}</CardContent>
      </Card>
    </GameScreen>
  )
}
