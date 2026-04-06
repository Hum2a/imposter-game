/**
 * Compact Discord avatar token for web (Supabase user id ≠ Discord snowflake).
 * Stored as `d:${snowflake}:${hash}` so PartyKit `player.avatar` stays within length limits.
 */
export function parseDiscordLinkedAvatar(
  token: string | null | undefined
): { snowflake: string; hash: string } | null {
  if (!token?.startsWith('d:')) return null
  const rest = token.slice(2)
  const colon = rest.indexOf(':')
  if (colon <= 0) return null
  const snowflake = rest.slice(0, colon)
  const hash = rest.slice(colon + 1)
  if (!/^\d{5,32}$/.test(snowflake) || !hash || hash.length > 40) return null
  return { snowflake, hash }
}

export function discordLinkedAvatarUrl(
  snowflake: string,
  hash: string,
  size: number
): string {
  const ext = hash.startsWith('a_') ? 'gif' : 'png'
  return `https://cdn.discordapp.com/avatars/${snowflake}/${hash}.${ext}?size=${size}`
}
