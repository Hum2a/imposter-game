/**
 * Cloudflare Worker — Discord OAuth2 token exchange + optional Partykit join JWT mint.
 *
 * Deploy: `npx wrangler deploy -c wrangler.worker.toml` from repo root.
 * Secrets: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `PARTYKIT_JWT_SECRET` (for `/api/party-jwt`)
 *
 * Discord URL mappings: `/api/token` and `/api/party-jwt` → this Worker (same host).
 */

import { mintPartyJoinJwt } from './party-jwt'

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
    const path = url.pathname
    const isTokenPath = path === '/api/token' || path.endsWith('/api/token')
    const isPartyJwtPath = path === '/api/party-jwt' || path.endsWith('/api/party-jwt')

    if (isPartyJwtPath && request.method === 'POST') {
      return handlePartyJwt(request, env)
    }

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

async function handlePartyJwt(request: Request, env: Env): Promise<Response> {
  const secret = env.PARTYKIT_JWT_SECRET
  if (!secret || secret.trim() === '') {
    return jsonWithCors({ error: 'party_jwt_not_configured' }, 503)
  }

  let body: { access_token?: string; accessToken?: string }
  try {
    body = (await request.json()) as { access_token?: string; accessToken?: string }
  } catch {
    return jsonWithCors({ error: 'Invalid JSON' }, 400)
  }

  const accessToken = body.access_token ?? body.accessToken
  if (!accessToken || typeof accessToken !== 'string') {
    return jsonWithCors({ error: 'Missing access_token' }, 400)
  }

  const jwt = await mintPartyJoinJwt(accessToken, secret)
  if (!jwt) {
    return jsonWithCors({ error: 'discord_token_invalid' }, 401)
  }

  return jsonWithCors({ party_jwt: jwt }, 200)
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
  PARTYKIT_JWT_SECRET?: string
}
