import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Trophy } from 'lucide-react'

import { Avatar } from '../components/Avatar'
import { GameScreen } from '../components/layout/GameScreen'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { recordPlayerRoundIfNeeded } from '@/lib/record-player-round'
import { VOTE_SKIP_VALUE } from '../types/game'
import type { AuthUserProps } from './types'
import type { ClientMessage } from '../types/game'

type RevealProps = AuthUserProps & {
  isHost: boolean
  send: (msg: ClientMessage) => void
  partyRoomId: string
}

export default function Reveal({ gameState, isHost, send, auth, partyRoomId }: RevealProps) {
  const { t } = useTranslation()
  const me = gameState.players[auth.user.id]
  const isSpectator = me?.isSpectator === true
  const imposter = Object.values(gameState.players).find((p) => p.isImposter)

  useEffect(() => {
    if (!me || me.isSpectator) return
    const activePlayers = Object.values(gameState.players).filter((p) => !p.isSpectator)
    const playerCount = activePlayers.length
    const imposterPlayer = activePlayers.find((p) => p.isImposter)
    const voteWasSkip = me.votedFor === VOTE_SKIP_VALUE
    const votedTargetName =
      me.votedFor && me.votedFor !== VOTE_SKIP_VALUE
        ? gameState.players[me.votedFor]?.name?.trim().slice(0, 80) ?? null
        : null
    void recordPlayerRoundIfNeeded({
      partyRoomId,
      roundIndex: gameState.round,
      winner: gameState.winner,
      wasImposter: me.isImposter,
      votedFor: me.votedFor,
      revealReason: gameState.revealReason,
      wasHost: isHost,
      playerCount,
      wordPackId: gameState.wordPackId,
      clueCycle: gameState.clueCycle,
      maxClueRounds: gameState.gameSettings.maxClueRounds,
      writeSeconds: gameState.gameSettings.writeSeconds,
      voteWasSkip,
      imposterPlayerId: imposterPlayer?.id ?? null,
      imposterDisplayName: imposterPlayer?.name?.trim().slice(0, 80) ?? null,
      votedTargetName,
      roomCrewWins: gameState.stats.crewWins,
      roomImposterWins: gameState.stats.imposterWins,
      roomRoundsCompleted: gameState.stats.roundsCompleted,
    })
  }, [
    partyRoomId,
    gameState.round,
    gameState.winner,
    gameState.revealReason,
    gameState.wordPackId,
    gameState.clueCycle,
    gameState.gameSettings.maxClueRounds,
    gameState.gameSettings.writeSeconds,
    gameState.stats.crewWins,
    gameState.stats.imposterWins,
    gameState.stats.roundsCompleted,
    gameState.players,
    isHost,
    me?.id,
    me?.isSpectator,
    me?.isImposter,
    me?.votedFor,
  ])

  const winnerLabel =
    gameState.winner === 'crew'
      ? t('reveal.crewWins')
      : gameState.winner === 'imposter'
        ? gameState.revealReason === 'wrong_accusation'
          ? t('reveal.wrongAccusation')
          : t('reveal.imposterWins')
        : t('reveal.noVotes')

  return (
    <GameScreen>
      {isSpectator ? (
        <p className="text-center text-sm text-muted-foreground" role="status">
          {t('reveal.spectatorNote')}
        </p>
      ) : null}
      <Card className="transition-shadow duration-200 motion-reduce:transition-none">
        <CardHeader className="text-center">
          <Badge variant="outline">{t('reveal.roundOver')}</Badge>
          <CardTitle className="flex items-center justify-center gap-2 text-3xl">
            <Trophy className="size-8 text-primary" aria-hidden />
            {t('reveal.title')}
          </CardTitle>
          <CardDescription className="text-lg font-medium text-foreground">
            {winnerLabel}
          </CardDescription>
        </CardHeader>
      </Card>

      {imposter ? (
        <Card className="border-destructive/40 bg-destructive/5 transition-shadow duration-200 motion-reduce:transition-none">
          <CardHeader>
            <CardTitle className="text-lg text-destructive">{t('reveal.imposterCardTitle')}</CardTitle>
            <CardDescription>{t('reveal.imposterCardDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3 pb-8">
            <Avatar
              user={{
                id: imposter.id,
                name: imposter.name,
                avatar: imposter.avatar,
              }}
              size={80}
              className="border-2 border-destructive/40"
            />
            <p className="text-2xl font-semibold text-foreground">{imposter.name}</p>
          </CardContent>
        </Card>
      ) : null}

      {Object.keys(gameState.revealedClues).length > 0 ? (
        <Card className="transition-shadow duration-200 motion-reduce:transition-none">
          <CardHeader>
            <CardTitle className="text-lg">{t('reveal.cluesFromRoundTitle')}</CardTitle>
            <CardDescription>{t('reveal.cluesFromRoundDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {Object.entries(gameState.revealedClues).map(([pid, clue]) => {
                const pl = gameState.players[pid]
                return (
                  <li
                    key={pid}
                    className="flex flex-wrap items-baseline gap-x-2 rounded-md border border-border/60 px-3 py-2"
                  >
                    <span className="font-medium text-foreground">{pl?.name ?? pid}</span>
                    <span className="text-muted-foreground">—</span>
                    <span>{clue.length > 0 ? clue : t('clueReveal.noClue')}</span>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card className="transition-shadow duration-200 motion-reduce:transition-none">
        <CardHeader>
          <CardTitle className="text-lg">{t('reveal.wordsTitle')}</CardTitle>
          <CardDescription>{t('reveal.wordsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-col gap-1 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-3">
            <span className="text-xs font-medium uppercase tracking-wide text-emerald-900/80 dark:text-emerald-100/80">
              {t('reveal.crewWord')}
            </span>
            <span className="text-lg font-semibold text-foreground">
              {gameState.word || '—'}
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border border-rose-500/25 bg-rose-500/10 px-4 py-3">
            <span className="text-xs font-medium uppercase tracking-wide text-rose-900/80 dark:text-rose-100/80">
              {t('reveal.imposterWord')}
            </span>
            <span className="text-lg font-semibold text-foreground">
              {gameState.imposterWord || '—'}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="transition-shadow duration-200 motion-reduce:transition-none">
        <CardHeader>
          <CardTitle className="text-lg">{t('reveal.votesTitle')}</CardTitle>
          <CardDescription>{t('reveal.votesDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {Object.entries(gameState.votes).map(([voterId, targetId]) => {
              const voter = gameState.players[voterId]
              const target =
                targetId === VOTE_SKIP_VALUE ? null : gameState.players[targetId]
              const skip = targetId === VOTE_SKIP_VALUE
              const votedImposter = !skip && target?.isImposter === true
              const borderClass = skip
                ? 'border-l-amber-500/80 bg-amber-500/5'
                : votedImposter
                  ? 'border-l-emerald-500/80 bg-emerald-500/5'
                  : 'border-l-primary/50 bg-primary/5'
              return (
                <li
                  key={voterId}
                  className={`flex flex-wrap items-baseline gap-x-2 rounded-md border border-border/60 border-l-4 px-3 py-2 transition-colors duration-150 motion-reduce:transition-none ${borderClass}`}
                >
                  <span className="font-medium text-foreground">
                    {voter?.name ?? voterId}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span className={skip ? 'font-medium text-amber-800 dark:text-amber-200' : ''}>
                    {skip
                      ? t('voting.skipVote')
                      : (target?.name ?? targetId)}
                  </span>
                </li>
              )
            })}
            {Object.keys(gameState.votes).length === 0 ? (
              <li className="text-muted-foreground">{t('reveal.noVotesList')}</li>
            ) : null}
          </ul>
        </CardContent>
      </Card>

      {isHost ? (
        <Card className="transition-shadow duration-200 motion-reduce:transition-none">
          <CardHeader>
            <CardTitle className="text-lg">{t('reveal.hostTitle')}</CardTitle>
            <CardDescription>{t('reveal.hostDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              size="lg"
              className="min-h-11 w-full sm:w-auto"
              aria-label={t('reveal.nextRoundAria')}
              onClick={() => send({ type: 'NEXT_ROUND' })}
            >
              {t('reveal.nextRound')}
            </Button>
            {gameState.gameSettings.rotateHostEachRound ? (
              <p className="w-full text-xs text-muted-foreground sm:order-last sm:basis-full">
                {t('reveal.nextRoundRotatesHostHint')}
              </p>
            ) : null}
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="min-h-11 w-full sm:w-auto"
              aria-label={t('reveal.backLobbyAria')}
              onClick={() => send({ type: 'BACK_TO_LOBBY' })}
            >
              {t('reveal.backLobby')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <p className="text-center text-sm text-muted-foreground">{t('reveal.waitingHost')}</p>
      )}
    </GameScreen>
  )
}
