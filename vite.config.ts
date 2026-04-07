import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { discordTokenDevPlugin } from './vite-plugin-discord-token'

/** Trim, strip wrapping quotes, strip scheme/slashes — same intent as `normalizedPartyKitHost()`. */
function normalizePartyKitHostInput(raw: string | undefined): string {
  if (raw == null) return ''
  let t = String(raw).trim()
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim()
  }
  return t.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
}

/**
 * Single source of truth for what gets baked as `import.meta.env.VITE_PARTYKIT_HOST`.
 * Explicit `define` avoids cases where Rolldown/Vite env injection misses `process.env` on CI (e.g. some Pages builds).
 */
function coalescePartyKitHostForEmbed(fileEnv: Record<string, string>): string {
  const candidates = [
    process.env.VITE_PARTYKIT_HOST,
    process.env.VITE_PARTY_KIT_HOST,
    fileEnv.VITE_PARTYKIT_HOST,
    fileEnv.VITE_PARTY_KIT_HOST,
  ]
  for (const c of candidates) {
    const v = normalizePartyKitHostInput(c)
    if (v !== '') return v
  }
  return ''
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const embeddedPartyKitHost = coalescePartyKitHostForEmbed(env)

  if (mode === 'production') {
    console.log(
      `[imposter-build] VITE_PARTYKIT_HOST → client bundle: ${embeddedPartyKitHost ? `yes (${embeddedPartyKitHost.length} chars)` : 'MISSING'}`
    )
  }

  if (mode === 'production' && process.env.CF_PAGES === '1') {
    const branch = process.env.CF_PAGES_BRANCH ?? '(unknown branch)'
    if (!embeddedPartyKitHost) {
      console.error(
        '\n[vite] Cloudflare Pages build: VITE_PARTYKIT_HOST is missing or empty after coalesce.\n' +
          `  Branch: ${branch}\n` +
          '  If the build log shows `Build environment variables: (none found)` from wrangler.toml, dashboard Variables\n' +
          '  usually do NOT reach `npm run build`. Add `[vars]` in **wrangler.toml** (see file comments) or run\n' +
          '  `npx wrangler pages download config` to sync. Replace YOUR_* placeholders with your real public values.\n' +
          '  Otherwise: Dashboard → Workers & Pages → Settings → Environment variables → Production + Preview.\n' +
          '  Hostname only, e.g. server.user.partykit.dev (no https://). No quotes.\n'
      )
    }
  }

  return {
    define: {
      'import.meta.env.VITE_PARTYKIT_HOST': JSON.stringify(embeddedPartyKitHost),
    },
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), './src'),
      },
    },
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
    plugins: [
      tailwindcss(),
      discordTokenDevPlugin(env),
      react(),
      babel({ presets: [reactCompilerPreset()] }),
    ],
  }
})
