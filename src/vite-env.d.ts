/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DISCORD_CLIENT_ID: string
  readonly VITE_PARTYKIT_HOST: string
  /**
   * Full URL for POST token exchange (e.g. https://your-worker.workers.dev/api/token).
   * If unset, uses same-origin /api/token (Vite dev plugin or reverse proxy).
   */
  readonly VITE_DISCORD_TOKEN_URL?: string
  /** Set to "1" to force fixed mock user + room (overrides browser auto-dev). */
  readonly VITE_DISCORD_MOCK?: string
  /** Optional: Supabase project URL for website anonymous auth + web_profiles */
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
