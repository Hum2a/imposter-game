import { useCallback, useEffect, useRef, useState } from 'react'
import PartySocket from 'partysocket'
import type { ClientMessage, GameState, RoomStats } from '../types/game'

const defaultStats = (): RoomStats => ({
  roundsCompleted: 0,
  crewWins: 0,
  imposterWins: 0,
})

export function useParty(roomId: string | undefined, userId: string | undefined) {
  const socketRef = useRef<PartySocket | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)

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

    ws.onmessage = (e: MessageEvent<string>) => {
      try {
        const raw = JSON.parse(e.data) as Record<string, unknown>
        if (raw.type === 'ERROR') {
          console.warn('[party]', raw)
          return
        }
        const g = raw as Partial<GameState>
        if (typeof g.phase !== 'string') return
        setGameState({
          ...(g as GameState),
          stats: { ...defaultStats(), ...g.stats },
        })
      } catch {
        /* ignore */
      }
    }

    return () => {
      ws.close()
      socketRef.current = null
    }
  }, [roomId, userId])

  const send = useCallback((msg: ClientMessage) => {
    socketRef.current?.send(JSON.stringify(msg))
  }, [])

  return { gameState, send }
}
