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
    if (!partyHost) {
      throw new Error(
        '[vite] Cloudflare Pages: VITE_PARTYKIT_HOST is not set for this build. ' +
          'Dashboard → Workers & Pages → your project → Settings → Environment variables → add VITE_PARTYKIT_HOST for **Production** ' +
          '(Preview-only variables are not used for production deployments). Use your PartyKit hostname only (no https://). Then redeploy.'
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
