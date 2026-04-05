import { createBrowserClient } from '@supabase/ssr'

function browserPublishableKey() {
  const e = import.meta.env
  return (
    e.VITE_SUPABASE_ANON_KEY?.trim() ||
    e.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim() ||
    e.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  )
}

export function createClient() {
  const key = browserPublishableKey()
  if (!key) throw new Error('Missing Supabase client key env var')
  return createBrowserClient(import.meta.env.VITE_SUPABASE_URL!, key)
}
