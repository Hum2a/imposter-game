/** Labels for lobby UI — `id` values must match `server/src/word-packs.ts`. */

export const DEFAULT_WORD_PACK_ID = 'classic' as const

export const WORD_PACK_OPTIONS: { id: string; label: string; hint?: string }[] = [
  { id: 'classic', label: 'Classic mix', hint: 'Original default pairs' },
  { id: 'food', label: 'Food & drinks' },
  { id: 'nature', label: 'Nature' },
  { id: 'games', label: 'Games & sports' },
]

export function labelForWordPackId(id: string): string {
  return WORD_PACK_OPTIONS.find((p) => p.id === id)?.label ?? id
}
