/**
 * `VITE_PARTYKIT_HOST` should be hostname only, e.g. `server.user.partykit.dev` or `localhost:1999`.
 * PartySocket chooses `wss://` vs `ws://` itself — a leading `https://` breaks the WebSocket URL.
 * This normalizes values from Cloudflare / copy-paste that include a scheme.
 */
export function normalizedPartyKitHost(): string {
  const raw = import.meta.env.VITE_PARTYKIT_HOST
  if (raw == null || typeof raw !== 'string') return ''
  const t = raw.trim()
  if (!t) return ''
  return t.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
}
