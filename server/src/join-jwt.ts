/** Verify HS256 Party join JWT (must match Worker `PARTYKIT_JWT_SECRET`). */

function base64UrlToUint8Array(b64url: string): Uint8Array {
  const pad = '='.repeat((4 - (b64url.length % 4)) % 4)
  const base64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + pad
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export async function verifyPartyJoinJwt(
  token: string,
  secret: string,
  expectedUserId: string
): Promise<boolean> {
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [h, p, sigB64] = parts
  if (!h || !p || !sigB64) return false

  const data = new TextEncoder().encode(`${h}.${p}`)
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )

  let sig: Uint8Array
  try {
    sig = base64UrlToUint8Array(sigB64)
  } catch {
    return false
  }

  const ok = await crypto.subtle.verify('HMAC', key, new Uint8Array(sig), data)
  if (!ok) return false

  let payload: { sub?: unknown; exp?: unknown }
  try {
    const json = new TextDecoder().decode(base64UrlToUint8Array(p))
    payload = JSON.parse(json) as { sub?: unknown; exp?: unknown }
  } catch {
    return false
  }

  if (typeof payload.sub !== 'string' || payload.sub !== expectedUserId) return false
  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return false

  return true
}
