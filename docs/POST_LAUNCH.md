# Post-launch checklist

Track verification, ops, and follow-up work after deploying Pages, Worker, and Partykit.

## 1. Smoke-test production

- [x] Open the **Cloudflare Pages** URL in a normal browser → app loads (browser dev user / Partykit).
- [x] Launch the **Discord Activity** from a voice channel → auth succeeds (no token error).
- [ ] Run a full loop with **two accounts**: lobby → start → discussion → voting → reveal.
- [ ] Confirm **Partykit** connections in dashboard / logs if something fails.

## 2. Confirm environment wiring

- [x] **Pages** build env: `VITE_DISCORD_CLIENT_ID`, `VITE_PARTYKIT_HOST`, `VITE_DISCORD_TOKEN_URL` (if Worker is not same-origin). Easiest: keep them in **`.env.deploy`** and run `npm run deploy:pages` (or `npm run deploy`) so the Vite build picks them up.
- [ ] **Optional website:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` + `supabase/migrations/001_web_profiles.sql` + Anonymous sign-in enabled in Supabase.
- [x] **Worker** secrets: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`.
- [x] Redeploy **Pages** after changing any `VITE_*` variable (values are baked at build time).

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
- [ ] **Round history / sound / animations** — see your original game plan Phase 6; full feature list in [LAUNCH_PLAN.md — Product & engineering backlog](./LAUNCH_PLAN.md#product--engineering-backlog) (invites, multi-lobby, host transfer, etc.).

---

Update this file as you complete items. See also [README.md](../README.md) for deploy commands.
