# Imposter — launch plan (now → production)

Use this as the single execution checklist. Check items off as you go; keep [POST_LAUNCH.md](./POST_LAUNCH.md) for lighter post-deploy verification. **Order matters** where noted (e.g. deploy Worker before baking `VITE_DISCORD_TOKEN_URL` into Pages).

---

## How to use this doc

1. Work **phases in order** unless a note says “parallel.”
2. Each task has **verify** steps — don’t skip; they catch miswired envs early.
3. After **Phase E**, you are “launch-ready” for the **current** feature set; **Phase G** is the actual flip / announce.
4. **[Product & engineering backlog](#product--engineering-backlog)** tracks deeper polish (G\*, X\*, `/play/CODE` routes). Web invites + multi-lobby (L1–L5) are implemented; see that section for details.

---

## Phase A — Preconditions & repo sanity

| # | Task | Details | Verify |
|---|------|---------|--------|
| A1 | Node & installs | Node 20+; `npm install` at repo root; `cd server && npm install` | `npm run build` and `npm run lint` pass at root |
| A2 | Secrets not in git | `.env`, `.env.local`, `.env.deploy` untracked | `git status` clean of secrets; `.gitignore` includes `.env.*` with `!.env.example` / `!.env.deploy.example` |
| A3 | Local full stack | Terminal 1: `cd server && npm run dev`; Terminal 2: `npm run dev` | Browser: app loads; Partykit connects; can complete one round solo or with second browser tab (different `sessionStorage` = different guest) |
| A4 | Discord dev app | [Developer Portal](https://discord.com/developers/applications) — Activities enabled; OAuth2 client id + secret available | Client ID matches what you’ll put in `VITE_DISCORD_CLIENT_ID` |

### Phase A — completion log

- [x] **A1** — Node v22.12.0 (≥20; optional: bump to 22.13+ to silence `eslint-visitor-keys` engine warning). Root + `server/` `npm install` OK. `npm run build` + `npm run lint` pass at repo root.
- [x] **A2** — `.gitignore` has `.env`, `.env.*` with `!.env.example` and `!.env.deploy.example`. `git check-ignore` confirms `.env`, `.env.local`, `.env.deploy` ignored. `git status`: working tree clean (no secrets committed).
- [x] **A3** — *Manual:* start Partykit + Vite, open the app, confirm lobby → start → discussion → voting → reveal (solo as host, or two tabs/profiles).
- [x] **A4** — *Manual:* in Discord Developer Portal confirm Activities + OAuth2; note Client ID = `VITE_DISCORD_CLIENT_ID` / `DISCORD_CLIENT_ID` for dev Worker plugin.

**Optional:** run `npm audit` in `server/` if you want to address reported dependency advisories (not blocking Phase A).

---

## Phase B — Cloudflare & Partykit production artifacts

| # | Task | Details | Verify |
|---|------|---------|--------|
| B1 | Wrangler login | `npx wrangler login` (once per machine/CI) | `npx wrangler whoami` shows account |
| B2 | Partykit login | `cd server && npx partykit login` | `npx partykit whoami` |
| B3 | `.env.deploy` filled | Copy `.env.deploy.example` → `.env.deploy`. Set at minimum: `CF_PAGES_PROJECT_NAME`, `VITE_DISCORD_CLIENT_ID`, `VITE_PARTYKIT_HOST` (production host, **no** `https://`), `VITE_DISCORD_TOKEN_URL` (after first Worker deploy — see B5), `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `JOIN_VERIFY` (`false` until you intentionally enable) | File exists; values match Discord app & intended Partykit hostname |
| B4 | Deploy Worker **first** (if token URL not final) | `npm run deploy:worker` or full `npm run deploy` | Worker URL responds 404 on random path; `POST …/api/token` with bad body returns JSON error (not 5xx misconfig) |
| B5 | Set `VITE_DISCORD_TOKEN_URL` | Use exact Worker URL ending in `/api/token` (or your routed equivalent) in `.env.deploy` | Same string used in next Pages build |
| B6 | Deploy Partykit | `npm run deploy:partykit` or `npm run deploy` | Partykit dashboard / CLI shows deployment; production host matches `VITE_PARTYKIT_HOST` |
| B7 | Deploy Pages | `npm run deploy:pages` or `npm run deploy` | Cloudflare Pages shows new deployment; open site URL — app shell loads |
| B8 | `JOIN_VERIFY` decision | Start with `false` in `.env.deploy` for simplest launch. Set `true` only when you want Discord token check on `JOIN` (Discord Activity only; real OAuth token) | If `true`, test Activity with two users; spoofed `userId` without token should fail |

**Dependency graph (short):** B4 → B5 → B7 (token URL must exist before baking client). B6 can run parallel to B4 if hosts are already known.

### Phase B — completion log

- [x] **B1** — Wrangler authenticated (`wrangler whoami` shows account + Workers write scope).
- [x] **B2** — PartyKit authenticated (`partykit whoami` shows user).
- [x] **B3** — `.env.deploy` exists; required keys present (`CF_PAGES_PROJECT_NAME`, `VITE_*`, `DISCORD_*`, `JOIN_VERIFY`); `VITE_DISCORD_TOKEN_URL` set (Worker URL ready for client build).
- [x] **B4** — Worker deployed; `POST …/api/token` with `{}` returns **400** `{"error":"Missing code"}` (not 503 misconfig).
- [x] **B5** — Token URL baked into the Pages build via `.env.deploy` during `npm run deploy`.
- [x] **B6** — PartyKit deployed; production host matches deploy output (use **hostname only**, no `https://`, in `VITE_PARTYKIT_HOST` — e.g. `server.hum2a.partykit.dev`).
- [x] **B7** — Pages deploy succeeded (Wrangler direct upload). **Note:** Wrangler may warn about root `wrangler.toml` lacking `pages_build_output_dir` — it is ignored for this deploy path; optional later: split Pages config or add field if you unify config.
- [x] **B8** — `JOIN_VERIFY=false` on deploy (`partykit deploy --var`) for simplest launch; flip to `true` in `.env.deploy` + redeploy Partykit when you want Discord token verification on `JOIN`.

**Recorded deploy outputs (update if you redeploy):**

| Target | URL / host |
|--------|------------|
| Worker | `https://imposter-discord-oauth.humzab1711.workers.dev` — token path `/api/token` |
| Partykit | `server.hum2a.partykit.dev` (→ `VITE_PARTYKIT_HOST`) |
| Pages | Check latest in Cloudflare dashboard (preview URL pattern `*.imposter-game-*.pages.dev`) |

---

## Phase C — Discord Developer Portal (production)

| # | Task | Details | Verify |
|---|------|---------|--------|
| C1 | URL mappings | See **runbook below**. Targets must **omit** `https://` (Discord rule). Activity iframe uses mapped paths; the app calls **`/api/token`** inside Discord (not the raw Worker URL). | Launch Activity from voice channel: no immediate auth error; Network tab shows `POST` to `…/api/token` via proxy |
| C2 | OAuth2 redirect / `invalid_grant` | If Discord returns `invalid_grant`, set **`DISCORD_REDIRECT_URI`** in Worker (via `.env.deploy` + `deploy:worker` `--var` or dashboard) and align **same** URI in Discord portal if required | Token exchange succeeds from Activity |
| C3 | Activity metadata | Name, description, icon — match store/listing expectations | Activity card looks correct in Discord |
| C4 | Client ID consistency | `VITE_DISCORD_CLIENT_ID` (built into Pages) === Application ID in portal === `DISCORD_CLIENT_ID` on Worker | Single source of truth documented in your password manager / runbook |

### Phase C — portal runbook (do in order)

1. Open [Discord Developer Portal](https://discord.com/developers/applications) → **your Imposter application**.
2. **Settings → OAuth2**  
   - Confirm **Client ID** matches `VITE_DISCORD_CLIENT_ID` in your built app and `DISCORD_CLIENT_ID` on the Worker.  
   - **Client secret** is only on the Worker / local `.env`, never in `VITE_*`.
3. **Activities** (or **Embedded / URL Mappings** depending on UI) → **URL mappings**  
   Add or verify rows (prefix = what the iframe requests; **target = host only, no `https://`**):

   | Prefix | Target (example — use your real hosts) |
   |--------|----------------------------------------|
   | `/` | Your **Cloudflare Pages** hostname, e.g. `imposter-game-f3k.pages.dev` or your custom domain |
   | `/api/token` | Your **Worker** hostname, e.g. `imposter-discord-oauth.humzab1711.workers.dev` |

   Order: if you also map a longer path under `/`, put **more specific prefixes above** shorter ones (Discord globbing rule).

4. **Activities → Settings**  
   - Enable **Supported platforms** you care about (desktop web, etc.) so the app appears in the Activity shelf with Developer Mode.  
   - Fill **name**, **description**, **icons** (C3).

5. **Launch check**  
   - Voice channel → Activity launcher → your app.  
   - DevTools → **Network**: authorize flow then `POST` to **`/api/token`** → **200** and JSON with `access_token`.  
   - If you see **`blocked:csp`** or failed fetch to `*.workers.dev` directly, confirm you are **not** relying on a full Worker URL inside the Activity (the client uses **`/api/token`** when running in Discord; `VITE_DISCORD_TOKEN_URL` is for **browser / PWA** only).

### Phase C — completion log

- [x] **C1** — URL mappings saved; `/` → Pages host; `/api/token` → Worker host (no scheme in target).
- [ ] **C2** — Token exchange works OR `invalid_grant` fixed with `DISCORD_REDIRECT_URI` + portal.
- [ ] **C3** — Activity metadata and icons reviewed.
- [ ] **C4** — Client ID triple-checked (portal ↔ Pages bundle ↔ Worker secret).

---

## Phase D — Optional: Supabase (web guests / cloud profile)

Skip entire phase if you only care about Discord Activity for v1.

| # | Task | Details | Verify |
|---|------|---------|--------|
| D1 | Project & keys | Create project; note URL + anon/publishable key | `VITE_SUPABASE_URL` + key in `.env` / Pages build env |
| D2 | Auth providers | Enable **Anonymous** sign-ins. For web Discord login: enable **Discord** provider; configure Discord OAuth app (redirects include Supabase callback + your site) | Dashboard shows providers on |
| D3 | SQL migrations | Run `001_web_profiles.sql` then `002_web_profiles_discord_link.sql` (CLI `db push` or SQL editor) | Tables/policies exist; no RLS errors in logs when upserting |
| D4 | Build env | Add `VITE_SUPABASE_*` to `.env.deploy` and redeploy Pages | Production site: guest default works; “Save progress online” / “Sign in with Discord” behave as expected |
| D5 | Privacy copy (optional) | If you add a footer or settings, link to privacy policy when you collect accounts | N/A for code — product/legal |

---

## Phase E — End-to-end test matrix (launch gate)

Run all applicable rows; fix blockers before Phase G.

| Scenario | Steps | Pass criteria |
|----------|--------|----------------|
| E1 — Activity two users | Two Discord accounts, same voice channel, launch Activity | Both reach lobby; host starts; discussion timer; both vote; reveal; host can next round or lobby |
| E2 — Activity token path | DevTools → Network: token `POST` | 200; `access_token` in response body; no CORS errors |
| E3 — Web guest | Incognito, production URL, no Supabase or don’t opt in | Loads; name edit; joins Partykit room; full round possible |
| E4 — Web cloud (if Supabase) | Opt in “Save progress online” | New user id in room vs guest; refresh page still same cloud id; `web_profiles` row updated |
| E5 — Web Discord (if enabled) | Sign in with Discord | Redirect returns; badge shows Discord account; profile upsert |
| E6 — Guest ↔ cloud switch | From web profile card switch modes | Warning understood; new id when rejoining mid-session is acceptable — document for friends |
| E7 — Partykit disconnect | Kill Partykit tab or block network briefly | App shows connecting / error state; recovery after restore (no silent corrupt state) |
| E8 — `JOIN_VERIFY=true` (if used) | Only if you enabled in B8 | Discord user only: JOIN with valid token succeeds |
| E9 — Web invite link (when built) | Host opens lobby; copies link; second browser (incognito) opens `?room=` URL | Both clients share same `gameState`; distinct `userId`s |
| E10 — Create vs join lobby (when built) | Web: “New lobby” then share code; friend “Join” with code | Same as E9; invalid code shows clear error / empty room |
| E11 — Discord + room code (when built) | If product allows shared code inside Activity | Two users same channel, same typed code, same Partykit room |

---

## Phase F — Security, ops, and launch hygiene

| # | Task | Details | Verify |
|---|------|---------|--------|
| F1 | Secret rotation | Confirm Discord secret not leaked in chat/repo history; rotate if ever pasted publicly | New secret on Worker + portal if rotated |
| F2 | Cloudflare observability | Enable / bookmark **Workers** logs and **Pages** analytics for first week | You can see requests and errors |
| F3 | Partykit monitoring | Know where to tail logs (`partykit tail` or dashboard) | You can trace a failed connection |
| F4 | Rate limits / abuse (minimal) | Document “if spam, flip `JOIN_VERIFY` or restrict Activity to server” — no code required for v1 | Runbook sentence in Notion/README |
| F5 | Backup deploy path | Save `.env.deploy` (encrypted), Wrangler + Partykit account access | You can redeploy from a fresh laptop |

---

## Phase G — Launch day

| # | Task | Details |
|---|------|---------|
| G1 | Freeze | No discretionary merges after final green `npm run build` / lint unless hotfix |
| G2 | Final deploy | `npm run deploy` from clean tree; note deployment IDs / timestamps |
| G3 | Portal check | Discord URL mappings still point to **production** (not preview/staging) |
| G4 | Smoke | One host runs E1 + E3 quickly on production |
| G5 | Announce | Short message to testers/community: how to open Activity, web URL, known limitations |
| G6 | Update [POST_LAUNCH.md](./POST_LAUNCH.md) | Check off completed items; open remaining as issues |

---

## Phase H — First week post-launch

| # | Task | Details |
|---|------|---------|
| H1 | Watch logs daily | Workers + Partykit + browser console reports from testers |
| H2 | Triage | Vote ties, disconnects, OAuth edge cases — file GitHub issues with repro |
| H3 | Optional hardening | `JOIN_VERIFY=true` if abuse appears |
| H4 | Product backlog | Pull from [Product & engineering backlog](#product--engineering-backlog); file GitHub issues with milestones |

---

## Product & engineering backlog

Features below are the **master planning list**; P0 L1–L5 are done in client + `web-session` (see notes). Use your issue tracker for finer-grained tasks; tick rows there, not necessarily here.

### Current behavior (baseline)

| Surface | How `partyRoomId` is chosen | Multiple lobbies? |
|---------|----------------------------|-------------------|
| **Web** (`src/lib/web-session.ts`, `src/lib/party-room.ts`) | **`lobby-{CODE}`** (6-char A–Z / 2–9). **`?room=CODE`** on load, **`sessionStorage`**, URL synced with **`replaceState`**. Legacy `browser-*` sessions migrate once to a new `lobby-*` code. | **Yes** — join by code/link, **New lobby**, or paste URL. |
| **Discord Activity** (`src/hooks/useDiscord.ts`) | Base: `instanceId` or `ch-{channelId}` or `main`. Optional **room code** (4+ chars) → PartyKit room **`{base}__{CODE}`** (persisted in `sessionStorage`). | **Yes** when a suffix is set; otherwise one room per instance/channel as before. |
| **Partykit** (`src/hooks/useParty.ts`) | `PartySocket({ room: roomId })` — isolation is **per `room` string** | Unlimited rooms; server unchanged for L1–L5. |

---

### P0 — Social / lobby (needed for “invite friends” + intentional multi-lobby)

| ID | Feature | Implementation notes |
|----|---------|------------------------|
| **L1** | **Room codes & URL** | **Done.** `normalizeLobbyCode` (4–16 chars), `?room=CODE`, `resolveWebPartyRoomId()` + `sessionStorage` + `syncWebUrlToLobbyCode` — see `party-room.ts` / `web-session.ts`. |
| **L2** | **Lift / control `partyRoomId` from init-only** | **Done.** `joinWebPartyRoom`, `createNewWebLobby` in `useDiscord` update state; `useParty` reconnects when `roomId` changes. |
| **L3** | **“Create lobby” vs “Join lobby”** | **Done (in-lobby).** Lobby: **Join another lobby** form + **New lobby** (confirm). Invalid code → `joinLobbyError`. Optional later: dedicated pre-connect gate screen. |
| **L4** | **Invite UI** | **Done.** Lobby shows code, **Copy link**, **Copy code** (`buildWebInviteUrl`). |
| **L5** | **Discord Activity + same channel, different lobby** (product choice) | **Done (Option B).** Optional **Room code** field on lobby; `buildDiscordPartyRoomId`; empty/invalid short suffix → base room only. |
| **L6** | **Host leaves / host transfer** | **Already in server:** `onClose` in `server/src/room.ts` reassigns `hostId` to the first remaining player when the host’s last connection drops. |

**Suggested file touch list:** `src/lib/web-session.ts`, `src/hooks/useDiscord.ts`, `src/hooks/useParty.ts`, `src/App.tsx` (routing / gate), `src/screens/Lobby.tsx`, `server/src/room.ts` (if host rules change).

---

### P1 — Gameplay & reliability

| ID | Feature | Notes |
|----|---------|--------|
| **G1** | **Reconnect same user** | **Done:** **45s grace** after last socket `onClose` before removing the player; **`JOIN` on every socket open** re-binds `connToUser`. Host handoff prefers a **non-spectator** if the host drops. |
| **G2** | **Spectate / late join rules** | **Done:** Mid-round **new** users join as **`isSpectator`** (watch discussion/vote/reveal; no word/vote). **`startGame`** / **`backToLobby`** clears spectator flag so they play next round. |
| **G3** | **Custom word lists** | **Done (per-round pair):** host `SET_NEXT_WORDS` / `CLEAR_NEXT_WORDS`; server `nextCustomPair` (secret); `hasCustomNextRound` in broadcast. No word packs / uploads / profanity filter. |
| **G4** | **Timer / phase edge cases** | **Partial:** client clamps countdown to ≥0; **hidden-tab** notice during discussion; server timer unchanged. |
| **G5** | **Mobile + narrow iframes** | **Partial:** `GameScreen` / header **safe-area**; **min-h-11** on key lobby buttons. |

---

### P2 — Polish, trust, and growth

| ID | Feature | Notes |
|----|---------|--------|
| **X1** | Sound, haptics, animations | See [POST_LAUNCH.md](./POST_LAUNCH.md) §5 |
| **X2** | Round history / stats per user | Needs persistent id + optional Supabase tables |
| **X3** | **Stronger identity** | Short-lived signed tokens vs raw Discord token on wire ([POST_LAUNCH.md](./POST_LAUNCH.md)) |
| **X4** | Analytics (privacy-preserving) | Events: round_start, vote, crash — Plausible / CF Web Analytics |
| **X5** | i18n / accessibility | **Partial:** discussion timer `aria-live`; more labels / focus / modals TBD |
| **X6** | CI: `build` + `lint` on PR | **Done:** `.github/workflows/ci.yml` — client lint+build, `server/` `tsc --noEmit` |
| **X7** | Staging app + staging Worker | Second Discord app or URL mapping to preview Pages |

---

### Suggested sequencing (opinion)

1. ~~**L1 → L2 → L3 → L4**~~ — shipped.  
2. ~~**L5**~~ — shipped (Discord optional suffix).  
3. ~~**L6**~~ — covered by existing `onClose` host handoff; add UX copy only if playtesters are confused.  
4. **G1–G5** — core items addressed (see P1 table); see **full sequence below** for everything still open.  
5. ~~**X6**~~ — CI in place; remaining **X\*** follow the waves below.

---

## Remaining implementation sequence (full backlog)

Use this as the **master order** for everything not yet fully shipped in P1/P2. Each **wave** builds on earlier waves unless marked **‖** (safe to run in parallel).

### How to read it

- **Depends on** means “finish or stub this first” to avoid rework or production risk.
- **Staging (X7)** is listed first on purpose: you want a non-prod URL (and ideally a second Discord app or mapped preview) before identity/token work (X3) and before trusting analytics (X4).
- **Server changes** (`server/src/room.ts`) need a **Partykit deploy**; **Vite env** changes need a **Pages rebuild**.

### Waves (recommended order)

| Wave | Backlog IDs | Outcome | Depends on | Main touch points |
|------|-------------|---------|------------|-------------------|
| **R0** | **X7** | **Done (docs + template):** [docs/STAGING.md](./STAGING.md), `.env.deploy.staging.example`, `DEPLOY_ENV_FILE` already supported in `scripts/deploy.mjs`. You still create Cloudflare/Discord resources yourself. | — | Wrangler, Discord portal, `.env.deploy.staging` |
| **R1** | **G5** (finish), **X5** (a11y foundation) | **Done (this pass):** voting `aria-label` / `aria-pressed`, confirm `aria-label`, `min-h-11` targets, `GameScreen` `motion-reduce:transition-none`, narrow grid `min-w-0`. Further polish (focus rings audit, Voting as true radiogroup) optional. | — | `Voting.tsx`, `Reveal.tsx`, `GameScreen` |
| **R2** ‖ | **X4** | **Done (Plausible):** `src/lib/analytics.ts`, `initAnalytics()` in `main.tsx`, `useGameAnalytics` phase hooks, `VoteSubmit` in `Voting`; `VITE_PLAUSIBLE_DOMAIN` / `VITE_PLAUSIBLE_SCRIPT_URL`. Cloudflare Web Analytics = separate snippet if you prefer. | **R0** recommended for prod/staging separation | `analytics.ts`, `App.tsx`, `.env.example` |
| **R3** ‖ | **G4** (finish) | **Done:** discussion-phase **25s** full-state re-broadcast in `server/src/room.ts`; README note. Client already had hidden-tab copy + `aria-live` on countdown. | — | `server/src/room.ts`, `README.md` |
| **R4** | **G1** (finish) | **Done:** `DISCONNECT_GRACE_MS` (45s), `disconnectGrace` map, `finalizePlayerDisconnect`; client **`socketOpenNonce` + JOIN on `open`**. | — | `server/src/room.ts`, `useParty.ts`, `App.tsx` |
| **R5** | **G2** (spectate) | **Done:** `Player.isSpectator`, mid-round `handleJoin` path, `Game` / `Voting` / `Reveal` / `Lobby` UI. | **R4** | `room.ts`, `Game.tsx`, `Voting.tsx`, `Reveal.tsx`, `Lobby.tsx`, `types/game.ts` |
| **R6** | **G3** (finish) | **Packs:** curated JSON lists + host picker in lobby; **profanity:** optional filter or block on `SET_NEXT_WORDS`; **import:** paste/CSV last (validate length/count) | **R0** for safe iteration | `data/word-packs/*`, `Lobby.tsx`, `room.ts` |
| **R7** ‖ | **X1** | Muted-by-default or settings-based SFX; light haptics on vote (mobile); short CSS transitions; respect reduced-motion + user mute | **R1** partial | `public/sounds/*`, small hook, optional settings row |
| **R8** ‖ | **X2** | Optional Supabase tables for per-user stats/history; RLS; write path from client after `reveal` or batch from trusted server path | Stable **web identity** story | `supabase/migrations`, `web-session.ts`, UI surface (profile or modal) |
| **R9** | **X3** | PartyKit verifies **short-lived join JWT** from Worker (or Worker proxies mint); stop sending raw Discord OAuth token on wire when feature flag on | **R0**, **R4** | `workers/discord-oauth-token.ts` (or new route), `room.ts`, `App.tsx`, secrets |
| **R10** | **X5** (i18n) | Add i18n library, extract strings (English first), then second locale if needed; full a11y pass with screen reader | **R1** | `src/locales/*`, component sweep |
| **R11** ‖ | CI+ | Optional: GitHub deploy on tag, E2E smoke (Playwright) against staging | **R0**, ~~**X6**~~ | `.github/workflows/*` |

### Parallel tracks (same calendar time)

If you have bandwidth, these can advance **alongside** the table above without blocking each other:

- **Design/content:** word pack JSON, sound asset list, analytics event dictionary, copy for spectator/reconnect.
- **Docs:** staging runbook, X3 threat model, PartyKit hibernation notes.
- **X5 a11y:** incremental PRs per screen while R4–R6 ship.

### Suggested milestones (product framing)

| Milestone | Waves | User-facing promise |
|-----------|-------|---------------------|
| **M1 — Staging + trust** | ~~R0~~, ~~R2~~, ~~R3~~ (implemented — wire your own staging hosts) | “We can test safely and see funnels without breaking prod.” |
| **M2 — Session reliability** | ~~R4~~, R1 | “Refresh and flaky networks don’t ruin the round as often.” |
| **M3 — Social depth** | ~~R5~~, R6, R7 | “Friends can watch a round and hosts can theme words.” |
| **M4 — Accounts & security** | R8, R9, R10 | “Stats for signed-in users and stronger join tokens.” |

### Explicitly out of scope for this sequence (unless you reprioritize)

- Native app wrappers (PWA already).
- Real-time voice/video (Discord handles voice).
- User-generated content moderation beyond simple word filters.

---

## Quick reference — commands

| Goal | Command |
|------|---------|
| Full production push | `npm run deploy` |
| Worker only | `npm run deploy:worker` |
| Partykit only | `npm run deploy:partykit` |
| Pages only (rebuild client) | `npm run deploy:pages` |
| Secrets only | `npm run deploy:sync` |
| Local dev | `npm run dev` + `cd server && npm run dev` |

---

## Dependency checklist (minimal launch)

- [ ] Cloudflare: Pages project + Worker deployed  
- [ ] Partykit: production deploy + host in `VITE_PARTYKIT_HOST`  
- [ ] Discord: Activities + URL mappings + working token exchange  
- [ ] `.env.deploy` complete and **never** committed  
- [ ] Phase E matrix passed for your target platforms (Activity required; web optional)  

---

*Last updated: align with repo state when you complete phases; bump this note when the plan changes materially.*
