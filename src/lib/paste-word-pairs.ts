const MAX_LEN = 40

/** First non-empty, non-# line split by comma, pipe, or tab → crew + imposter (trimmed, max 40 chars). */
export function parseFirstPastedPair(text: string): { crew: string; imposter: string } | null {
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const parts = t.split(/[,|\t]/).map((s) => s.trim()).filter(Boolean)
    if (parts.length >= 2) {
      return {
        crew: parts[0]!.slice(0, MAX_LEN),
        imposter: parts[1]!.slice(0, MAX_LEN),
      }
    }
  }
  return null
}
