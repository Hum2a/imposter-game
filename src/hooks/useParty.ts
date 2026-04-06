import { useCallback, useEffect, useRef, useState } from 'react'
import PartySocket from 'partysocket'
import { DEFAULT_WORD_PACK_ID } from '../data/word-pack-options'
import type { ClientMessage, GameSettings, GameState, RoomStats } from '../types/game'

const defaultStats = (): RoomStats => ({
  roundsCompleted: 0,
  crewWins: 0,
  imposterWins: 0,
})

const defaultGameSettings = (): GameSettings => ({
  writeSeconds: 20,
  maxClueRounds: 5,
  voteSeconds: 90,
})

function mergeGameSettings(raw: unknown): GameSettings {
  const d = defaultGameSettings()
  if (!raw || typeof raw !== 'object') return d
  const g = raw as Record<string, unknown>
  const ws = g.writeSeconds
  const mr = g.maxClueRounds
  const vs = g.voteSeconds
  return {
    writeSeconds:
      typeof ws === 'number' && Number.isFinite(ws) ? Math.min(120, Math.max(10, Math.round(ws))) : d.writeSeconds,
    maxClueRounds:
      typeof mr === 'number' && Number.isFinite(mr) ? Math.min(20, Math.max(1, Math.round(mr))) : d.maxClueRounds,
    voteSeconds:
      typeof vs === 'number' && Number.isFinite(vs) ? Math.min(180, Math.max(15, Math.round(vs))) : d.voteSeconds,
  }
}

export type PartyConnectionState = 'idle' | 'connecting' | 'open' | 'closed'

export function useParty(roomId: string | undefined, userId: string | undefined) {
  const socketRef = useRef<PartySocket | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [socketPhase, setSocketPhase] = useState<'connecting' | 'open' | 'closed'>('connecting')
  const [socketOpenNonce, setSocketOpenNonce] = useState(0)
  const [partyErrorCode, setPartyErrorCode] = useState<string | null>(null)

  const connection: PartyConnectionState =
    roomId && userId ? socketPhase : 'idle'

  useEffect(() => {
    if (!roomId || !userId) return

    const host = import.meta.env.VITE_PARTYKIT_HOST
    if (!host) {
      console.warn('VITE_PARTYKIT_HOST is not set')
      return
    }

    const ws = new PartySocket({
      host,
      room: roomId,
    })

    socketRef.current = ws
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- PartySocket lifecycle; must reset phase before async open */
    setSocketPhase('connecting')
    setPartyErrorCode(null)

    const onOpen = () => {
      setSocketPhase('open')
      setSocketOpenNonce((n) => n + 1)
    }
    const onClose = () => {
      setSocketPhase('closed')
    }

    ws.addEventListener('open', onOpen)
    ws.addEventListener('close', onClose)

    ws.onmessage = (e: MessageEvent<string>) => {
      try {
        const raw = JSON.parse(e.data) as Record<string, unknown>
        if (raw.type === 'ERROR') {
          const code = typeof raw.code === 'string' ? raw.code : 'UNKNOWN'
          setPartyErrorCode(code)
          console.warn('[party]', raw)
          return
        }
        const g = raw as Partial<GameState>
        if (typeof g.phase !== 'string') return
        setPartyErrorCode(null)

        const rr = g.revealReason
        const revealReason =
          rr === 'wrong_accusation' || rr === 'caught_imposter' ? rr : null

        const clueEndsAt =
          g.clueEndsAt === null || typeof g.clueEndsAt === 'number' ? g.clueEndsAt : null
        const voteEndsAt =
          g.voteEndsAt === null || typeof g.voteEndsAt === 'number' ? g.voteEndsAt : null

        setGameState({
          ...(g as GameState),
          stats: { ...defaultStats(), ...g.stats },
          hasCustomNextRound: g.hasCustomNextRound === true,
          wordPackId:
            typeof g.wordPackId === 'string' && g.wordPackId.length > 0
              ? g.wordPackId
              : DEFAULT_WORD_PACK_ID,
          gameSettings: mergeGameSettings(g.gameSettings),
          clueCycle: typeof g.clueCycle === 'number' && g.clueCycle >= 1 ? g.clueCycle : 1,
          clueEndsAt,
          voteEndsAt,
          revealedClues:
            g.revealedClues && typeof g.revealedClues === 'object'
              ? (g.revealedClues as Record<string, string>)
              : {},
          suspicion:
            g.suspicion && typeof g.suspicion === 'object'
              ? (g.suspicion as Record<string, number>)
              : {},
          revealReason,
          voteSession: typeof g.voteSession === 'number' && g.voteSession >= 0 ? g.voteSession : 0,
          myClue:
            g.myClue === null || typeof g.myClue === 'string' ? g.myClue : undefined,
          cluesSubmitted:
            g.cluesSubmitted && typeof g.cluesSubmitted === 'object'
              ? (g.cluesSubmitted as Record<string, boolean>)
              : undefined,
        })
      } catch {
        /* ignore */
      }
    }

    return () => {
      ws.removeEventListener('open', onOpen)
      ws.removeEventListener('close', onClose)
      ws.close()
      socketRef.current = null
    }
  }, [roomId, userId])

  const send = useCallback((msg: ClientMessage) => {
    socketRef.current?.send(JSON.stringify(msg))
  }, [])

  const clearPartyError = useCallback(() => setPartyErrorCode(null), [])

  return { gameState, send, connection, socketOpenNonce, partyErrorCode, clearPartyError }
}
