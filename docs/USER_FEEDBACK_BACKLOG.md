# User testing feedback — backlog

Captured from playtests. Items marked **done** in this pass are implemented in-repo; the rest are planned / larger scope.

## Shipped in the latest iteration

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
| **More game modes** | e.g. new word every *clue cycle* vs per *round*, rotating host/imposter rules — needs `GameSettings` + server phase rules + UI. |
| **“Turns” / alternating modes** | New state machine (order, roles per turn). |
| **Encrypt WebSocket “who is imposter”** | WSS already encrypts transport. Hiding `isImposter` from *other* clients requires **per-connection** server serialization (no shared broadcast) or trusted server-only UI — major protocol change; won’t stop a modified client. |
| **Friends for logged-in users** | Needs product design + Supabase (or other) social graph, privacy, invites — not started. |
| **Richer round timeline UI** | Timeline of phases, per-clue events — mostly client + maybe server event log. |

## Suggested order for next sprint

1. Game mode flags (reuse word for all clue cycles vs roll new pair each cycle).
2. Optional stricter clue dictionary / hyphen rules if playtests want “one word” defined further.
3. Friends / social — spec auth & data model first.
