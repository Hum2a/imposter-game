import { useCallback, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { GameScreen } from '../components/layout/GameScreen'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { buildWebInviteUrl, displayInviteCodeFromPartyRoomId } from '../lib/party-room'
import type { ClientMessage, GameState } from '../types/game'

type LobbyProps = {
  gameState: GameState
  send: (msg: ClientMessage) => void
  isHost: boolean
  partyRoomId: string
  webMode?: boolean
  isDiscordActivity?: boolean
  onJoinWebLobby?: (code: string) => void
  onCreateWebLobby?: () => void
  joinLobbyError?: string | null
  onDismissJoinLobbyError?: () => void
  discordLobbySuffix?: string
  onDiscordLobbySuffixChange?: (value: string) => void
  partyErrorCode?: string | null
  onDismissPartyError?: () => void
}

export default function Lobby({
  gameState,
  send,
  isHost,
  partyRoomId,
  webMode,
  isDiscordActivity,
  onJoinWebLobby,
  onCreateWebLobby,
  joinLobbyError,
  onDismissJoinLobbyError,
  discordLobbySuffix = '',
  onDiscordLobbySuffixChange,
  partyErrorCode,
  onDismissPartyError,
}: LobbyProps) {
  const players = Object.values(gameState.players)
  const [joinInput, setJoinInput] = useState('')
  const [copied, setCopied] = useState<'link' | 'code' | null>(null)
  const [crewWord, setCrewWord] = useState('')
  const [imposterWord, setImposterWord] = useState('')

  const webShareCode = partyRoomId.startsWith('lobby-')
    ? displayInviteCodeFromPartyRoomId(partyRoomId)
    : null
  const inviteUrl = webShareCode ? buildWebInviteUrl(webShareCode) : ''
  const discordExtraCode = displayInviteCodeFromPartyRoomId(partyRoomId)

  const copyText = useCallback(async (label: 'link' | 'code', text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      window.setTimeout(() => setCopied(null), 2000)
    } catch {
      setCopied(null)
    }
  }, [])

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
          {joinLobbyError ? (
            <Alert variant="destructive">
              <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                <span>{joinLobbyError}</span>
                {onDismissJoinLobbyError ? (
                  <Button type="button" variant="outline" size="sm" onClick={onDismissJoinLobbyError}>
                    Dismiss
                  </Button>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}

          {partyErrorCode === 'INVALID_NEXT_WORDS' ? (
            <Alert variant="destructive">
              <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Those words are not valid. Use two different words, 1–40 characters each (after
                  trimming).
                </span>
                {onDismissPartyError ? (
                  <Button type="button" variant="outline" size="sm" onClick={onDismissPartyError}>
                    Dismiss
                  </Button>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}

          {webMode ? (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Invite
              </p>
              {webShareCode ? (
                <>
                  <p className="text-2xl font-mono font-semibold tracking-wider text-foreground">
                    {webShareCode}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Friends can open this link or enter the code to join the same lobby.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => copyText('link', inviteUrl)}
                    >
                      {copied === 'link' ? 'Copied!' : 'Copy link'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyText('code', webShareCode)}
                    >
                      {copied === 'code' ? 'Copied!' : 'Copy code'}
                    </Button>
                    {onCreateWebLobby ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => {
                          if (
                            window.confirm(
                              'Start a new lobby? You will leave this room and join an empty one.'
                            )
                          ) {
                            onCreateWebLobby()
                          }
                        }}
                      >
                        New lobby
                      </Button>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground font-mono break-all">
                  Room: {partyRoomId}
                  <span className="mt-2 block font-sans text-xs">
                    Shareable codes use the <span className="font-mono">lobby-</span> format; open the
                    site from a normal link to get one.
                  </span>
                </p>
              )}
              {onJoinWebLobby ? (
                <form
                  className="flex flex-col gap-2 sm:flex-row sm:items-end pt-2 border-t border-border"
                  onSubmit={(e) => {
                    e.preventDefault()
                    onDismissJoinLobbyError?.()
                    onJoinWebLobby(joinInput)
                    setJoinInput('')
                  }}
                >
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="join-lobby-code">Join another lobby</Label>
                    <Input
                      id="join-lobby-code"
                      placeholder="Room code"
                      autoComplete="off"
                      value={joinInput}
                      onChange={(e) => {
                        setJoinInput(e.target.value)
                        if (joinLobbyError) onDismissJoinLobbyError?.()
                      }}
                    />
                  </div>
                  <Button type="submit" variant="default">
                    Join
                  </Button>
                </form>
              ) : null}
            </div>
          ) : null}

          {isDiscordActivity && onDiscordLobbySuffixChange ? (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Discord lobby
              </p>
              <p className="text-sm text-muted-foreground">
                By default everyone in this Activity instance shares one room. Set a room code (4+
                characters) so only friends who enter the same code join your game.
              </p>
              <div className="space-y-1.5 max-w-sm">
                <Label htmlFor="discord-room-code">Optional room code</Label>
                <Input
                  id="discord-room-code"
                  placeholder="e.g. FRIDAY"
                  autoComplete="off"
                  value={discordLobbySuffix}
                  onChange={(e) => onDiscordLobbySuffixChange(e.target.value)}
                />
              </div>
              {discordExtraCode ? (
                <p className="text-sm">
                  Active code:{' '}
                  <span className="font-mono font-medium">{discordExtraCode}</span>
                </p>
              ) : null}
            </div>
          ) : null}

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
                  <div className="ml-auto flex flex-wrap items-center justify-end gap-1">
                    {p.isSpectator ? (
                      <Badge variant="outline" className="shrink-0">
                        Spectator
                      </Badge>
                    ) : null}
                    {p.id === gameState.hostId ? (
                      <Badge className="shrink-0 bg-primary/15 text-primary">Host</Badge>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
        <Separator />
        <CardFooter className="flex-col gap-4 pt-6 sm:flex-row sm:flex-wrap">
          {isHost ? (
            <div className="w-full space-y-3 border-b border-border pb-4 sm:border-0 sm:pb-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Next round words (optional)
              </p>
              <p className="text-sm text-muted-foreground">
                Enter two different words and tap <strong>Use these next round</strong>, or use random
                pairs. Your choices stay secret until the round starts.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="crew-word">Crew word</Label>
                  <Input
                    id="crew-word"
                    value={crewWord}
                    onChange={(e) => setCrewWord(e.target.value)}
                    maxLength={40}
                    placeholder="e.g. Pizza"
                    autoComplete="off"
                    aria-label="Crew word for next round"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="imposter-word">Imposter word</Label>
                  <Input
                    id="imposter-word"
                    value={imposterWord}
                    onChange={(e) => setImposterWord(e.target.value)}
                    maxLength={40}
                    placeholder="e.g. Burger"
                    autoComplete="off"
                    aria-label="Imposter word for next round"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11 w-full sm:w-auto"
                  onClick={() =>
                    send({ type: 'SET_NEXT_WORDS', word: crewWord, imposterWord: imposterWord })
                  }
                >
                  Use these next round
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full sm:w-auto"
                  disabled={!gameState.hasCustomNextRound}
                  onClick={() => {
                    send({ type: 'CLEAR_NEXT_WORDS' })
                    setCrewWord('')
                    setImposterWord('')
                  }}
                >
                  Use random words
                </Button>
              </div>
            </div>
          ) : gameState.hasCustomNextRound ? (
            <p className="w-full text-sm text-muted-foreground">
              The host chose custom words for the next round.
            </p>
          ) : null}
          {isHost ? (
            <>
              <Button
                type="button"
                className="min-h-11 w-full sm:w-auto"
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
