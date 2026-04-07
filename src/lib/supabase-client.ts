import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

function normalizedSupabaseUrl(): string {
  const raw = import.meta.env.VITE_SUPABASE_URL
  if (raw == null || typeof raw !== 'string') return ''
  return raw.trim().replace(/\/+$/, '')
}

/** Legacy JWT anon key, or newer dashboard “publishable” keys (Supabase UI / shadcn). */
function getSupabasePublishableKey(): string | undefined {
  const env = import.meta.env
  return (
    env.VITE_SUPABASE_ANON_KEY?.trim() ||
    env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim() ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  )
}

export function isSupabaseConfigured(): boolean {
  const url = normalizedSupabaseUrl()
  const key = getSupabasePublishableKey()
  return Boolean(url && key)
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  if (client) return client
  const url = normalizedSupabaseUrl()
  const key = getSupabasePublishableKey()!
  client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  return client
}
