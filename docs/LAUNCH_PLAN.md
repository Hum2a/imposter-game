# Imposter — launch plan (now → production)

Use this as the single execution checklist. Check items off as you go; keep [POST_LAUNCH.md](./POST_LAUNCH.md) for lighter post-deploy verification. **Order matters** where noted (e.g. deploy Worker before baking `VITE_DISCORD_TOKEN_URL` into Pages).

---

## How to use this doc

1. Work **phases in order** unless a note says “parallel.”
2. Each task has **verify** steps — don’t skip; they catch miswired envs early.
3. After **Phase E**, you are “launch-ready”; **Phase G** is the actual flip / announce.

---

## Phase A — Preconditions & repo sanity

| # | Task | Details | Verify |
|---|------|---------|--------|
| A1 | Node & installs | Node 20+; `npm install` at repo root; `cd server && npm install` | `npm run build` and `npm run lint` pass at root |
| A2 | Secrets not in git | `.env`, `.env.local`, `.env.deploy` untracked | `git status` clean of secrets; `.gitignore` includes `.env.*` with `!.env.example` / `!.env.deploy.example` |
| A3 | Local full stack | Terminal 1: `cd server && npm run dev`; Terminal 2: `npm run dev` | Browser: app loads; Partykit connects; can complete one round solo or with second browser tab (different `sessionStorage` = different guest) |
| A4 | Discord dev app | [Developer Portal](https://discord.com/developers/applications) — Activities enabled; OAuth2 client id + secret available | Client ID matches what you’ll put in `VITE_DISCORD_CLIENT_ID` |

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

---

## Phase C — Discord Developer Portal (production)

| # | Task | Details | Verify |
|---|------|---------|--------|
| C1 | URL mappings | **Activity URL** → Cloudflare Pages production URL (scheme + host, no trailing path unless you use it). **`/api/token`** → Worker URL that serves token exchange (or rely on `VITE_DISCORD_TOKEN_URL` pointing to Worker full URL — mappings must be consistent with how the client calls token exchange) | Launch Activity from voice channel: no immediate auth error |
| C2 | OAuth2 redirect / `invalid_grant` | If Discord returns `invalid_grant`, set **`DISCORD_REDIRECT_URI`** in Worker (via `.env.deploy` + `deploy:worker` `--var` or dashboard) and align **same** URI in Discord portal if required | Token exchange succeeds from Activity |
| C3 | Activity metadata | Name, description, icon — match store/listing expectations | Activity card looks correct in Discord |
| C4 | Client ID consistency | `VITE_DISCORD_CLIENT_ID` (built into Pages) === Application ID in portal === `DISCORD_CLIENT_ID` on Worker | Single source of truth documented in your password manager / runbook |

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
| H4 | Product backlog | Sound, animations, round history ([POST_LAUNCH.md](./POST_LAUNCH.md) §5) — prioritize after stability |

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
