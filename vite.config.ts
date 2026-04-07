import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { discordTokenDevPlugin } from './vite-plugin-discord-token'

function effectiveViteEnv(name: string, fileEnv: Record<string, string>): string | undefined {
  if (process.env[name] !== undefined) return process.env[name]
  return fileEnv[name]
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  if (mode === 'production' && process.env.CF_PAGES === '1') {
    const partyHost = (effectiveViteEnv('VITE_PARTYKIT_HOST', env) ?? '').trim()
    const branch = process.env.CF_PAGES_BRANCH ?? '(unknown branch)'
    if (!partyHost) {
      console.error(
        '\n[vite] Cloudflare Pages build: VITE_PARTYKIT_HOST is missing or empty.\n' +
          `  Branch: ${branch}\n` +
          '  → Dashboard → Workers & Pages → your project → Settings → Environment variables\n' +
          '  → Add VITE_PARTYKIT_HOST for **Production** (production URL uses Production vars).\n' +
          '  → Add the same for **Preview** if you use preview deployments (PR/branch builds).\n' +
          '  → Hostname only, e.g. server.user.partykit.dev (no https://).\n'
      )
    }
  }

  return {
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
