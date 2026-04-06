import { Fragment, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WORD_PACK_OPTIONS } from '../data/word-pack-options'
import { wordPackHint, wordPackLabel } from '@/lib/word-pack-i18n'
import { buildWebInviteUrl, displayInviteCodeFromPartyRoomId } from '../lib/party-room'
import { ConfirmModal } from '@/components/ConfirmModal'
import { SavedWordListsPanel } from '@/components/SavedWordListsPanel'
import { parseFirstPastedPair } from '../lib/paste-word-pairs'
import { cn } from '@/lib/utils'
import type { ClientMessage, GameState } from '../types/game'

type LobbyProps = {
  gameState: GameState
  send: (msg: ClientMessage) => void
  isHost: boolean
  partyRoomId: string
  webMode?: boolean
  isDiscordActivity?: boolean
  onJoinWebLobby?: (code: string) => void
  onCreateWebLobby?: (customCode?: string) => void
  joinLobbyError?: string | null
  onDismissJoinLobbyError?: () => void
  discordLobbySuffix?: string
  onDiscordLobbySuffixChange?: (value: string) => void
  partyErrorCode?: string | null
  onDismissPartyError?: () => void
  /** Web + Supabase cloud profile: save/load word lists to the user account */
  savedWordListsEnabled?: boolean
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
  savedWordListsEnabled = false,
}: LobbyProps) {
  const { t } = useTranslation()
  const players = Object.values(gameState.players)
  const [joinInput, setJoinInput] = useState('')
  const [customCreateCode, setCustomCreateCode] = useState('')
  const [copied, setCopied] = useState<'link' | 'code' | null>(null)
  const [crewWord, setCrewWord] = useState('')
  const [imposterWord, setImposterWord] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [pasteHint, setPasteHint] = useState<string | null>(null)
  const [newLobbyModalOpen, setNewLobbyModalOpen] = useState(false)

  const webShareCode = partyRoomId.startsWith('lobby-')
    ? displayInviteCodeFromPartyRoomId(partyRoomId)
    : null
  const inviteUrl = webShareCode ? buildWebInviteUrl(webShareCode) : ''
  const discordExtraCode = displayInviteCodeFromPartyRoomId(partyRoomId)
  const lobbyPartyErr = (() => {
    switch (partyErrorCode) {
      case 'INVALID_NEXT_WORDS':
        return t('lobby.invalidWords')
      case 'WORDS_PROFANITY':
        return t('lobby.profanity')
      case 'INVALID_WORD_PACK':
        return t('lobby.invalidPack')
      case 'EMPTY_WORD_PACK':
        return t('lobby.emptyPack')
      default:
        return null
    }
  })()

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
    <Fragment>
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
            <Badge variant="secondary">{t('lobby.badge')}</Badge>
            {isHost ? (
              <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
                {t('lobby.youAreHost')}
              </Badge>
            ) : null}
          </div>
          <CardTitle className="text-2xl">{t('lobby.waitingTitle')}</CardTitle>
          <CardDescription>{t('lobby.waitingDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {joinLobbyError ? (
            <Alert variant="destructive">
              <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                <span>{joinLobbyError}</span>
                {onDismissJoinLobbyError ? (
                  <Button type="button" variant="outline" size="sm" onClick={onDismissJoinLobbyError}>
                    {t('lobby.dismiss')}
                  </Button>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}

          {lobbyPartyErr ? (
            <Alert variant="destructive">
              <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                <span>{lobbyPartyErr}</span>
                {onDismissPartyError ? (
                  <Button type="button" variant="outline" size="sm" onClick={onDismissPartyError}>
                    {t('lobby.dismiss')}
                  </Button>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}

          {webMode ? (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('lobby.invite')}
              </p>
              {webShareCode ? (
                <>
                  <p className="text-2xl font-mono font-semibold tracking-wider text-foreground">
                    {webShareCode}
                  </p>
                  <p className="text-sm text-muted-foreground">{t('lobby.friendsBlurb')}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => copyText('link', inviteUrl)}
                    >
                      {copied === 'link' ? t('lobby.copied') : t('lobby.copyLink')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyText('code', webShareCode)}
                    >
                      {copied === 'code' ? t('lobby.copied') : t('lobby.copyCode')}
                    </Button>
                    {onCreateWebLobby ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => setNewLobbyModalOpen(true)}
                      >
                        {t('lobby.newRandomLobbyButton')}
                      </Button>
                    ) : null}
                  </div>
                  {onCreateWebLobby ? (
                    <div className="space-y-2 border-t border-border pt-3">
                      <p className="text-xs text-muted-foreground">{t('lobby.customRoomCodeHelp')}</p>
                      <div className="space-y-1.5">
                        <Label htmlFor="create-lobby-code">{t('lobby.customRoomCodeLabel')}</Label>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                          <Input
                            id="create-lobby-code"
                            placeholder={t('lobby.customRoomCodePlaceholder')}
                            autoComplete="off"
                            value={customCreateCode}
                            onChange={(e) => {
                              setCustomCreateCode(e.target.value)
                              if (joinLobbyError) onDismissJoinLobbyError?.()
                            }}
                            className="sm:max-w-xs"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="w-full shrink-0 sm:w-auto"
                            onClick={() => {
                              onDismissJoinLobbyError?.()
                              onCreateWebLobby(customCreateCode.trim())
                            }}
                          >
                            {t('lobby.createLobbyWithCode')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-muted-foreground font-mono break-all">
                  {t('lobby.roomPrefix')} {partyRoomId}
                  <span className="mt-2 block font-sans text-xs">{t('lobby.shareCodeHint')}</span>
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
                    <Label htmlFor="join-lobby-code">{t('lobby.joinAnother')}</Label>
                    <Input
                      id="join-lobby-code"
                      placeholder={t('lobby.joinCodePlaceholder')}
                      autoComplete="off"
                      value={joinInput}
                      onChange={(e) => {
                        setJoinInput(e.target.value)
                        if (joinLobbyError) onDismissJoinLobbyError?.()
                      }}
                    />
                  </div>
                  <Button type="submit" variant="default">
                    {t('lobby.join')}
                  </Button>
                </form>
              ) : null}
              {onCreateWebLobby && !webShareCode ? (
                <div className="space-y-3 border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">{t('lobby.customRoomCodeHelp')}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNewLobbyModalOpen(true)}
                    >
                      {t('lobby.newRandomLobbyButton')}
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="create-lobby-code-legacy">{t('lobby.customRoomCodeLabel')}</Label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <Input
                        id="create-lobby-code-legacy"
                        placeholder={t('lobby.customRoomCodePlaceholder')}
                        autoComplete="off"
                        value={customCreateCode}
                        onChange={(e) => {
                          setCustomCreateCode(e.target.value)
                          if (joinLobbyError) onDismissJoinLobbyError?.()
                        }}
                        className="sm:max-w-xs"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="w-full shrink-0 sm:w-auto"
                        onClick={() => {
                          onDismissJoinLobbyError?.()
                          onCreateWebLobby(customCreateCode.trim())
                        }}
                      >
                        {t('lobby.createLobbyWithCode')}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {isDiscordActivity && onDiscordLobbySuffixChange ? (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('lobby.discordLobby')}
              </p>
              <p className="text-sm text-muted-foreground">{t('lobby.discordLobbyHelp')}</p>
              <div className="space-y-1.5 max-w-sm">
                <Label htmlFor="discord-room-code">{t('lobby.discordRoomCode')}</Label>
                <Input
                  id="discord-room-code"
                  placeholder={t('lobby.discordRoomPlaceholder')}
                  autoComplete="off"
                  value={discordLobbySuffix}
                  onChange={(e) => onDiscordLobbySuffixChange(e.target.value)}
                />
              </div>
              {discordExtraCode ? (
                <p className="text-sm">
                  {t('lobby.activeCode')}{' '}
                  <span className="font-mono font-medium">{discordExtraCode}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('lobby.roomRecord')}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {t('lobby.roundsBadge', { count: gameState.stats.roundsCompleted })}
            </Badge>
            <Badge variant="outline">
              {t('lobby.crewWins', { count: gameState.stats.crewWins })}
            </Badge>
            <Badge variant="outline">
              {t('lobby.imposterWins', { count: gameState.stats.imposterWins })}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t('lobby.playersTitle', { count: players.length })}</CardTitle>
            <CardDescription>{t('lobby.playersDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {players.length === 0 ? (
              <p className="px-6 text-sm text-muted-foreground">{t('lobby.noPlayers')}</p>
            ) : (
              <ul className="divide-y divide-border">
                {players.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-6 py-3">
                    <Avatar user={{ id: p.id, name: p.name, avatar: p.avatar }} size={40} />
                    <span className="font-medium text-foreground">{p.name}</span>
                    <div className="ml-auto flex flex-wrap items-center justify-end gap-1">
                      {p.isSpectator ? (
                        <Badge variant="outline" className="shrink-0">
                          {t('lobby.spectator')}
                        </Badge>
                      ) : null}
                      {p.id === gameState.hostId ? (
                        <Badge className="shrink-0 bg-primary/15 text-primary">{t('lobby.host')}</Badge>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t('lobby.gameSettingsTitle')}</CardTitle>
            <CardDescription>{t('lobby.gameSettingsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 px-6 pt-0">
          {!isHost ? (
            <div className="w-full space-y-2 text-sm text-muted-foreground">
              {gameState.hasCustomNextRound ? (
                <p>{t('lobby.customWordsHost')}</p>
              ) : (
                <p>
                  {t('lobby.randomPackLabel', {
                    pack: wordPackLabel(gameState.wordPackId, t),
                  })}
                </p>
              )}
              {gameState.gameSettings.newWordPairEachClueCycle ? (
                <p className="text-xs">{t('lobby.newWordPairEachClueCycleGuestHint')}</p>
              ) : null}
              {gameState.gameSettings.rotateHostEachRound ? (
                <p className="text-xs">{t('lobby.rotateHostEachRoundGuestHint')}</p>
              ) : null}
            </div>
          ) : null}
          {isHost ? (
            <div className="w-full space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('lobby.wordPackSection')}
              </p>
              <p className="text-sm text-muted-foreground">{t('lobby.wordPackHelp')}</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Label htmlFor="word-pack">{t('lobby.packForRandom')}</Label>
                  <select
                    id="word-pack"
                    className={cn(
                      'h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 text-base text-foreground shadow-xs transition-[color,box-shadow] outline-none md:text-sm dark:bg-input/30',
                      'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'
                    )}
                    value={
                      WORD_PACK_OPTIONS.some((o) => o.id === gameState.wordPackId)
                        ? gameState.wordPackId
                        : WORD_PACK_OPTIONS[0]!.id
                    }
                    onChange={(e) => {
                      onDismissPartyError?.()
                      send({ type: 'SET_WORD_PACK', packId: e.target.value })
                    }}
                    aria-label={t('lobby.packSelectAria')}
                  >
                    {WORD_PACK_OPTIONS.map((o) => {
                      const label = wordPackLabel(o.id, t)
                      const hint = wordPackHint(o.id, t)
                      return (
                        <option key={o.id} value={o.id}>
                          {hint ? `${label} (${hint})` : label}
                        </option>
                      )
                    })}
                  </select>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11 w-full shrink-0 sm:w-auto"
                  onClick={() => {
                    onDismissPartyError?.()
                    send({ type: 'ROLL_PACK_PAIR' })
                  }}
                >
                  {t('lobby.randomFromPack')}
                </Button>
              </div>

              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground pt-1">
                {t('lobby.pasteSection')}
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="paste-pairs">{t('lobby.pasteLabel')}</Label>
                <textarea
                  id="paste-pairs"
                  rows={3}
                  placeholder={t('lobby.pastePlaceholder')}
                  className={cn(
                    'w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm dark:bg-input/30',
                    'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    'placeholder:text-muted-foreground disabled:opacity-50'
                  )}
                  value={pasteText}
                  onChange={(e) => {
                    setPasteText(e.target.value)
                    if (pasteHint) setPasteHint(null)
                  }}
                  aria-label={t('lobby.pasteAria')}
                />
                {pasteHint ? <p className="text-sm text-amber-600 dark:text-amber-500">{pasteHint}</p> : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11"
                  onClick={() => {
                    const p = parseFirstPastedPair(pasteText)
                    if (p) {
                      setCrewWord(p.crew)
                      setImposterWord(p.imposter)
                      setPasteHint(null)
                      onDismissPartyError?.()
                    } else {
                      setPasteHint(t('lobby.pasteHint'))
                    }
                  }}
                >
                  {t('lobby.loadFirstPair')}
                </Button>
              </div>

              {savedWordListsEnabled ? (
                <SavedWordListsPanel
                  pasteText={pasteText}
                  onPasteTextChange={setPasteText}
                  onLoadPairIntoFields={(crew, imposter) => {
                    setCrewWord(crew)
                    setImposterWord(imposter)
                    onDismissPartyError?.()
                  }}
                  onClearPasteHint={() => setPasteHint(null)}
                />
              ) : null}

              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground pt-2">
                {t('lobby.crewImposterSection')}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="crew-word">{t('lobby.crewWord')}</Label>
                  <Input
                    id="crew-word"
                    value={crewWord}
                    onChange={(e) => setCrewWord(e.target.value)}
                    maxLength={40}
                    placeholder={t('lobby.crewPlaceholder')}
                    autoComplete="off"
                    aria-label={t('lobby.crewWordAria')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="imposter-word">{t('lobby.imposterWord')}</Label>
                  <Input
                    id="imposter-word"
                    value={imposterWord}
                    onChange={(e) => setImposterWord(e.target.value)}
                    maxLength={40}
                    placeholder={t('lobby.imposterPlaceholder')}
                    autoComplete="off"
                    aria-label={t('lobby.imposterWordAria')}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11 w-full sm:w-auto"
                  onClick={() => {
                    onDismissPartyError?.()
                    send({ type: 'SET_NEXT_WORDS', word: crewWord, imposterWord: imposterWord })
                  }}
                >
                  {t('lobby.useThese')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full sm:w-auto"
                  disabled={!gameState.hasCustomNextRound}
                  onClick={() => {
                    onDismissPartyError?.()
                    send({ type: 'CLEAR_NEXT_WORDS' })
                    setCrewWord('')
                    setImposterWord('')
                  }}
                >
                  {t('lobby.useRandom')}
                </Button>
              </div>
            </div>
          ) : null}
          {isHost ? (
            <div className="w-full space-y-3 border-t border-border pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('lobby.gameRulesSection')}
              </p>
              <p className="text-sm text-muted-foreground">{t('lobby.gameRulesHelp')}</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="write-seconds">{t('lobby.writeSecondsLabel')}</Label>
                  <Input
                    id="write-seconds"
                    type="number"
                    min={10}
                    max={120}
                    key={`ws-${gameState.gameSettings.writeSeconds}`}
                    defaultValue={String(gameState.gameSettings.writeSeconds)}
                    className="tabular-nums"
                    onBlur={(e) => {
                      const v = parseInt(e.target.value, 10)
                      if (Number.isNaN(v)) return
                      onDismissPartyError?.()
                      send({ type: 'SET_GAME_SETTINGS', writeSeconds: v })
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="max-clue-rounds">{t('lobby.maxClueRoundsLabel')}</Label>
                  <Input
                    id="max-clue-rounds"
                    type="number"
                    min={1}
                    max={20}
                    key={`mr-${gameState.gameSettings.maxClueRounds}`}
                    defaultValue={String(gameState.gameSettings.maxClueRounds)}
                    className="tabular-nums"
                    onBlur={(e) => {
                      const v = parseInt(e.target.value, 10)
                      if (Number.isNaN(v)) return
                      onDismissPartyError?.()
                      send({ type: 'SET_GAME_SETTINGS', maxClueRounds: v })
                    }}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                  <Label htmlFor="vote-seconds">{t('lobby.voteSecondsLabel')}</Label>
                  <Input
                    id="vote-seconds"
                    type="number"
                    min={15}
                    max={180}
                    key={`vs-${gameState.gameSettings.voteSeconds}`}
                    defaultValue={String(gameState.gameSettings.voteSeconds)}
                    className="tabular-nums"
                    onBlur={(e) => {
                      const v = parseInt(e.target.value, 10)
                      if (Number.isNaN(v)) return
                      onDismissPartyError?.()
                      send({ type: 'SET_GAME_SETTINGS', voteSeconds: v })
                    }}
                  />
                </div>
              </div>
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/15 p-3 transition-colors hover:bg-muted/25'
                )}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary"
                  checked={gameState.gameSettings.newWordPairEachClueCycle}
                  onChange={(e) => {
                    onDismissPartyError?.()
                    send({
                      type: 'SET_GAME_SETTINGS',
                      newWordPairEachClueCycle: e.target.checked,
                    })
                  }}
                />
                <span className="min-w-0 space-y-1">
                  <span className="block text-sm font-medium text-foreground">
                    {t('lobby.newWordPairEachClueCycleLabel')}
                  </span>
                  <span className="block text-xs leading-snug text-muted-foreground">
                    {t('lobby.newWordPairEachClueCycleHelp')}
                  </span>
                </span>
              </label>
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/15 p-3 transition-colors hover:bg-muted/25'
                )}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary"
                  checked={gameState.gameSettings.rotateHostEachRound}
                  onChange={(e) => {
                    onDismissPartyError?.()
                    send({
                      type: 'SET_GAME_SETTINGS',
                      rotateHostEachRound: e.target.checked,
                    })
                  }}
                />
                <span className="min-w-0 space-y-1">
                  <span className="block text-sm font-medium text-foreground">
                    {t('lobby.rotateHostEachRoundLabel')}
                  </span>
                  <span className="block text-xs leading-snug text-muted-foreground">
                    {t('lobby.rotateHostEachRoundHelp')}
                  </span>
                </span>
              </label>
            </div>
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
                {t('lobby.startGame')}
              </Button>
              <p className="text-center text-xs text-muted-foreground sm:text-left">
                {t('lobby.startGameHint')}
              </p>
            </>
          ) : (
            <p className="w-full text-center text-sm text-muted-foreground sm:text-left">
              {t('lobby.onlyHost')}
            </p>
          )}
          </CardContent>
        </Card>
      </div>
    </GameScreen>
    {onCreateWebLobby ? (
      <ConfirmModal
        open={newLobbyModalOpen}
        onOpenChange={setNewLobbyModalOpen}
        title={t('lobby.newLobbyModalTitle')}
        description={t('lobby.newLobbyModalDesc')}
        confirmLabel={t('lobby.newLobbyConfirmAction')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          setCustomCreateCode('')
          onCreateWebLobby()
        }}
      />
    ) : null}
    </Fragment>
  )
}
