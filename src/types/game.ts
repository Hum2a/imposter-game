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
  /** Mid-round join: watches discussion/vote/reveal; next lobby or round includes them as a full player. */
  isSpectator?: boolean
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
  /** True when the host locked in a custom word pair for the next start (words are not broadcast). */
  hasCustomNextRound: boolean
  /** Curated pack used when there is no custom pair for the next round. */
  wordPackId: string
}

export type ClientMessage =
  | {
      type: 'JOIN'
      userId: string
      name: string
      avatar: string
      /** Required when Partykit `JOIN_VERIFY` is enabled */
      accessToken?: string
      /** Short-lived JWT from Worker when Partykit `JOIN_JWT_REQUIRED` is enabled */
      partyJwt?: string
    }
  | { type: 'START_GAME' }
  | { type: 'CAST_VOTE'; targetId: string }
  | { type: 'NEXT_ROUND' }
  | { type: 'BACK_TO_LOBBY' }
  | { type: 'END_GAME' }
  /** Host only, lobby only — words for the next round (1–40 chars each, must differ). */
  | { type: 'SET_NEXT_WORDS'; word: string; imposterWord: string }
  /** Host only — clear custom words and use random pairs again. */
  | { type: 'CLEAR_NEXT_WORDS' }
  /** Host only, lobby — which pack supplies random pairs and “roll from pack”. */
  | { type: 'SET_WORD_PACK'; packId: string }
  /** Host only, lobby — pick a random pair from the current pack as next custom words. */
  | { type: 'ROLL_PACK_PAIR' }
