import { getSupabase } from '@/lib/supabase-client'

/**
 * Record a lightweight usage event (same RLS as rounds). Safe to call from gameplay flows;
 * failures are logged only so games are never blocked.
 */
export async function recordPlayerUsageEvent(
  eventType: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return

  const { data: sessionData } = await supabase.auth.getSession()
  const uid = sessionData.session?.user?.id
  if (!uid) return

  const { error } = await supabase.from('player_usage_events').insert({
    user_id: uid,
    event_type: eventType.slice(0, 120),
    metadata,
  })

  if (error) {
    console.warn('[player_usage_events]', error.message)
  }
}
