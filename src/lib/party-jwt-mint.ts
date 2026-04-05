import { isDiscordActivity } from '@/lib/discord-context'

/** Same Worker as token exchange; Discord Activity should map `/api/party-jwt` → Worker. */
export function partyJwtMintUrl(): string {
  if (isDiscordActivity()) {
    return '/api/party-jwt'
  }
  const configured = import.meta.env.VITE_DISCORD_TOKEN_URL?.trim()
  if (configured) {
    try {
      const u = new URL(configured)
      u.pathname = u.pathname.replace(/\/api\/token\/?$/i, '/api/party-jwt')
      if (!u.pathname.endsWith('/api/party-jwt')) {
        u.pathname = u.pathname.replace(/\/$/, '') + '/api/party-jwt'
      }
      return u.toString()
    } catch {
      /* fall through */
    }
  }
  return '/api/party-jwt'
}

export function usePartyJoinJwtEnabled(): boolean {
  const v = import.meta.env.VITE_USE_PARTY_JWT
  return v === '1' || v === 'true'
}

export async function fetchPartyJoinJwt(accessToken: string): Promise<string | null> {
  const res = await fetch(partyJwtMintUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: accessToken }),
  })
  if (!res.ok) return null
  const j = (await res.json()) as { party_jwt?: string }
  return typeof j.party_jwt === 'string' ? j.party_jwt : null
}
