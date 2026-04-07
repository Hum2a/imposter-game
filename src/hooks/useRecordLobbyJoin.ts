import { useEffect, useRef } from 'react'

import { recordPlayerUsageEvent, USAGE_EVENT_LOBBY_JOINED } from '@/lib/player-usage-events'
import type { GameState } from '@/types/game'

/**
 * Once per (party room, user) while connected, records a cloud usage event when the player appears
 * in game state (after JOIN is accepted). No-ops without Supabase session.
 */
export function useRecordLobbyJoin({
  partyRoomId,
  userId,
  gameState,
}: {
  partyRoomId: string | undefined
  userId: string | undefined
  gameState: GameState | null
}) {
  const recordedKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!partyRoomId || !userId || !gameState) return
    const me = gameState.players[userId]
    if (!me) return

    const key = `${partyRoomId}:${userId}`
    if (recordedKeyRef.current === key) return
    recordedKeyRef.current = key

    void recordPlayerUsageEvent(USAGE_EVENT_LOBBY_JOINED, {
      party_room_id: partyRoomId.slice(0, 120),
      phase: gameState.phase,
      is_spectator: me.isSpectator === true,
    })
  }, [partyRoomId, userId, gameState])
}
