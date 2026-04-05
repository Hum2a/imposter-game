import { useState } from 'react'
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
import { trackEvent } from '../lib/analytics'

type VotingProps = AuthUserProps & {
  me: Player
  send: (msg: ClientMessage) => void
}

export default function Voting({ gameState, me, send }: VotingProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const players = Object.values(gameState.players)
  const isSpectator = me.isSpectator === true
  const votingPlayers = players.filter((p) => !p.isSpectator)
  const votedCount = votingPlayers.filter((p) => p.hasVoted).length

  const confirm = () => {
    if (!selected || me.hasVoted || isSpectator) return
    trackEvent('VoteSubmit')
    send({ type: 'CAST_VOTE', targetId: selected })
  }

  if (isSpectator) {
    return (
      <GameScreen>
        <Card>
          <CardHeader className="text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Badge variant="secondary">Voting</Badge>
              <Badge variant="outline">Spectator</Badge>
            </div>
            <CardTitle className="text-2xl">Watching the vote</CardTitle>
            <CardDescription>
              You can’t vote this round. Results will show on the reveal screen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              {votingPlayers.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <Avatar user={{ id: p.id, name: p.name, avatar: p.avatar }} size={36} />
                  <span className="font-medium text-foreground">{p.name}</span>
                  <span>— {p.hasVoted ? 'voted' : 'still thinking…'}</span>
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
      <Card>
        <CardHeader className="text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <Badge variant="secondary">Voting</Badge>
            <Badge variant="outline" className="tabular-nums">
              {votedCount}/{votingPlayers.length} voted
            </Badge>
          </div>
          <CardTitle id="voting-heading" className="text-2xl">
            Who is the imposter?
          </CardTitle>
          <CardDescription>
            Tap a player, then confirm. You can’t vote for yourself.
            {me.hasVoted ? ' Your vote is locked in.' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3"
            role="group"
            aria-labelledby="voting-heading"
          >
            {votingPlayers.map((p) => {
              const isSelf = p.id === me.id
              const isSelected = selected === p.id
              const label = isSelf
                ? `${p.name} — you cannot vote for yourself`
                : `Select ${p.name} to vote for`
              return (
                <Button
                  key={p.id}
                  type="button"
                  variant={isSelected ? 'default' : 'outline'}
                  disabled={me.hasVoted || isSelf}
                  aria-pressed={!isSelf && !me.hasVoted ? isSelected : undefined}
                  aria-label={label}
                  className="min-h-11 h-auto flex-col gap-2 py-4 font-normal motion-reduce:transition-none"
                  onClick={() => setSelected(p.id)}
                >
                  <Avatar user={{ id: p.id, name: p.name, avatar: p.avatar }} size={56} />
                  <span className="max-w-full truncate text-sm font-medium">{p.name}</span>
                  {isSelf ? (
                    <span className="text-xs text-muted-foreground">You</span>
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
                ? 'Vote already submitted'
                : selected
                  ? `Confirm vote for ${players.find((x) => x.id === selected)?.name ?? 'player'}`
                  : 'Confirm vote — select a player first'
            }
            onClick={confirm}
          >
            {me.hasVoted ? (
              <>
                <Check className="size-4" />
                Vote submitted
              </>
            ) : (
              'Confirm vote'
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
                <span>— {p.hasVoted ? 'voted' : 'still thinking…'}</span>
              </li>
            ))}
          </ul>
        </CardFooter>
      </Card>
    </GameScreen>
  )
}
