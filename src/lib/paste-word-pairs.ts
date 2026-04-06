const MAX_LEN = 40

export type WordPair = { crew: string; imposter: string }

/** Same rules as PartyKit `normalizeWordPair`: non-empty, distinct (case-insensitive), max length. */
export function isValidWordPair(crew: string, imposter: string): boolean {
  const w = crew.trim().slice(0, MAX_LEN)
  const i = imposter.trim().slice(0, MAX_LEN)
  if (w.length < 1 || i.length < 1) return false
  if (w.toLowerCase() === i.toLowerCase()) return false
  return true
}

/** First non-empty, non-# line split by comma, pipe, or tab → crew + imposter (trimmed, max 40 chars). */
export function parseFirstPastedPair(text: string): WordPair | null {
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const parts = t.split(/[,|\t]/).map((s) => s.trim()).filter(Boolean)
    if (parts.length >= 2) {
      const crew = parts[0]!.slice(0, MAX_LEN)
      const imposter = parts[1]!.slice(0, MAX_LEN)
      if (!isValidWordPair(crew, imposter)) continue
      return { crew: crew.trim(), imposter: imposter.trim() }
    }
  }
  return null
}

/** All valid pairs from pasted lines (same line format as `parseFirstPastedPair`). */
export function parseAllPastedPairs(text: string): WordPair[] {
  const out: WordPair[] = []
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const parts = t.split(/[,|\t]/).map((s) => s.trim()).filter(Boolean)
    if (parts.length >= 2) {
      const crew = parts[0]!.slice(0, MAX_LEN)
      const imposter = parts[1]!.slice(0, MAX_LEN)
      if (isValidWordPair(crew, imposter)) {
        out.push({ crew: crew.trim(), imposter: imposter.trim() })
      }
    }
  }
  return out
}

/** Serialize pairs for the paste textarea (one pair per line). */
export function formatPairsForPaste(pairs: WordPair[]): string {
  return pairs.map((p) => `${p.crew}, ${p.imposter}`).join('\n')
}
