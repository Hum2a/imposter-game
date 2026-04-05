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
  /** Legacy anon JWT from Project API settings */
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** Publishable key name used by Supabase UI / some shadcn snippets */
  readonly VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  /** Plausible Analytics domain (e.g. `imposter.example.com`). Omit to disable the script. */
  readonly VITE_PLAUSIBLE_DOMAIN?: string
  /** Override script URL (default `https://plausible.io/js/script.js`). */
  readonly VITE_PLAUSIBLE_SCRIPT_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
