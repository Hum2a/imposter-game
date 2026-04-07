import { defineConfig, devices } from '@playwright/test'

/** Non-empty or default — `??` misses `""`, which would bake an empty PartyKit host and trap e2e on “game server not configured”. */
function e2eEnv(name: string, fallback: string): string {
  const v = process.env[name]
  if (v == null) return fallback
  const t = v.trim()
  return t === '' ? fallback : t
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  /** Default 30s is shorter than several expects (120s); slow cold builds + PartyKit need headroom. */
  timeout: 120_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: process.env.CI
      ? 'npx vite preview --host 127.0.0.1 --port 4173 --strictPort'
      : 'npm run build && npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      VITE_DISCORD_CLIENT_ID: e2eEnv('VITE_DISCORD_CLIENT_ID', '0'),
      VITE_DISCORD_MOCK: '1',
      VITE_PARTYKIT_HOST: e2eEnv('VITE_PARTYKIT_HOST', '127.0.0.1:1999'),
      VITE_DISCORD_TOKEN_URL: e2eEnv(
        'VITE_DISCORD_TOKEN_URL',
        'https://example.com/api/token'
      ),
    },
  },
})
