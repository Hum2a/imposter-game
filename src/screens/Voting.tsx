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

type VotingProps = AuthUserProps & {
  me: Player
  send: (msg: ClientMessage) => void
}

export default function Voting({ gameState, me, send }: VotingProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const players = Object.values(gameState.players)
  const votedCount = players.filter((p) => p.hasVoted).length

  const confirm = () => {
    if (!selected || me.hasVoted) return
    send({ type: 'CAST_VOTE', targetId: selected })
  }

  return (
    <GameScreen>
      <Card>
        <CardHeader className="text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <Badge variant="secondary">Voting</Badge>
            <Badge variant="outline" className="tabular-nums">
              {votedCount}/{players.length} voted
            </Badge>
          </div>
          <CardTitle className="text-2xl">Who is the imposter?</CardTitle>
          <CardDescription>
            Tap a player, then confirm. You can’t vote for yourself.
            {me.hasVoted ? ' Your vote is locked in.' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {players.map((p) => {
              const isSelf = p.id === me.id
              const isSelected = selected === p.id
              return (
                <Button
                  key={p.id}
                  type="button"
                  variant={isSelected ? 'default' : 'outline'}
                  disabled={me.hasVoted || isSelf}
                  className="h-auto flex-col gap-2 py-4 font-normal"
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
            className="w-full sm:max-w-xs sm:self-center"
            disabled={!selected || me.hasVoted}
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
            {players.map((p) => (
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
