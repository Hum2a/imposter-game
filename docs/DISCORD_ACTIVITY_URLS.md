# Discord Developer Portal — URLs & Activity setup

Use this alongside [README.md](../README.md) (Discord URL mappings, OAuth2, Worker).

## Fields in the Discord application settings

### Interactions Endpoint URL

**Usually leave this empty** for this project.

- It is for a **Discord bot** that receives [slash commands / components](https://discord.com/developers/docs/interactions/receiving-and-responding) via **HTTP POST** instead of the Gateway.
- **Imposter** uses the **Embedded App SDK** inside Discord’s iframe and your **Worker** (`/api/token`) for OAuth code exchange — not the Interactions endpoint.
- Fill this only if you add a separate bot with an HTTP interactions server.

### Linked Roles Verification URL

**Usually leave this empty.**

- Used for [Linked Roles](https://discord.com/developers/docs/tutorials/configuring-app-metadata-for-linked-roles): members verify an external account to earn a linked role.
- Not required to ship or play the Activity.

### Terms of Service URL

After you deploy the web client (e.g. Cloudflare Pages), set:

`https://<your-production-domain>/terms`

Examples:

- `https://imposter-game.pages.dev/terms` (if that’s your Pages hostname)
- `https://yourdomain.com/terms` (if you use a custom domain on Pages)

Open the URL in a browser once to confirm it loads before pasting into Discord.

### Privacy Policy URL

Same pattern:

`https://<your-production-domain>/privacy`

---

## What else to configure for the Activity

1. **Activities** — Enable the Activity for your application; set URL mappings so the **root** loads your Pages URL and **`/api/token`** (or your path) points at the Worker (see README §1–2).
2. **OAuth2 → Redirects** — Add Supabase and any web auth redirect URLs you use; add Worker/discord flows as documented in README.
3. **Bot** — Only if you need bot features; not mandatory for Embedded App auth via SDK + Worker.

---

## Local testing of legal pages

With `npm run dev`, open:

- [http://localhost:5173/terms](http://localhost:5173/terms)
- [http://localhost:5173/privacy](http://localhost:5173/privacy)

Production uses `public/_redirects` so Cloudflare Pages serves `index.html` for those paths (SPA fallback).
