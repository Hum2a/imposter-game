/** Match server `CLUE_STRICT_WORD` / `\p{L}+` clue validation for draft input. */
export function sanitizeClueDraft(
  raw: string,
  strictLettersOnly: boolean,
  maxLen = 40
): string {
  let s = raw.replace(/\s/g, '').slice(0, maxLen)
  if (strictLettersOnly) {
    s = s.replace(/[^\p{L}]/gu, '')
  }
  return s
}
