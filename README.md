# Imposter (Discord Activity)

Real-time “imposter” word game for [Discord Activities](https://discord.com/developers/docs/activities/overview): React + Vite client, [Partykit](https://partykit.io/) game server, Discord Embedded App SDK, and a small Cloudflare Worker for OAuth token exchange.

## Prerequisites

- Node.js **20+**
- A [Discord application](https://discord.com/developers/applications) with **Activities** enabled
- [Cloudflare](https://dash.cloudflare.com/) account (Pages + Workers)
- [Partykit](https://partykit.io/) account (CLI login for deploy)

## Local development

```bash
npm install
cd server && npm install && cd ..
```

Copy `.env.example` to `.env` and fill in values (see below).

Terminal 1 — Partykit:

```bash
cd server && npm run dev
```

Terminal 2 — Vite (from repo root):

```bash
npm run dev
```

Outside Discord, the app detects a normal browser and uses a **dev user** stored in `sessionStorage`. Set `VITE_DISCORD_MOCK=1` if you want a fixed mock user and room.

For Discord auth in dev, add `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` to `.env` so the Vite dev server can handle `POST /api/token`.

## Environment variables

| Variable | Where | Purpose |
|----------|--------|---------|
| `VITE_DISCORD_CLIENT_ID` | Client / Pages build | Discord application ID (public) |
| `VITE_PARTYKIT_HOST` | Client / Pages build | Partykit host, e.g. `localhost:1999` or `your-project.yourname.partykit.dev` |
| `VITE_DISCORD_TOKEN_URL` | Client / Pages build | Full URL of token Worker `POST` for **browser / PWA**. **Inside Discord Activity** the app always uses mapped **`/api/token`** (set URL mappings in the portal). |
| `VITE_DISCORD_MOCK` | Optional | Set to `1` to force mock user + room |
| `DISCORD_CLIENT_ID` | Vite dev only | Same as app ID; used by dev token plugin |
| `DISCORD_CLIENT_SECRET` | Vite dev only | **Never** expose as `VITE_*` |
| `DISCORD_REDIRECT_URI` | Worker / dev | Only if Discord requires it for your OAuth setup |
| `VITE_PLAUSIBLE_DOMAIN` | Optional | Enables [Plausible](https://plausible.io/) script + custom events (`AppOpen`, `LobbyJoin`, `RoundStart`, `VoteSubmit`, `RoundEnd`, `ClientError`). Leave unset for no third-party analytics. |
| `VITE_PLAUSIBLE_SCRIPT_URL` | Optional | Override Plausible script URL (self-hosted installs). |

### Staging (non-production)

Use a separate Pages project / Partykit host / Discord app so prod URL mappings stay stable. Copy [`.env.deploy.staging.example`](.env.deploy.staging.example) to **`.env.deploy.staging`** (gitignored) and deploy with:

`DEPLOY_ENV_FILE=.env.deploy.staging node scripts/deploy.mjs all`

Details: [docs/STAGING.md](docs/STAGING.md).

### Discussion timer (server)

During the **discussion** phase, the Partykit room **re-broadcasts** full state about every **25 seconds** so clients refresh `discussionEndsAt` after tab backgrounding or minor clock skew. The phase still flips to voting when the server timer fires.

---

## Deployment (recommended order)

Do these once; then point Discord at your production URLs (or a tunnel while testing).

### 0. One-command deploy (from repo root)

1. Copy [`.env.deploy.example`](.env.deploy.example) to **`.env.deploy`** (gitignored). Fill `CF_PAGES_PROJECT_NAME`, all `VITE_*` values for production, `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`, `JOIN_VERIFY`, and optional `PARTYKIT_DEPLOY_NAME` / `DISCORD_REDIRECT_URI`.
2. Log in once: `npx wrangler login` and `cd server && npx partykit login`.
3. Run **`npm run deploy`** (or `npm run deploy:all`). This script:
   - Pushes **`DISCORD_CLIENT_ID`** and **`DISCORD_CLIENT_SECRET`** to the Worker (`wrangler secret put`, non-interactive), then **`wrangler deploy`**
   - Deploys Partykit with **`JOIN_VERIFY`** from the file (`partykit deploy --var …`)
   - Builds the Vite app with the same env merged in, then **`wrangler pages deploy dist`**

Granular commands: **`npm run deploy:sync`** (Worker secrets only), **`npm run deploy:worker`**, **`npm run deploy:partykit`**, **`npm run deploy:pages`**.

**Note:** `VITE_*` variables are **build-time** for the static client; they are applied when `deploy:pages` / `deploy` runs `npm run build`, not via `wrangler pages secret` (those secrets are for Pages Functions only).

### 1. Discord Developer Portal

1. Open your application → **OAuth2** → copy **Client ID** and create a **Client Secret** (store only in Worker secrets / local `.env`, not in git).
2. Under **Activities**, enable the feature and note settings for URL mappings (next steps).
3. For production, you will map:
   - **Root** → your static app URL (e.g. Cloudflare Pages).
   - **`/api/token`** (or your chosen path) → your token Worker URL (see step 2).

### 2. Cloudflare Worker (Discord token exchange)

From the **repo root** (where `wrangler.toml` lives):

```bash
npx wrangler deploy
```

Set secrets (prompts interactively):

```bash
npx wrangler secret put DISCORD_CLIENT_ID
npx wrangler secret put DISCORD_CLIENT_SECRET
```

Optional: `DISCORD_REDIRECT_URI` in the Worker dashboard if your OAuth flow needs it.

After deploy, Wrangler prints a URL such as `https://imposter-discord-oauth.<account>.workers.dev`. Your client must POST to:

`https://…workers.dev/api/token`

Set **`VITE_DISCORD_TOKEN_URL`** to that full URL in Cloudflare Pages (step 4), unless you proxy `/api/token` on the same origin as the app.

### 3. Partykit (game server)

```bash
cd server
npx partykit login   # first time only
npm run deploy       # or: npx partykit deploy
```

Note the production host (e.g. `something.username.partykit.dev`). Set **`VITE_PARTYKIT_HOST`** in Pages to that host **without** a protocol (same format as local: `host:port` or hostname).

### 4. Cloudflare Pages (frontend)

1. Connect this GitHub repo to **Cloudflare Pages**.
2. **Build command:** `npm run build`
3. **Build output directory:** `dist`
4. **Root directory:** `/` (repository root)
5. Add **environment variables** for production builds:
   - `VITE_DISCORD_CLIENT_ID`
   - `VITE_PARTYKIT_HOST` (Partykit production host)
   - `VITE_DISCORD_TOKEN_URL` (Worker `/api/token` URL unless same-origin)

Redeploy Pages when env vars change (they are baked in at build time).

### 5. Discord URL mappings & testing

1. In the Developer Portal, set **URL mappings** for your Activity to your **Pages** URL.
2. Map **`/api/token`** to your Worker URL (or ensure `VITE_DISCORD_TOKEN_URL` matches what you expose).
3. Join a voice channel, launch the Activity, and test with two accounts.

For local testing through Discord, use **cloudflared** or **ngrok** on port `5173` and temporary URL mappings, as in your project plan.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run dev:party` | Partykit dev (`server/`) |
| `npm run build` | Production client build |
| `npm run lint` | ESLint |
| `npm run deploy` / `deploy:all` | Worker secrets + deploy → Partykit → Pages build + deploy (uses `.env.deploy`) |
| `npm run deploy:sync` | Push Worker secrets only from `.env.deploy` |
| `npm run deploy:worker` | Sync secrets + `wrangler deploy` |
| `npm run deploy:partykit` | `partykit deploy` with `JOIN_VERIFY` from `.env.deploy` |
| `npm run deploy:pages` | Build with `.env.deploy` merged + `wrangler pages deploy` |
| `npm run deploy:token-worker` | Same as `deploy:worker` |
| `npm run assets:brand` | Regenerate `public/*.png` from `logo.svg` / `favicon.svg` (requires `sharp`) |

## Security

- Do **not** commit `.env`, **`.env.deploy`**, or client secrets. Use `.env.example` and `.env.deploy.example` as templates only.
- The Worker holds `DISCORD_CLIENT_SECRET`. The browser only ever sees `VITE_*` and the short-lived user token from Discord after exchange.

### Optional: verify `JOIN` with Discord

In `server/partykit.json`, set `"JOIN_VERIFY": "true"` under `vars` (or override in the Partykit dashboard when deployed). The client then sends `accessToken` on `JOIN`; the room checks `GET https://discord.com/api/v10/users/@me` matches `userId`. Turn this on for production if you want a basic guard against spoofed user IDs (still not as strong as your own signed session tokens).

## Website auth & optional Supabase

When the app runs **outside** Discord (normal browser):

1. **Default (guest):** stable `localStorage` user id + display name — no account, no Supabase calls until you opt in.
2. **Optional cloud:** with Supabase configured, use **Save progress online** (anonymous auth) or **Sign in with Discord** (OAuth via Supabase Auth) for a stable user id and `web_profiles` row. **Play as guest only** signs out of Supabase and returns to the local id.
3. **Discord Activity** is unchanged (Embedded SDK + Worker token exchange).

Env: `VITE_SUPABASE_URL` and a client key (`VITE_SUPABASE_ANON_KEY` or publishable keys). Enable **Anonymous sign-ins** for cloud backup; enable the **Discord** provider in Supabase for web Discord login (set redirect URLs). Run `supabase/migrations/001_web_profiles.sql` and `002_web_profiles_discord_link.sql`.

Do **not** send Supabase JWTs as `accessToken` on `JOIN` — `JOIN_VERIFY` expects a **Discord** OAuth token only.

Cursor agents: see `.cursor/rules/` for architecture and auth notes.

## After deploy

- **[docs/LAUNCH_PLAN.md](docs/LAUNCH_PLAN.md)** — step-by-step plan from now until launch (phases A–H, test matrix, commands), plus **product backlog** (lobby invites, multi-lobby UX, host transfer, polish).
- [docs/POST_LAUNCH.md](docs/POST_LAUNCH.md) — shorter verification and follow-up checklist.

## License

Add a `LICENSE` file when you publish the repo (e.g. MIT), or keep the project private.
