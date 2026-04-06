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
    if (p === 'clue_write' && prev !== 'clue_write') {
      if (prev === 'lobby' || prev === 'reveal') {
        trackEvent('RoundStart', { round: gameState.round })
      }
      if (prev === 'voting') {
        trackEvent('VoteSkipMajority', { round: gameState.round })
      }
      if (prev === 'clue_reveal') {
        trackEvent('ClueCycleStart', { round: gameState.round, cycle: gameState.clueCycle })
      }
    }
    if (p === 'clue_reveal' && prev !== 'clue_reveal') {
      trackEvent('ClueReveal', { round: gameState.round, cycle: gameState.clueCycle })
    }
    if (p === 'voting' && prev !== 'voting') {
      trackEvent('VotingStart', { round: gameState.round })
    }
    if (p === 'reveal' && prev !== 'reveal') {
      trackEvent('RoundEnd', { outcome: gameState.winner ?? 'none' })
    }

    prevPhase.current = p
  }, [gameState, userId])
}
