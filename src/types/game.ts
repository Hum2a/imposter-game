export type Phase = 'lobby' | 'discussion' | 'voting' | 'reveal'

export interface RoomStats {
  roundsCompleted: number
  crewWins: number
  imposterWins: number
}

export interface Player {
  id: string
  name: string
  avatar: string
  isImposter: boolean
  hasVoted: boolean
  votedFor: string | null
  eliminated: boolean
}

export interface GameState {
  phase: Phase
  players: Record<string, Player>
  hostId: string
  word: string
  imposterWord: string
  votes: Record<string, string>
  round: number
  winner: 'crew' | 'imposter' | null
  discussionEndsAt: number | null
  stats: RoomStats
}

export type ClientMessage =
  | {
      type: 'JOIN'
      userId: string
      name: string
      avatar: string
      /** Required when Partykit `JOIN_VERIFY` is enabled */
      accessToken?: string
    }
  | { type: 'START_GAME' }
  | { type: 'CAST_VOTE'; targetId: string }
  | { type: 'NEXT_ROUND' }
  | { type: 'BACK_TO_LOBBY' }
  | { type: 'END_GAME' }
