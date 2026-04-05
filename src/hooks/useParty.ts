import { useCallback, useEffect, useRef, useState } from 'react'
import PartySocket from 'partysocket'
import type { ClientMessage, GameState, RoomStats } from '../types/game'

const defaultStats = (): RoomStats => ({
  roundsCompleted: 0,
  crewWins: 0,
  imposterWins: 0,
})

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
    /* Show connecting immediately when the room or user changes; open/close handlers drive the rest. */
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
        setGameState({
          ...(g as GameState),
          stats: { ...defaultStats(), ...g.stats },
          hasCustomNextRound: g.hasCustomNextRound === true,
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
