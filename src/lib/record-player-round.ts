import { getSupabase } from '@/lib/supabase-client'
import { recordPlayerUsageEvent, USAGE_EVENT_ROUND_RECORDED } from '@/lib/player-usage-events'
import type { RevealReason } from '@/types/game'

function storageKey(partyRoomId: string, roundIndex: number): string {
  return `imposter:round_saved:${partyRoomId}:${roundIndex}`
}

export type PlayerRoundRow = {
  id: string
  created_at: string
  round_index: number
  winner: string
  was_imposter: boolean
  voted_for: string | null
  party_room_id: string | null
  reveal_reason: string | null
  was_host: boolean | null
  player_count: number | null
  word_pack_id: string | null
  clue_cycle: number | null
  max_clue_rounds: number | null
  write_seconds: number | null
  vote_was_skip: boolean | null
  imposter_player_id: string | null
  imposter_display_name: string | null
  voted_target_name: string | null
  room_crew_wins: number | null
  room_imposter_wins: number | null
  room_rounds_completed: number | null
}

const ROUND_COLUMNS =
  'id, created_at, round_index, winner, was_imposter, voted_for, party_room_id, reveal_reason, was_host, player_count, word_pack_id, clue_cycle, max_clue_rounds, write_seconds, vote_was_skip, imposter_player_id, imposter_display_name, voted_target_name, room_crew_wins, room_imposter_wins, room_rounds_completed'

/** After reveal: one insert per room+round per tab (sessionStorage dedupe). */
export async function recordPlayerRoundIfNeeded(opts: {
  partyRoomId: string
  roundIndex: number
  winner: 'crew' | 'imposter' | null
  wasImposter: boolean
  votedFor: string | null
  revealReason: RevealReason
  wasHost: boolean
  playerCount: number
  wordPackId: string
  clueCycle: number
  maxClueRounds: number
  writeSeconds: number
  voteWasSkip: boolean
  imposterPlayerId: string | null
  imposterDisplayName: string | null
  votedTargetName: string | null
  roomCrewWins: number
  roomImposterWins: number
  roomRoundsCompleted: number
}): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return

  const { data: sessionData } = await supabase.auth.getSession()
  const uid = sessionData.session?.user?.id
  if (!uid) return

  try {
    if (sessionStorage.getItem(storageKey(opts.partyRoomId, opts.roundIndex))) return
  } catch {
    /* private mode */
  }

  const winner =
    opts.winner === 'crew' || opts.winner === 'imposter' ? opts.winner : 'none'
  const roomKey = opts.partyRoomId.slice(0, 120)
  const revealReason =
    opts.revealReason === 'wrong_accusation' || opts.revealReason === 'caught_imposter'
      ? opts.revealReason
      : null

  const packId = opts.wordPackId.trim().slice(0, 120) || null

  const { error } = await supabase.from('player_rounds').insert({
    user_id: uid,
    round_index: opts.roundIndex,
    winner,
    was_imposter: opts.wasImposter,
    voted_for: opts.votedFor,
    party_room_id: roomKey,
    reveal_reason: revealReason,
    was_host: opts.wasHost,
    player_count: opts.playerCount,
    word_pack_id: packId,
    clue_cycle: opts.clueCycle,
    max_clue_rounds: opts.maxClueRounds,
    write_seconds: opts.writeSeconds,
    vote_was_skip: opts.voteWasSkip,
    imposter_player_id: opts.imposterPlayerId,
    imposter_display_name: opts.imposterDisplayName,
    voted_target_name: opts.votedTargetName,
    room_crew_wins: opts.roomCrewWins,
    room_imposter_wins: opts.roomImposterWins,
    room_rounds_completed: opts.roomRoundsCompleted,
  })

  if (error) {
    console.warn('[player_rounds]', error.message)
    return
  }

  void recordPlayerUsageEvent(USAGE_EVENT_ROUND_RECORDED, {
    round_index: opts.roundIndex,
    winner,
    was_imposter: opts.wasImposter,
    party_room_id: roomKey,
  })

  try {
    sessionStorage.setItem(storageKey(opts.partyRoomId, opts.roundIndex), '1')
  } catch {
    /* ignore */
  }
}

export async function fetchRecentPlayerRounds(limit: number): Promise<PlayerRoundRow[]> {
  const { rows } = await fetchPlayerRoundsPage({ limit, offset: 0 })
  return rows
}

export async function fetchPlayerRoundsPage(opts: {
  limit: number
  offset: number
}): Promise<{ rows: PlayerRoundRow[]; hasMore: boolean }> {
  const supabase = getSupabase()
  if (!supabase) return { rows: [], hasMore: false }

  const { data: sessionData } = await supabase.auth.getSession()
  const uid = sessionData.session?.user?.id
  if (!uid) return { rows: [], hasMore: false }

  const fetchLimit = opts.limit + 1
  const { data, error } = await supabase
    .from('player_rounds')
    .select(ROUND_COLUMNS)
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .range(opts.offset, opts.offset + fetchLimit - 1)

  if (error) {
    console.warn('[player_rounds]', error.message)
    return { rows: [], hasMore: false }
  }

  const raw = (data ?? []) as PlayerRoundRow[]
  const hasMore = raw.length > opts.limit
  const rows = hasMore ? raw.slice(0, opts.limit) : raw
  return { rows, hasMore }
}
