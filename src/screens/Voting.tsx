import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, CircleDot } from 'lucide-react'

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
import type { Player } from '../types/game'
import type { AuthUserProps } from './types'
import type { ClientMessage } from '../types/game'
import { useSfx } from '../sfx/use-sfx'
import { lightVoteHaptic } from '../lib/haptics'
import { trackEvent } from '../lib/analytics'

type VotingProps = AuthUserProps & {
  me: Player
  send: (msg: ClientMessage) => void
}

export default function Voting({ gameState, me, send }: VotingProps) {
  const { t } = useTranslation()
  const { play } = useSfx()
  const [selected, setSelected] = useState<string | null>(null)
  const players = Object.values(gameState.players)
  const isSpectator = me.isSpectator === true
  const votingPlayers = players.filter((p) => !p.isSpectator)
  const votedCount = votingPlayers.filter((p) => p.hasVoted).length

  const confirm = () => {
    if (!selected || me.hasVoted || isSpectator) return
    trackEvent('VoteSubmit')
    play('vote')
    lightVoteHaptic()
    send({ type: 'CAST_VOTE', targetId: selected })
  }

  if (isSpectator) {
    return (
      <GameScreen>
        <Card className="transition-shadow duration-200 motion-reduce:transition-none">
          <CardHeader className="text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Badge variant="secondary">{t('voting.voting')}</Badge>
              <Badge variant="outline">{t('voting.spectator')}</Badge>
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
                  <span>
                    — {p.hasVoted ? t('voting.voted') : t('voting.thinking')}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </GameScreen>
    )
  }

  return (
    <GameScreen>
      <Card className="transition-shadow duration-200 motion-reduce:transition-none">
        <CardHeader className="text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <Badge variant="secondary">{t('voting.voting')}</Badge>
            <Badge variant="outline" className="tabular-nums">
              {t('voting.countVoted', { count: votedCount, total: votingPlayers.length })}
            </Badge>
          </div>
          <CardTitle id="voting-heading" className="text-2xl">
            {t('voting.whoImposter')}
          </CardTitle>
          <CardDescription>
            {t('voting.instructions')}
            {me.hasVoted ? t('voting.voteLocked') : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                <span>
                  — {p.hasVoted ? t('voting.voted') : t('voting.thinking')}
                </span>
              </li>
            ))}
          </ul>
        </CardFooter>
      </Card>
    </GameScreen>
  )
}
