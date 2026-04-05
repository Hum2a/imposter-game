/**
 * Lightweight token check when PartyKit env `WORD_PROFANITY_FILTER=true`.
 * Extend `EXTRA_BLOCK` for your community; keep family-friendly defaults minimal.
 */

const EXTRA_BLOCK: string[] = [
  /* Add lowercase whole-word tokens here if needed */
]

/**
 * Default token blocklist (lowercase). Not exhaustive — extend `EXTRA_BLOCK` or replace with a
 * dedicated list for production moderation.
 */
const BASE_BLOCK: string[] = [
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'dick',
  'cock',
  'piss',
  'cunt',
  'slut',
  'whore',
  'retard',
  ...EXTRA_BLOCK,
]

const BLOCK = new Set(BASE_BLOCK)

function tokens(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9']+/g) ?? []).map((t) => t.replace(/^'+|'+$/g, ''))
}

export function textFailsProfanityFilter(s: string): boolean {
  const t = tokens(s)
  return t.some((w) => BLOCK.has(w))
}

export function pairFailsProfanityFilter(word: string, imposterWord: string): boolean {
  return textFailsProfanityFilter(word) || textFailsProfanityFilter(imposterWord)
}
