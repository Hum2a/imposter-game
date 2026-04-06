# User testing feedback — backlog

Captured from playtests. Items marked **done** in this pass are implemented in-repo; the rest are planned / larger scope.

## Shipped in the latest iteration

- **Strict clues (default):** clues must be **letters only** (`\p{L}`), 1–40 chars, no spaces. PartyKit env **`CLUE_STRICT_WORD=false`** restores lenient single-token clues (hyphens, digits). Server exposes **`clueStrictWord`** in game state; clue screen strips non-letters when strict. Errors: `CLUE_STRICT_REJECTED` vs `INVALID_CLUE`.
- **Clue-round word mode (backlog):** host toggle **New random words each clue round** — when on, each “next clue round” after reveal draws a new pair from the lobby word pack and re-picks the imposter; first cycle still uses custom/initial pair; majority skip from voting keeps the same pair.
- **Web lobby code:** choose a **custom shareable code** (4–12 alphanumeric) or **new random lobby**; join-by-code validation messages localized.
- **Lobby layout:** **Players** and **Game settings** are **separate cards**; on large screens they sit in a **two-column grid** for better use of space.
- **Web avatars:** preset **emoji avatars** (`p:${id}` on the wire), picker in **Account & profile**; `Avatar` renders emoji for preset tokens.
- **Server join hardening:** `JOIN` fields trimmed and length-limited; JWT / token checks use the same normalized `userId` as stored player ids.
- **Animations:** default `Card` uses subtle enter animation (`tw-animate-css`); clue word card keeps a stronger zoom-in.
- **Sound:** already present (toggle in header, `PhaseSfxListener`, `public/sounds/`). No change required for “add SFX” beyond reminding testers to enable Sound.
- **Account panel:** auto-minimizes when leaving lobby; **Minimize** / **Account & profile** to collapse or expand during play.
- **Clue input:** **Enter** submits; input strips spaces; server rejects whitespace (single token only).
- **Call vote:** available during **clue write** (was already on clue reveal); any non-spectator can trigger.
- **Vote timer:** host sets **Seconds to vote** in lobby (15–180); countdown in voting; when time expires, non-voters get **skip** and the round resolves.
- **End game:** host can **End game** from clue write, clue reveal, or voting (resets room via `END_GAME`).
- **Landscape width:** `GameScreen` widens on `lg` / `xl`.
- **Lobby settings:** word pack / timers / vote duration remain editable between rounds (lobby).
- **Reveal breakdown:** clearer colors for crew vs imposter words; vote rows tinted by skip vs accusation vs “voted imposter.”
- **Select / dropdown text:** `select option` uses `foreground` / `card` in global CSS.
- **Palette + themes:** teal / violet-leaning defaults; **theme** toggle cycles **System → Light → Dark** (stored in `localStorage` under `imposter-theme-preference`). Comment in `index.css` for future `data-brand` packs.

## Larger / not done (keep as roadmap)

| Idea | Notes |
|------|--------|
| **More game modes** | **New word each clue cycle** is implemented (host checkbox in lobby). Still open: rotating host, turns order, other rule presets. |
| **“Turns” / alternating modes** | New state machine (order, roles per turn). |
| **Encrypt WebSocket “who is imposter”** | WSS already encrypts transport. Hiding `isImposter` from *other* clients requires **per-connection** server serialization (no shared broadcast) or trusted server-only UI — major protocol change; won’t stop a modified client. |
| **Friends for logged-in users** | Needs product design + Supabase (or other) social graph, privacy, invites — not started. |
| **Richer round timeline UI** | Timeline of phases, per-clue events — mostly client + maybe server event log. |

## Security / ops (documented; tighten in prod)

| Issue | Notes |
|--------|--------|
| **Crafted `JOIN` / repeater** | See `docs/SECURITY.md`. Enable **Discord join verify** or **party join JWT** on public deployments; room ids are guessable. |
| **Email links to localhost** | Supabase **Site URL** + **Redirect URLs** must match production (and preview) origins so verification emails are usable. |

## Suggested order for next sprint

1. ~~Game mode flags (reuse word for all clue cycles vs roll new pair each cycle).~~ **Done** (`newWordPairEachClueCycle` in `GameSettings`).
2. ~~Optional stricter clue dictionary / hyphen rules~~ **Done** (default strict letters-only; `CLUE_STRICT_WORD=false` for lenient).
3. Friends / social — spec auth & data model first.
