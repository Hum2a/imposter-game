/** Server stores this in `votes` and `Player.votedFor` when the player votes to skip. */
export const VOTE_SKIP_VALUE = '__SKIP__' as const

export type Phase = 'lobby' | 'clue_write' | 'clue_reveal' | 'voting' | 'reveal'

export interface RoomStats {
  roundsCompleted: number
  crewWins: number
  imposterWins: number
}

export interface GameSettings {
  /** Seconds each player has to submit a clue word. */
  writeSeconds: number
  /** Clue write → reveal cycles before host Continue can force voting (last cycle). */
  maxClueRounds: number
  /** Seconds before non-voters auto-submit skip (voting phase). */
  voteSeconds: number
  /**
   * When true, each new clue cycle (after host continues from clue reveal) draws a new random
   * pair from the lobby word pack and re-picks the imposter. First cycle still uses custom or
   * initial random pair from game start. Skip-majority return to clues keeps the same pair.
   */
  newWordPairEachClueCycle: boolean
}

export type RevealReason = 'wrong_accusation' | 'caught_imposter' | null

export interface Player {
  id: string
  name: string
  avatar: string
  isImposter: boolean
  hasVoted: boolean
  /** Target player id, `VOTE_SKIP_VALUE` when skipping, or null. */
  votedFor: string | null
  eliminated: boolean
  /** Mid-round join: watches play; next lobby or round includes them as a full player. */
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
  /** Server deadline for clue submissions (clue_write only). */
  clueEndsAt: number | null
  /** Server deadline for casting votes (voting only); absent voters auto-skip. */
  voteEndsAt: number | null
  stats: RoomStats
  /** True when the host locked in a custom word pair for the next start (words are not broadcast). */
  hasCustomNextRound: boolean
  /** Curated pack used when there is no custom pair for the next round. */
  wordPackId: string
  gameSettings: GameSettings
  /** 1-based clue cycle within the current game (same word pair / imposter until NEXT_ROUND). */
  clueCycle: number
  /** Submitted clues after reveal (full map); empty during clue_write in broadcast. */
  revealedClues: Record<string, string>
  /** Suspicion marks per player id (clue_reveal+; unlimited bumps). */
  suspicion: Record<string, number>
  /** Why the round ended (reveal phase). */
  revealReason: RevealReason
  /** Bumps when a new voting session starts. */
  voteSession: number
  /**
   * Personalized: during clue_write, only this connection’s submitted clue (if any).
   * Omitted in other phases.
   */
  myClue?: string | null
  /** During clue_write, whether each player has submitted (no text). */
  cluesSubmitted?: Record<string, boolean>
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
  | { type: 'CAST_VOTE'; skip?: boolean; targetId?: string }
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
  /** Host only, lobby — clue timer length and cycles before final Continue → voting. */
  | {
      type: 'SET_GAME_SETTINGS'
      writeSeconds?: number
      maxClueRounds?: number
      voteSeconds?: number
      newWordPairEachClueCycle?: boolean
    }
  /** Non-spectator, clue_write — one submission per cycle (overwrite until deadline). */
  | { type: 'SUBMIT_CLUE'; text: string }
  /** Non-spectator, clue_reveal — increment suspicion on someone else’s clue. */
  | { type: 'BUMP_SUSPICION'; targetId: string }
  /** Host only — after clue_reveal: next clue cycle or go to voting on last cycle. */
  | { type: 'CONTINUE_CLUE_REVEAL' }
  /** Any player — jump to voting from clue_write or clue_reveal. */
  | { type: 'CALL_VOTE' }
  /** Non-spectator, clue_reveal — remove one suspicion mark from a target (min 0). */
  | { type: 'REDUCE_SUSPICION'; targetId: string }
