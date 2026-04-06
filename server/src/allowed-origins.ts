/** Discord Activity proxy: page origin is `https://<CLIENT_ID>.discordsays.com`. */
const DISCORD_ACTIVITY_PROXY = /^https:\/\/[0-9]+\.discordsays\.com$/i

export function parseAllowedWebOrigins(raw: string | undefined): string[] {
  if (raw === undefined || typeof raw !== 'string' || !raw.trim()) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function discordActivityOriginsAllowed(raw: string | undefined): boolean {
  if (raw === undefined || raw === '') return true
  const v = raw.trim().toLowerCase()
  return v !== 'false' && v !== '0' && v !== 'no'
}

export function isWebSocketOriginAllowed(
  origin: string | null,
  allowedList: string[],
  allowDiscordActivityProxy: boolean
): boolean {
  if (allowedList.length === 0) return true
  const o = origin ?? ''
  if (!o) return false
  if (allowedList.includes(o)) return true
  if (allowDiscordActivityProxy && DISCORD_ACTIVITY_PROXY.test(o)) return true
  return false
}
