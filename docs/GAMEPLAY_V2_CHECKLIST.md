# Gameplay v2 — implementation checklist

Tick boxes as you implement. See `server/src/room.ts`, `src/types/game.ts`, and screen components for the current baseline.

## Design rules (fixed)

- [x] **R1** — Crew shares `word`; imposter sees `imposterWord` only (current secret-word model).
- [x] **R2** — **Any player** can trigger a move to voting (`CALL_VOTE` or equivalent).
- [x] **R3** — **Unlimited** suspicion (add/remove/toggle as you prefer; server is source of truth).
- [x] **R4** — On the voting screen, if **a majority chooses “skip”** (define: >50% of eligible voters, or strict majority of all players — pick one and document), **skip wins** → leave voting **without** resolving an accusation (back to clue loop).
- [x] **R5** — **Wrong accusation** (majority/plurality picks one player who is **not** the imposter) **ends the game**, and only when the outcome is **not** “skip wins.”
- [x] **R6** — **One** `(word, imposterWord)` pair + **one** imposter assignment for the **whole game**; clue cycles **do not** re-roll words or imposter until **NEXT_ROUND** / new game / lobby reset.

## Phase 0 — Decisions (avoids rework)

- [x] **0.1** — Define **eligible voters** for “majority skip” (non-spectators only, same as today’s voting pool).
- [x] **0.2** — Define **skip majority**: e.g. `skipVotes > playerVotes` vs `skipVotes > n/2` vs “skip wins if it’s the plurality.” Align with **R4**.
- [x] **0.3** — Define **accusation win condition** when not skipping: plurality vs strict majority vs tie-break (today uses random tie among top targets — keep or change).
- [x] **0.4** — After **skip wins**, next phase = **`clue_write`** again (same words/imposter), with clues/suspicion reset for that cycle or kept — **pick one** (usually reset clues each cycle, keep suspicion optional).

## Phase 1 — Types & wire protocol

- [x] **1.1** — Extend `Phase` in `src/types/game.ts` + `server/src/room.ts` (e.g. `clue_write`, `clue_reveal`, keep `lobby`, `voting`, `reveal` or add `game_over` if you want a distinct end state).
- [x] **1.2** — Extend `GameState`: `settings` (`writeSeconds`, `maxClueRounds`), `clueCycle` (1…N), `clueEndsAt`, `clues` (per player, hidden until reveal — see server note), `suspicion` model, `voteRequested` / `votingReason` optional, `endReason` or extended `winner` for “wrong accusation / imposter wins / crew wins / skip.”
- [x] **1.3** — Extend `ClientMessage`: `SUBMIT_CLUE`, `ADD_SUSPICION` / `REMOVE_SUSPICION` (or one `SET_SUSPICION` with count), `CALL_VOTE` (any player), `CAST_VOTE` extended to support **skip** (e.g. `targetId: null` or `voteType: 'skip' | 'player'`), `CONTINUE_FROM_REVEAL` (host vs anyone — align with product), lobby `SET_GAME_SETTINGS`.
- [x] **1.4** — Update `useParty.ts` defaults so missing new fields don’t break older builds during deploy.

## Phase 2 — Server (`server/src/room.ts`)

