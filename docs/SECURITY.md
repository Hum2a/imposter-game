# Security notes

## WebSocket `JOIN` messages and “fake players”

PartyKit room IDs are effectively public: anyone who knows the room name can open a WebSocket to that party. If the server accepts `JOIN` payloads without verifying identity, a client (or a proxy/repeater) can send crafted `JOIN` messages with arbitrary `userId`, `name`, and `avatar`.

**Mitigations in this project**

- **Optional Discord verification** (`JOIN_VERIFY` / equivalent env): the server checks the Discord OAuth token against the claimed `userId`.
- **Optional party join JWT**: short-lived JWT minted by your backend; the server verifies it before accepting `JOIN`.
- **Input limits**: `userId`, `name`, and `avatar` are trimmed and length-capped on the server so oversized or noisy payloads cannot blow up state.

**Operational guidance**

- Enable **either** verified Discord join **or** party JWT in production builds that are exposed on the public internet.
- Treat “who is in the lobby” as **untrusted** until join verification is on; do not use the same room naming for anything confidential.

## Supabase email links pointing at `localhost`

If confirmation, magic-link, or password-reset emails contain links to `http://localhost`, the **Site URL** and **Redirect URLs** in the Supabase project are still set for local development.

**Fix**

1. In Supabase Dashboard → **Authentication** → **URL configuration**, set **Site URL** to your production origin (e.g. `https://yourgame.example`).
2. Add the same origin (and any preview deploy URLs) to **Redirect URLs**.
3. Use matching `VITE_*` / deployment env vars so the client’s OAuth and email flows target the same host.

## JOIN rate limiting

PartyKit `ImposterRoom` applies a **sliding-window limit** on `JOIN` messages per WebSocket connection and per claimed `userId`. This slows scripted floods and naive “repeater” spam; it is **not** a substitute for join verification.

| Variable | Default | Meaning |
|----------|---------|---------|
| `JOIN_RATE_LIMIT` | on | Set to `false` / `0` to disable (testing only). |
| `JOIN_RATE_WINDOW_MS` | `15000` | Window length (1000–120000). |
| `JOIN_MAX_PER_CONN` | `20` | Max JOINs per connection per window. |
| `JOIN_MAX_PER_USER` | `12` | Max JOINs per `userId` per window. |

Clients receive `ERROR` with code `JOIN_RATE_LIMITED` when over limit.

## Threat model (short)

- Modified clients can always lie about UI; server rules and verified joins are the source of truth for identity.
- Transport is WSS in production (TLS); that protects **wire** secrecy, not **logical** secrecy of game payloads broadcast to all players.
