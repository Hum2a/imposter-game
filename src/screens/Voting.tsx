import { Fragment, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, CircleDot, Clock } from 'lucide-react'

import { ConfirmModal } from '@/components/ConfirmModal'
import { Avatar } from '../components/Avatar'
import { GameScreen } from '../components/layout/GameScreen'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { ClientMessage, Player } from '../types/game'
import { VOTE_SKIP_VALUE } from '../types/game'
import type { AuthUserProps } from './types'
import { useSfx } from '../sfx/use-sfx'
import { lightVoteHaptic } from '../lib/haptics'
import { trackEvent } from '../lib/analytics'

type VotingProps = AuthUserProps & {
  me: Player
  isHost: boolean
  send: (msg: ClientMessage) => void
}

type Selection = 'skip' | string

export default function Voting({ gameState, me, isHost, send }: VotingProps) {
  const { t } = useTranslation()
  const { play } = useSfx()
  const [now, setNow] = useState(() => Date.now())
  const [selected, setSelected] = useState<Selection | null>(null)
  const [endGameModalOpen, setEndGameModalOpen] = useState(false)
  const players = Object.values(gameState.players)

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [])
  const isSpectator = me.isSpectator === true
  const votingPlayers = players.filter((p) => !p.isSpectator)
  const votedCount = votingPlayers.filter((p) => p.hasVoted).length
  const voteEnds = gameState.voteEndsAt
  const voteRemaining =
    voteEnds != null ? Math.max(0, Math.ceil((voteEnds - now) / 1000)) : null

  const confirm = () => {
    if (!selected || me.hasVoted || isSpectator) return
    trackEvent('VoteSubmit')
    play('vote')
    lightVoteHaptic()
    if (selected === 'skip') {
      send({ type: 'CAST_VOTE', skip: true })
    } else {
      send({ type: 'CAST_VOTE', targetId: selected })
    }
  }

  const voteLine = (p: Player) => {
    if (!p.hasVoted) return t('voting.thinking')
    if (p.votedFor === VOTE_SKIP_VALUE) return t('voting.skipped')
    return t('voting.voted')
  }

  if (isSpectator) {
    return (
      <GameScreen>
        <Card className="transition-shadow duration-200 motion-reduce:transition-none">
          <CardHeader className="text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Badge variant="secondary">{t('voting.voting')}</Badge>
              <Badge variant="outline">{t('voting.spectator')}</Badge>
              {voteRemaining != null ? (
                <Badge variant="outline" className="gap-1.5 font-mono tabular-nums">
                  <Clock className="size-3.5" aria-hidden />
                  {t('voting.timeLeft')} {voteRemaining}s
                </Badge>
              ) : null}
            </div>
            <CardTitle className="text-2xl">{t('voting.watchingTitle')}</CardTitle>
            <CardDescription>{t('voting.watchingDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              {votingPlayers.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <Avatar user={{ id: p.id, name: p.name, avatar: p.avatar }} size={36} />
                  <span className="font-medium text-foreground">{p.name}</span>
                  <span>— {voteLine(p)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </GameScreen>
    )
  }

  return (
    <Fragment>
    <GameScreen>
      <Card className="transition-shadow duration-200 motion-reduce:transition-none">
        <CardHeader className="text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <Badge variant="secondary">{t('voting.voting')}</Badge>
            <Badge variant="outline" className="tabular-nums">
              {t('voting.countVoted', { count: votedCount, total: votingPlayers.length })}
            </Badge>
            {voteRemaining != null ? (
              <Badge
                variant="outline"
                className="gap-1.5 font-mono tabular-nums"
                aria-live="polite"
              >
                <Clock className="size-3.5" aria-hidden />
                {t('voting.timeLeft')} {voteRemaining}s
              </Badge>
            ) : null}
          </div>
          <CardTitle id="voting-heading" className="text-2xl">
            {t('voting.whoImposter')}
          </CardTitle>
          <CardDescription>
            {t('voting.instructionsV2')}
            {me.hasVoted ? t('voting.voteLocked') : ''}
            {voteRemaining === 0 && !me.hasVoted ? ` ${t('voting.timeExpired')}` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            type="button"
            variant={selected === 'skip' ? 'default' : 'outline'}
            disabled={me.hasVoted}
            role="radio"
            aria-checked={!me.hasVoted ? selected === 'skip' : undefined}
            aria-label={t('voting.skipAria')}
            className="min-h-11 w-full justify-center text-base font-medium"
            onClick={() => setSelected('skip')}
          >
            {t('voting.skipVote')}
          </Button>
          <div
            className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3"
            role="radiogroup"
            aria-labelledby="voting-heading"
          >
            {votingPlayers.map((p) => {
              const isSelf = p.id === me.id
              const isSelected = selected === p.id
              const label = isSelf
                ? t('voting.cannotVoteSelf', { name: p.name })
                : t('voting.selectToVote', { name: p.name })
              return (
                <Button
                  key={p.id}
                  type="button"
                  variant={isSelected ? 'default' : 'outline'}
                  disabled={me.hasVoted || isSelf}
                  role="radio"
                  aria-checked={!isSelf && !me.hasVoted ? isSelected : isSelf ? false : undefined}
                  aria-label={label}
                  className="min-h-11 h-auto flex-col gap-2 py-4 font-normal transition-colors duration-150 motion-reduce:transition-none"
                  onClick={() => setSelected(p.id)}
                >
                  <Avatar user={{ id: p.id, name: p.name, avatar: p.avatar }} size={56} />
                  <span className="max-w-full truncate text-sm font-medium">{p.name}</span>
                  {isSelf ? (
                    <span className="text-xs text-muted-foreground">{t('voting.you')}</span>
                  ) : null}
                </Button>
              )
            })}
          </div>
        </CardContent>
        <Separator />
        <CardFooter className="flex-col gap-4 pt-6">
          <Button
            type="button"
            size="lg"
            className="min-h-11 w-full sm:max-w-xs sm:self-center"
            disabled={!selected || me.hasVoted}
            aria-label={
              me.hasVoted
                ? t('voting.confirmAriaVoted')
                : selected === 'skip'
                  ? t('voting.confirmAriaSkip')
                  : selected
                    ? t('voting.confirmAriaFor', {
                        name: players.find((x) => x.id === selected)?.name ?? 'player',
                      })
                    : t('voting.confirmAriaSelect')
            }
            onClick={confirm}
          >
            {me.hasVoted ? (
              <>
                <Check className="size-4" />
                {t('voting.voteSubmitted')}
              </>
            ) : (
              t('voting.confirmVote')
            )}
          </Button>
          <ul className="flex w-full flex-col gap-1.5 text-center text-xs text-muted-foreground sm:text-left">
            {votingPlayers.map((p) => (
              <li key={p.id} className="flex items-center justify-center gap-2 sm:justify-start">
                {p.hasVoted ? (
                  <Check className="size-3.5 shrink-0 text-primary" aria-hidden />
                ) : (
                  <CircleDot className="size-3.5 shrink-0 opacity-40" aria-hidden />
                )}
                <span className="font-medium text-foreground">{p.name}</span>
                <span>— {voteLine(p)}</span>
              </li>
            ))}
          </ul>
          {isHost ? (
            <Button
              type="button"
              variant="destructive"
              className="min-h-11 w-full sm:max-w-xs sm:self-center"
              onClick={() => setEndGameModalOpen(true)}
            >
              {t('clueReveal.endGameHost')}
            </Button>
          ) : null}
        </CardFooter>
      </Card>
    </GameScreen>
    <ConfirmModal
      open={endGameModalOpen}
      onOpenChange={setEndGameModalOpen}
      title={t('clueReveal.endGameModalTitle')}
      description={t('clueReveal.endGameConfirm')}
      confirmLabel={t('clueReveal.endGameHost')}
      cancelLabel={t('common.cancel')}
      variant="destructive"
      onConfirm={() => send({ type: 'END_GAME' })}
    />
    </Fragment>
  )
}
