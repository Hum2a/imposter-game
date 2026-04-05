/** Query param for shareable web lobby codes (`?room=ABCD12`). */
export const PARTY_ROOM_QUERY = 'room'

const DISCORD_LOBBY_SUFFIX_KEY = 'imposter-discord-lobby-suffix'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * Normalizes user input to A–Z / 2–9 only. Returns null if length is outside 4–16.
 */
export function normalizeLobbyCode(raw: string): string | null {
  const s = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (s.length < 4 || s.length > 16) return null
  return s
}

export function generateLobbyCode(length = 6): string {
  let out = ''
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined
  if (cryptoObj?.getRandomValues) {
    const buf = new Uint8Array(length)
    cryptoObj.getRandomValues(buf)
    for (let i = 0; i < length; i++) {
      out += CODE_CHARS[buf[i]! % CODE_CHARS.length]
    }
    return out
  }
  for (let i = 0; i < length; i++) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return out
}

/** PartyKit room id for a web lobby (after code is normalized). */
export function partyRoomIdFromNormalizedCode(normalized: string): string {
  return `lobby-${normalized}`
}

/** Human/shareable code from a web `lobby-*` id, or Discord `base__SUFFIX` suffix. */
export function displayInviteCodeFromPartyRoomId(id: string): string | null {
  if (id.startsWith('lobby-')) {
    const inner = id.slice(6)
    return normalizeLobbyCode(inner) ? inner : null
  }
  const idx = id.indexOf('__')
  if (idx !== -1 && idx < id.length - 2) {
    const suf = id.slice(idx + 2)
    return normalizeLobbyCode(suf) ? suf : null
  }
  return null
}

export function buildDiscordPartyRoomId(
  base: string,
  suffix: string | null | undefined
): string {
  const n = suffix?.trim() ? normalizeLobbyCode(suffix) : null
  if (!n) return base
  return `${base}__${n}`
}

export function readDiscordLobbySuffix(): string {
  if (typeof sessionStorage === 'undefined') return ''
  try {
    return sessionStorage.getItem(DISCORD_LOBBY_SUFFIX_KEY)?.trim() ?? ''
  } catch {
    return ''
  }
}

export function writeDiscordLobbySuffix(s: string): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    const t = s.trim().toUpperCase()
    if (!t) sessionStorage.removeItem(DISCORD_LOBBY_SUFFIX_KEY)
    else sessionStorage.setItem(DISCORD_LOBBY_SUFFIX_KEY, t)
  } catch {
    /* private mode */
  }
}

export function syncWebUrlToLobbyCode(normalizedCode: string): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.set(PARTY_ROOM_QUERY, normalizedCode)
  window.history.replaceState({}, '', url.toString())
}

/** Full invite URL for the current origin/path and lobby code. */
export function buildWebInviteUrl(normalizedCode: string): string {
  if (typeof window === 'undefined') return ''
  const url = new URL(window.location.href)
  url.searchParams.set(PARTY_ROOM_QUERY, normalizedCode)
  return url.toString()
}
