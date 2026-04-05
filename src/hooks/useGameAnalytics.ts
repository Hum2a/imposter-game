import { useEffect, useRef } from 'react'
import { trackEvent } from '../lib/analytics'
import type { GameState } from '../types/game'

/**
 * Fires coarse lifecycle events on **phase transitions** (avoids duplicate counts per round).
 * Only runs when the current user is in `gameState.players`.
 */
export function useGameAnalytics(gameState: GameState | null, userId: string | undefined) {
  const prevPhase = useRef<GameState['phase'] | null>(null)

  useEffect(() => {
    if (!gameState || !userId) return
    if (!gameState.players[userId]) return

    const p = gameState.phase
    const prev = prevPhase.current

    if (p === 'lobby' && prev !== 'lobby') {
      trackEvent('LobbyJoin')
    }
    if (p === 'discussion' && prev !== 'discussion') {
      trackEvent('RoundStart', { round: gameState.round })
    }
    if (p === 'reveal' && prev !== 'reveal') {
      trackEvent('RoundEnd', { outcome: gameState.winner ?? 'none' })
    }

    prevPhase.current = p
  }, [gameState, userId])
}
