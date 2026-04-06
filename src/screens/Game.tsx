import { Fragment, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock } from 'lucide-react'

import { ConfirmModal } from '@/components/ConfirmModal'
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
import { sanitizeClueDraft } from '@/lib/clue-input'
import type { ClientMessage, Player } from '../types/game'
import type { AuthUserProps } from './types'

type GameProps = AuthUserProps & {
  me: Player
  isHost: boolean
  send: (msg: ClientMessage) => void
  partyErrorCode?: string | null
  onDismissPartyError?: () => void
}

export default function Game({
  gameState,
  me,
  isHost,
  send,
  partyErrorCode,
  onDismissPartyError,
}: GameProps) {
  const { t } = useTranslation()
  const [now, setNow] = useState(() => Date.now())
  const [draft, setDraft] = useState('')
  const [tabHidden, setTabHidden] = useState(
    () => typeof document !== 'undefined' && document.visibilityState === 'hidden'
  )
  const [endGameModalOpen, setEndGameModalOpen] = useState(false)

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
  const ends = gameState.clueEndsAt
  const remaining =
    ends != null ? Math.max(0, Math.ceil((ends - now) / 1000)) : null
  const submitted = gameState.cluesSubmitted?.[me.id] === true
  const strictClue = gameState.clueStrictWord === true
  const setClueDraft = (raw: string) => {
    setDraft(sanitizeClueDraft(raw, strictClue))
  }

  const submitClue = () => {
    if (submitted || draft.trim().length < 1) return
    onDismissPartyError?.()
    send({ type: 'SUBMIT_CLUE', text: draft })
  }

  const partyErr = (() => {
    switch (partyErrorCode) {
      case 'CLUE_PROFANITY':
        return t('game.clueProfanity')
      case 'INVALID_CLUE':
        return t('game.invalidClue')
      case 'CLUE_STRICT_REJECTED':
        return t('game.invalidClueStrict')
      default:
        return null
    }
  })()

  if (isSpectator) {
    return (
      <GameScreen className="text-center">
        <div className="flex flex-col items-center gap-2">
          <Badge variant="secondary">{t('game.clueWrite')}</Badge>
          <Badge variant="outline">{t('game.spectator')}</Badge>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">{t('game.watchingTitle')}</CardTitle>
            <CardDescription className="text-base">{t('game.watchingClueDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {remaining != null ? (
              <p className="text-sm text-muted-foreground">
                {t('game.clueTimerOther')}{' '}
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
    <Fragment>
    <GameScreen className="text-center">
      <div className="flex flex-col items-center gap-2">
        <Badge variant="secondary">{t('game.clueWrite')}</Badge>
        <Badge variant="outline" className="tabular-nums">
          {t('game.clueCycle', {
            current: gameState.clueCycle,
            max: gameState.gameSettings.maxClueRounds,
          })}
        </Badge>
        {remaining != null ? (
          <Badge
            variant="outline"
            className="gap-1.5 font-mono text-sm tabular-nums"
            aria-live="polite"
            aria-atomic="true"
          >
            <Clock className="size-3.5" aria-hidden />
            {t('game.clueTimeLeft')} {remaining}s
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

      {partyErr ? (
        <Alert variant="destructive" className="text-left">
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

      <Card className="overflow-hidden border-primary/25 bg-gradient-to-b from-card to-primary/5 shadow-md motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-300 motion-reduce:animate-none">
        <CardHeader>
          <CardTitle className="text-2xl sm:text-3xl">
            {me.isImposter ? t('game.yourWordImposter') : t('game.yourWord')}
          </CardTitle>
          <CardDescription className="text-base">
            {me.isImposter ? t('game.imposterClueBlurb') : t('game.crewClueBlurb')}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <div className="rounded-xl border border-primary/30 bg-primary/10 px-6 py-10">
            <p className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">{word}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="text-left">
        <CardHeader>
          <CardTitle className="text-lg">{t('game.submitClueTitle')}</CardTitle>
          <CardDescription>
            {t('game.submitClueDesc')}
            {strictClue ? (
              <span className="mt-1 block text-foreground/90">{t('game.clueStrictHint')}</span>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {submitted ? (
            <p className="text-sm font-medium text-primary">
              {t('game.clueSubmitted', { word: gameState.myClue ?? '…' })}
            </p>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="clue-input">{t('game.clueLabel')}</Label>
                <Input
                  id="clue-input"
                  value={draft}
                  onChange={(e) => setClueDraft(e.target.value)}
                  maxLength={40}
                  placeholder={t('game.cluePlaceholder')}
                  autoComplete="off"
                  disabled={submitted}
                  aria-label={t('game.clueLabel')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      submitClue()
                    }
                  }}
                />
              </div>
              <Button
                type="button"
                className="min-h-11 w-full sm:self-center sm:max-w-xs"
                disabled={submitted || draft.trim().length < 1}
                onClick={submitClue}
              >
                {t('game.submitClue')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {!isSpectator ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full sm:w-auto"
            onClick={() => send({ type: 'CALL_VOTE' })}
          >
            {t('game.callVote')}
          </Button>
          {isHost ? (
            <Button
              type="button"
              variant="destructive"
              className="min-h-11 w-full sm:w-auto"
              onClick={() => setEndGameModalOpen(true)}
            >
              {t('game.endGame')}
            </Button>
          ) : null}
        </div>
      ) : null}

      {tabHidden ? (
        <p className="text-center text-xs text-amber-700 dark:text-amber-400" role="status">
          {t('game.tabHidden')}
        </p>
      ) : null}
    </GameScreen>
    <ConfirmModal
      open={endGameModalOpen}
      onOpenChange={setEndGameModalOpen}
      title={t('game.endGameModalTitle')}
      description={t('game.endGameConfirm')}
      confirmLabel={t('game.endGame')}
      cancelLabel={t('common.cancel')}
      variant="destructive"
      onConfirm={() => send({ type: 'END_GAME' })}
    />
    </Fragment>
  )
}
