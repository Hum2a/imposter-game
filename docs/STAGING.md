# Staging environment (wave R0 / X7)

Use a **separate** Cloudflare Pages project (or preview deployments), Partykit project or dev host, and optionally a **second Discord application** so production players and URL mappings stay untouched.

## 1. Copy env files

```bash
cp .env.deploy.example .env.deploy.staging
# Fill staging-only values (Pages project name, Partykit host, Discord client id if using a second app).
```

Deploy using the staging file:

```bash
DEPLOY_ENV_FILE=.env.deploy.staging node scripts/deploy.mjs all
```

On Windows PowerShell:

```powershell
$env:DEPLOY_ENV_FILE=".env.deploy.staging"; node scripts/deploy.mjs all
```

`scripts/deploy.mjs` reads `DEPLOY_ENV_FILE` when set; default remains `.env.deploy`.

## 2. Suggested staging variables

| Variable | Notes |
|----------|--------|
| `CF_PAGES_PROJECT_NAME` | Different from production Pages project |
| `VITE_PARTYKIT_HOST` | Staging Partykit hostname (or dev party) |
| `VITE_DISCORD_CLIENT_ID` | Optional second Discord app for Activity testing |
| `VITE_DISCORD_TOKEN_URL` | Staging Worker `/api/token` URL if not same-origin |
| Worker / Partykit secrets | Match the staging Discord app and Partykit project |

## 3. Discord Developer Portal

- Either create a **duplicate application** for staging, or map Activity URL prefixes to a **preview** Pages hostname (e.g. `*.pages.dev` deployment).
- Keep production mappings on the production app only.

## 4. Analytics

Set `VITE_PLAUSIBLE_DOMAIN` in **staging** builds to a test domain or leave unset to avoid polluting production stats. See `.env.example` for Plausible keys.

## 5. Git

- Never commit `.env.deploy.staging` (gitignored via `.env.*`).
- Commit `.env.deploy.staging.example` as a template only (no secrets).
