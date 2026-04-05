import { getSupabase } from '@/lib/supabase-client'

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
}

/** After reveal: one insert per room+round per tab (sessionStorage dedupe). */
export async function recordPlayerRoundIfNeeded(opts: {
  partyRoomId: string
  roundIndex: number
  winner: 'crew' | 'imposter' | null
  wasImposter: boolean
  votedFor: string | null
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

  const { error } = await supabase.from('player_rounds').insert({
    user_id: uid,
    round_index: opts.roundIndex,
    winner,
    was_imposter: opts.wasImposter,
    voted_for: opts.votedFor,
    party_room_id: roomKey,
  })

  if (error) {
    console.warn('[player_rounds]', error.message)
    return
  }

  try {
    sessionStorage.setItem(storageKey(opts.partyRoomId, opts.roundIndex), '1')
  } catch {
    /* ignore */
  }
}

export async function fetchRecentPlayerRounds(limit: number): Promise<PlayerRoundRow[]> {
  const supabase = getSupabase()
  if (!supabase) return []

  const { data: sessionData } = await supabase.auth.getSession()
  const uid = sessionData.session?.user?.id
  if (!uid) return []

  const { data, error } = await supabase
    .from('player_rounds')
    .select('id, created_at, round_index, winner, was_imposter, voted_for, party_room_id')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.warn('[player_rounds]', error.message)
    return []
  }
  return (data ?? []) as PlayerRoundRow[]
}
