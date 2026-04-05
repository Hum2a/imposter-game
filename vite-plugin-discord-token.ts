import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/**
 * Dev-only Discord OAuth2 token exchange. For production, use a Cloudflare Worker
 * (or other backend) with the same request/response shape: POST /api/token → { access_token }.
 */
export function discordTokenDevPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'discord-token-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? ''
        if (!url.startsWith('/api/token') || req.method !== 'POST') {
          next()
          return
        }

        const r = res as ServerResponse
        const clientId = env.DISCORD_CLIENT_ID || env.VITE_DISCORD_CLIENT_ID
        const clientSecret = env.DISCORD_CLIENT_SECRET

        if (!clientId || !clientSecret) {
          r.statusCode = 503
          r.setHeader('Content-Type', 'application/json')
          r.end(
            JSON.stringify({
              error:
                'Missing DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET (dev server env, not VITE_*)',
            })
          )
          return
        }

        try {
          const raw = await readBody(req as IncomingMessage)
          const body = raw ? JSON.parse(raw) : {}
          const code = body.code as string | undefined
          if (!code) {
            r.statusCode = 400
            r.setHeader('Content-Type', 'application/json')
            r.end(JSON.stringify({ error: 'Missing code' }))
            return
          }

          const params = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'authorization_code',
            code,
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
            r.statusCode = tokenRes.status
            r.setHeader('Content-Type', 'application/json')
            r.end(JSON.stringify(data))
            return
          }

          r.statusCode = 200
          r.setHeader('Content-Type', 'application/json')
          r.end(JSON.stringify({ access_token: data.access_token }))
        } catch (e) {
          r.statusCode = 500
          r.setHeader('Content-Type', 'application/json')
          r.end(
            JSON.stringify({
              error: e instanceof Error ? e.message : 'Token exchange failed',
            })
          )
        }
      })
    },
  }
}
