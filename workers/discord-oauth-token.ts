/**
 * Cloudflare Worker — Discord OAuth2 token exchange for Embedded App SDK.
 *
 * Deploy: `npx wrangler deploy` from repo root (see wrangler.toml).
 * Secrets: `wrangler secret put DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`
 *
 * Optional env: DISCORD_REDIRECT_URI
 *
 * Discord URL mapping: route `/api/token` (or your chosen path) to this worker.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
} as const

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...corsHeaders } })
    }

    const url = new URL(request.url)
    const isTokenPath =
      url.pathname === '/api/token' || url.pathname.endsWith('/api/token')

    if (!isTokenPath || request.method !== 'POST') {
      return new Response('Not found', { status: 404 })
    }

    const clientId = env.DISCORD_CLIENT_ID
    const clientSecret = env.DISCORD_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      return jsonWithCors({ error: 'Worker misconfigured' }, 503)
    }

    let body: { code?: string }
    try {
      body = (await request.json()) as { code?: string }
    } catch {
      return jsonWithCors({ error: 'Invalid JSON' }, 400)
    }

    if (!body.code) {
      return jsonWithCors({ error: 'Missing code' }, 400)
    }

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code: body.code,
    })
    if (env.DISCORD_REDIRECT_URI) {
      params.set('redirect_uri', env.DISCORD_REDIRECT_URI)
    }

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    const data = (await tokenRes.json()) as Record<string, unknown>
    if (!tokenRes.ok) {
      return jsonWithCors(data, tokenRes.status)
    }

    return jsonWithCors({ access_token: data.access_token }, 200)
  },
}

function jsonWithCors(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  })
}

interface Env {
  DISCORD_CLIENT_ID: string
  DISCORD_CLIENT_SECRET: string
  DISCORD_REDIRECT_URI?: string
}
