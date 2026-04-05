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
import type { ClientMessage, GameState } from '../types/game'

type LobbyProps = {
  gameState: GameState
  send: (msg: ClientMessage) => void
  isHost: boolean
}

export default function Lobby({ gameState, send, isHost }: LobbyProps) {
  const players = Object.values(gameState.players)

  return (
    <GameScreen>
      <div className="flex flex-col items-center gap-4 sm:items-start">
        <img
          src="/logo.svg"
          alt="Imposter"
          className="h-auto w-full max-w-md"
          width={600}
          height={300}
          decoding="async"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Lobby</Badge>
            {isHost ? (
              <Badge className="bg-primary/15 text-primary hover:bg-primary/20">You are host</Badge>
            ) : null}
          </div>
          <CardTitle className="text-2xl">Waiting for players</CardTitle>
          <CardDescription>
            When everyone has joined, the host starts the round. You’ll get a word — or you’ll be
            the imposter with a different word.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Room record
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{gameState.stats.roundsCompleted} rounds</Badge>
            <Badge variant="outline">Crew {gameState.stats.crewWins}</Badge>
            <Badge variant="outline">Imposter {gameState.stats.imposterWins}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Players ({players.length})</CardTitle>
          <CardDescription>Who’s in this session right now.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {players.length === 0 ? (
            <p className="px-6 text-sm text-muted-foreground">No players yet…</p>
          ) : (
            <ul className="divide-y divide-border">
              {players.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-6 py-3">
                  <Avatar user={{ id: p.id, name: p.name, avatar: p.avatar }} size={40} />
                  <span className="font-medium text-foreground">{p.name}</span>
                  {p.id === gameState.hostId ? (
                    <Badge className="ml-auto shrink-0 bg-primary/15 text-primary">Host</Badge>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
        <Separator />
        <CardFooter className="flex-col gap-3 pt-6 sm:flex-row">
          {isHost ? (
            <>
              <Button
                type="button"
                className="w-full sm:w-auto"
                size="lg"
                disabled={players.length === 0}
                onClick={() => send({ type: 'START_GAME' })}
              >
                Start game
              </Button>
              <p className="text-center text-xs text-muted-foreground sm:text-left">
                Need at least one player (you) to begin.
              </p>
            </>
          ) : (
            <p className="w-full text-center text-sm text-muted-foreground sm:text-left">
              Only the host can start. Ask them to tap <strong>Start game</strong> when ready.
            </p>
          )}
        </CardFooter>
      </Card>
    </GameScreen>
  )
}
