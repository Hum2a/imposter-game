import { useTranslation } from 'react-i18next'
import { AlertTriangle, ThumbsDown } from 'lucide-react'

import { Avatar } from '../components/Avatar'
import { GameScreen } from '../components/layout/GameScreen'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { ClientMessage, Player } from '../types/game'
import type { AuthUserProps } from './types'

type ClueRevealProps = AuthUserProps & {
  me: Player
  send: (msg: ClientMessage) => void
  isHost: boolean
  partyErrorCode?: string | null
  onDismissPartyError?: () => void
}

export default function ClueReveal({
  gameState,
  me,
  send,
  isHost,
  partyErrorCode,
  onDismissPartyError,
}: ClueRevealProps) {
  const { t } = useTranslation()
  const players = Object.values(gameState.players).filter((p) => !p.isSpectator)
  const isSpectator = me.isSpectator === true
  const lastCycle = gameState.clueCycle >= gameState.gameSettings.maxClueRounds

  const partyErr = (() => {
    switch (partyErrorCode) {
      case 'CLUE_PROFANITY':
        return t('game.clueProfanity')
      case 'INVALID_CLUE':
        return t('game.invalidClue')
      default:
        return null
    }
  })()

  return (
    <GameScreen>
      {partyErr ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{partyErr}</span>
            {onDismissPartyError ? (
              <Button type="button" variant="outline" size="sm" onClick={onDismissPartyError}>
                {t('lobby.dismiss')}
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Badge variant="secondary">{t('clueReveal.badge')}</Badge>
        <Badge variant="outline" className="tabular-nums">
          {t('game.clueCycle', {
            current: gameState.clueCycle,
            max: gameState.gameSettings.maxClueRounds,
          })}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t('clueReveal.title')}</CardTitle>
          <CardDescription>{t('clueReveal.desc')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="flex flex-col gap-3">
            {players.map((p) => {
              const clue = gameState.revealedClues[p.id] ?? ''
              const marks = gameState.suspicion[p.id] ?? 0
              return (
                <li
                  key={p.id}
                  className="flex flex-col gap-2 rounded-lg border border-border/80 bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar user={{ id: p.id, name: p.name, avatar: p.avatar }} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{p.name}</p>
                      <p className="text-lg font-semibold text-primary">
                        {clue.length > 0 ? clue : t('clueReveal.noClue')}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {marks > 0 ? (
                      <Badge variant="outline" className="gap-1 tabular-nums">
                        <AlertTriangle className="size-3.5 text-amber-600" aria-hidden />
                        {t('clueReveal.suspicionCount', { count: marks })}
                      </Badge>
                    ) : null}
                    {!isSpectator && p.id !== me.id ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="min-h-11"
                        onClick={() => {
                          onDismissPartyError?.()
                          send({ type: 'BUMP_SUSPICION', targetId: p.id })
                        }}
                      >
                        <ThumbsDown className="size-4" aria-hidden />
                        {t('clueReveal.suspicion')}
                      </Button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full sm:w-auto"
          disabled={isSpectator}
          onClick={() => send({ type: 'CALL_VOTE' })}
        >
          {t('clueReveal.callVote')}
        </Button>
        {isHost ? (
          <Button
            type="button"
            className="min-h-11 w-full sm:w-auto"
            onClick={() => send({ type: 'CONTINUE_CLUE_REVEAL' })}
          >
            {lastCycle ? t('clueReveal.continueToVoting') : t('clueReveal.nextClueRound')}
          </Button>
        ) : (
          <p className="text-center text-sm text-muted-foreground sm:self-center">
            {lastCycle ? t('clueReveal.waitHostVoting') : t('clueReveal.waitHostNext')}
          </p>
        )}
      </div>
    </GameScreen>
  )
}
