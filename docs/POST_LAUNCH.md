# Post-launch checklist

Track verification, ops, and follow-up work after deploying Pages, Worker, and Partykit.

## 1. Smoke-test production

- [x] Open the **Cloudflare Pages** URL in a normal browser → app loads (browser dev user / Partykit).
- [x] Launch the **Discord Activity** from a voice channel → auth succeeds (no token error).
- [ ] Run a full loop with **two accounts**: lobby → start → clue rounds (write → reveal) → voting → reveal.
- [ ] Confirm **Partykit** connections in dashboard / logs if something fails.

## 2. Confirm environment wiring

- [x] **Pages** build env: `VITE_DISCORD_CLIENT_ID`, `VITE_PARTYKIT_HOST`, `VITE_DISCORD_TOKEN_URL` (if Worker is not same-origin). Easiest: keep them in **`.env.deploy`** and run `npm run deploy:pages` (or `npm run deploy`) so the Vite build picks them up.
- [ ] **Supabase (optional but required for cloud features):** Add to **`.env.deploy`** so `npm run deploy` embeds them, **and** duplicate the same `VITE_SUPABASE_*` variables under **Cloudflare Pages → Settings → Environment variables → Production** if the project also builds from Git (otherwise production may ship without Supabase). Required pair: `VITE_SUPABASE_URL` + exactly one of `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`, or `VITE_SUPABASE_PUBLISHABLE_KEY`. Run `supabase/migrations/` in order; enable Anonymous / Email / Discord in Supabase Auth as needed; set **Site URL** and **Redirect URLs** to your live Pages origin.
- [x] **Worker** secrets: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`.
- [x] Redeploy **Pages** after changing any `VITE_*` variable (values are baked at build time).

### Git-connected Pages + `npm run deploy`

If the same Pages project **builds from Git** and you also run **`wrangler pages deploy`** locally, the **main `*.pages.dev` URL** can keep serving the **Git-built** bundle (often missing `VITE_*` unless set in the Cloudflare dashboard). Your CLI log’s **unique** URL (e.g. `https://<hash>.<project>.pages.dev`) may be the only place the Wrangler upload appears.

**Fix (pick one):** (1) Add `VITE_PARTYKIT_HOST`, `VITE_DISCORD_CLIENT_ID`, `VITE_DISCORD_TOKEN_URL` under **Pages → Settings → Environment variables** for Production so Git builds embed them; (2) set **`CF_PAGES_BRANCH=main`** (or your production branch) in **`.env.deploy`** so `deploy:pages` passes `--branch` and updates that branch’s production deployment; (3) disable automatic Git builds if you only want Wrangler uploads.

## 3. Discord Developer Portal

- [x] **URL mappings**: Activity root → Pages URL; `/api/token` → Worker (if you use path-based routing).
- [x] **Activities** enabled and client ID matches `VITE_DISCORD_CLIENT_ID`.
- [ ] If OAuth returns **`invalid_grant`**, configure **`DISCORD_REDIRECT_URI`** on the Worker (and in the portal) as required for your app.

## 4. Operational hygiene

- [x] Confirm **`.env` / `.env.*` are never committed** (`git status` clean of secrets).
- [x] **Rotate** Discord client secret if it was ever exposed.
- [ ] Enable **Cloudflare** analytics / logs for Pages and the Worker for the first live sessions.

## 5. Product hardening (ongoing)

- [x] **Stats persistence** — Partykit `room.storage` for aggregate stats (see `server/src/room.ts`).
- [x] **Polish** — vote ties broken randomly among tied leaders; disconnect during voting cleans votes and may auto-resolve.
- [x] **JOIN verification (optional)** — set Partykit var `JOIN_VERIFY` to `true` and send `accessToken` on `JOIN` (Discord `@me` check).
- [ ] **Stronger identity** — short-lived signed tokens from your backend (not only OAuth access token on the wire).
- [x] **Sound / light motion (R7)** — optional SFX + vote haptics; see [README.md](../README.md) § Sound effects.
- [ ] **Round history / heavier animations** — backlog in [LAUNCH_PLAN.md — Product & engineering backlog](./LAUNCH_PLAN.md#product--engineering-backlog); **ordered implementation waves** in [Remaining implementation sequence](./LAUNCH_PLAN.md#remaining-implementation-sequence-full-backlog).

---

Update this file as you complete items. See also [README.md](../README.md) for deploy commands.