- [x] **2.1** — **`startGame()`** (or renamed): pick imposter + pair **once per game**; set `word` / `imposterWord`; reset `clueCycle`, `clues`, `suspicion`, `votes`; enter **`clue_write`**; set `clueEndsAt = now + writeSeconds * 1000`.
- [x] **2.2** — **Timer + resync**: generalize discussion timer/resync for **`clue_write`** (deadline expiry → lock submissions → **`clue_reveal`**).
- [x] **2.3** — **`SUBMIT_CLUE`**: validate phase, non-spectator, length, profanity if enabled, one submission per player per **clue cycle** (allow edit until deadline if you want).
- [x] **2.4** — **Broadcast rule**: during **`clue_write`**, either omit other players’ clues from broadcast **or** send redacted state — **do not leak** others’ words before reveal (full state can stay on server; consider per-connection patch later only if needed).
- [x] **2.5** — **`clue_reveal`**: all submitted clues visible to everyone; implement **unlimited** suspicion updates with validation (self-target rules if any).
- [x] **2.6** — **Advance from `clue_reveal`**: host (or all) “Continue” → if `clueCycle < maxClueRounds`, increment cycle, clear clues (and optionally suspicion), back to **`clue_write`** with **same** `word` / `imposterWord` / imposter (**R6**); else auto-**`voting`** or require **`CALL_VOTE`** only — match your UX.
- [x] **2.7** — **`CALL_VOTE`**: from **`clue_write`** or **`clue_reveal`**, any player; reset vote fields; set phase **`voting`**.
- [x] **2.8** — **`voting`**: accept per-player vote: **target player** or **skip**; when all eligible have voted **or** you add early resolution — implement **R4** (majority skip).
- [x] **2.9** — If **skip wins** → return to **`clue_write`** (or **`clue_reveal`** first if you want a beat — usually **`clue_write`**), reset votes, same words/imposter (**R6**).
- [x] **2.10** — If **accusation wins** (not skip): if chosen player **is not** imposter → **game over** (imposter wins / `endReason`) → **`reveal`** (**R5**). If chosen player **is** imposter → crew wins → **`reveal`** (existing stats++ pattern).
- [x] **2.11** — **`NEXT_ROUND`**: new imposter + new pair (new “game” in same room); **`BACK_TO_LOBBY`**: clear everything as today.
- [x] **2.12** — **Disconnects**: cleanup votes, clues, suspicion, and timers for departed users in **new** phases (extend `finalizePlayerDisconnect` / vote cleanup).

## Phase 3 — Client screens

- [x] **3.1** — **`App.tsx`**: route new phases to components.
- [x] **3.2** — **`Game.tsx`** (or rename): **`clue_write`** UI — show word (crew vs imposter), timer, text input, submit; spectator variant.
- [x] **3.3** — **New or split UI** for **`clue_reveal`** — list clues, suspicion controls (unlimited), optional “Call vote” button for everyone (**R2**), host continue if needed.
- [x] **3.4** — **`Voting.tsx`** — vote for a player **or** skip; copy for majority skip (**R4**); accessibility (radiogroup / labels).
- [x] **3.5** — **`Reveal.tsx`** — branches for wrong accusation game over vs normal win; show last clues/suspicion if useful.
- [x] **3.6** — **`Lobby.tsx`** — host settings: `writeSeconds`, `maxClueRounds`; wire `SET_GAME_SETTINGS`; keep word pack / custom pair as **source for the round’s pair** (still one pair per “game” until next round).

## Phase 4 — Polish & parity

- [x] **4.1** — **`useGameAnalytics.ts`** — events for clue write/reveal, vote called, skip majority, wrong accusation end.
- [x] **4.2** — **`PhaseSfxListener.tsx`** — map new phases.
- [x] **4.3** — **`en.json`** (and others if any) — all new strings.
- [x] **4.4** — **`e2e/smoke.spec.ts`** — update flow for new phases.
- [x] **4.5** — **`record-player-round.ts` / Supabase** — decide if schema needs `end_reason` or skip; migrate or defer.
- [x] **4.6** — **README / architecture rule** — short note on new loop and messages.

## Phase 5 — QA matrix (manual)

- [x] **5.1** — Full clue cycles with **same words** across cycles; imposter never sees crew word in UI.
- [x] **5.2** — **Anyone** calls vote from write and from reveal.
- [x] **5.3** — Majority **skip** returns to clues; **no** game-over from skip.
- [x] **5.4** — Wrong player accused → **game over**; correct imposter → crew wins.
- [x] **5.5** — Timer expiry locks clues; reconnect / spectator rules still sane.
