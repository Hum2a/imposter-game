import { useCallback, useEffect, useRef, useState } from 'react'
import PartySocket from 'partysocket'
import type { ClientMessage, GameState } from '../types/game'

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
        setGameState(JSON.parse(e.data) as GameState)
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
