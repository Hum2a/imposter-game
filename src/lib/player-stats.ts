import { getSupabase } from '@/lib/supabase-client'

export type PlayerStatsSnapshot = {
  rounds_played: number
  wins_as_crew: number
  wins_as_imposter: number
  losses_as_crew: number
  losses_as_imposter: number
}

const EMPTY: PlayerStatsSnapshot = {
  rounds_played: 0,
  wins_as_crew: 0,
  wins_as_imposter: 0,
  losses_as_crew: 0,
  losses_as_imposter: 0,
}

/** Aggregates maintained by `player_rounds` insert trigger (`player_stats` table). */
export async function fetchPlayerStats(): Promise<PlayerStatsSnapshot> {
  const supabase = getSupabase()
  if (!supabase) return { ...EMPTY }

  const { data: sessionData } = await supabase.auth.getSession()
  const uid = sessionData.session?.user?.id
  if (!uid) return { ...EMPTY }

  const { data, error } = await supabase
    .from('player_stats')
    .select(
      'rounds_played, wins_as_crew, wins_as_imposter, losses_as_crew, losses_as_imposter'
    )
    .eq('user_id', uid)
    .maybeSingle()

  if (error) {
    console.warn('[player_stats]', error.message)
    return { ...EMPTY }
  }
  if (!data) return { ...EMPTY }
  return data as PlayerStatsSnapshot
}
