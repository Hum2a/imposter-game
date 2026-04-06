import { getSupabase } from '@/lib/supabase-client'
import type { WordPair } from '@/lib/paste-word-pairs'

const MAX_LISTS_PER_USER = 40
const MAX_PAIRS_PER_LIST = 500

export type SavedWordListRow = {
  id: string
  user_id: string
  name: string
  pairs: WordPair[]
  created_at: string
  updated_at: string
}

function normalizePairs(raw: unknown): WordPair[] {
  if (!Array.isArray(raw)) return []
  const out: WordPair[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const crew = (row as { crew?: unknown }).crew
    const imposter = (row as { imposter?: unknown }).imposter
    if (typeof crew !== 'string' || typeof imposter !== 'string') continue
    out.push({ crew, imposter })
    if (out.length >= MAX_PAIRS_PER_LIST) break
  }
  return out
}

export async function fetchSavedWordLists(): Promise<SavedWordListRow[]> {
  const supabase = getSupabase()
  if (!supabase) return []

  const { data: sessionData } = await supabase.auth.getSession()
  const uid = sessionData.session?.user?.id
  if (!uid) return []

  const { data, error } = await supabase
    .from('saved_word_lists')
    .select('id, user_id, name, pairs, created_at, updated_at')
    .eq('user_id', uid)
    .order('updated_at', { ascending: false })

  if (error) {
    console.warn('[saved_word_lists]', error.message)
    return []
  }

  return (data ?? []).map((row) => ({
    ...row,
    pairs: normalizePairs(row.pairs),
  })) as SavedWordListRow[]
}

export async function countSavedWordLists(): Promise<number> {
  const supabase = getSupabase()
  if (!supabase) return 0

  const { data: sessionData } = await supabase.auth.getSession()
  const uid = sessionData.session?.user?.id
  if (!uid) return 0

  const { count, error } = await supabase
    .from('saved_word_lists')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', uid)

  if (error) {
    console.warn('[saved_word_lists]', error.message)
    return 0
  }
  return count ?? 0
}

export async function insertSavedWordList(
  name: string,
  pairs: WordPair[]
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const trimmedName = name.trim().slice(0, 120)
  if (!trimmedName) return { ok: false, error: 'empty_name' }

  const clipped = pairs.slice(0, MAX_PAIRS_PER_LIST)
  if (clipped.length === 0) return { ok: false, error: 'no_pairs' }

  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'no_supabase' }

  const { data: sessionData } = await supabase.auth.getSession()
  const uid = sessionData.session?.user?.id
  if (!uid) return { ok: false, error: 'no_session' }

  const n = await countSavedWordLists()
  if (n >= MAX_LISTS_PER_USER) return { ok: false, error: 'limit_lists' }

  const { data, error } = await supabase
    .from('saved_word_lists')
    .insert({
      user_id: uid,
      name: trimmedName,
      pairs: clipped,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.warn('[saved_word_lists]', error.message)
    return { ok: false, error: 'db_error' }
  }
  if (!data?.id) return { ok: false, error: 'db_error' }
  return { ok: true, id: data.id as string }
}

export async function deleteSavedWordList(id: string): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false

  const { data: sessionData } = await supabase.auth.getSession()
  const uid = sessionData.session?.user?.id
  if (!uid) return false

  const { error } = await supabase.from('saved_word_lists').delete().eq('id', id).eq('user_id', uid)

  if (error) {
    console.warn('[saved_word_lists]', error.message)
    return false
  }
  return true
}

export function randomPairFromList(pairs: WordPair[]): WordPair | null {
  if (pairs.length === 0) return null
  return pairs[Math.floor(Math.random() * pairs.length)]!
}

export { MAX_PAIRS_PER_LIST, MAX_LISTS_PER_USER }
