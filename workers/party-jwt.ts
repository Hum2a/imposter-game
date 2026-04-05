/**
 * Mint short-lived HS256 JWTs for Partykit JOIN (sub = Discord user id).
 * Secret must match Partykit env JOIN_JWT_SECRET.
 */

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function utf8JsonToBase64Url(obj: unknown): string {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(obj)))
}

async function hs256Sign(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return bytesToBase64Url(new Uint8Array(sig))
}

async function verifyDiscordAccessToken(accessToken: string): Promise<string | null> {
  const res = await fetch('https://discord.com/api/v10/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return null
  const u = (await res.json()) as { id?: string }
  return typeof u.id === 'string' ? u.id : null
}

export async function mintPartyJoinJwt(accessToken: string, secret: string): Promise<string | null> {
  const sub = await verifyDiscordAccessToken(accessToken)
  if (!sub) return null

  const now = Math.floor(Date.now() / 1000)
  const exp = now + 600
  const header = utf8JsonToBase64Url({ alg: 'HS256', typ: 'JWT' })
  const payload = utf8JsonToBase64Url({ sub, iat: now, exp })
  const signingInput = `${header}.${payload}`
  const sig = await hs256Sign(signingInput, secret)
  return `${signingInput}.${sig}`
}
