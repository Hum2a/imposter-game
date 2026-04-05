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
| `VITE_DISCORD_TOKEN_URL` | Client / Pages build | Full URL of token Worker `POST` (see deploy). Omit to use same-origin `/api/token` |
| `VITE_DISCORD_MOCK` | Optional | Set to `1` to force mock user + room |
| `DISCORD_CLIENT_ID` | Vite dev only | Same as app ID; used by dev token plugin |
| `DISCORD_CLIENT_SECRET` | Vite dev only | **Never** expose as `VITE_*` |
| `DISCORD_REDIRECT_URI` | Worker / dev | Only if Discord requires it for your OAuth setup |

---

## Deployment (recommended order)

Do these once; then point Discord at your production URLs (or a tunnel while testing).

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
| `npm run deploy:token-worker` | `wrangler deploy` |

## Security

- Do **not** commit `.env` or client secrets. This repo ignores `.env`; use `.env.example` as a template only.
- The Worker holds `DISCORD_CLIENT_SECRET`. The browser only ever sees `VITE_*` and the short-lived user token from Discord after exchange.

## License

Add a `LICENSE` file when you publish the repo (e.g. MIT), or keep the project private.
