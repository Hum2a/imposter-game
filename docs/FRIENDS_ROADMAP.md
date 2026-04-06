# Friends / social — roadmap (not implemented)

This document scopes the **Friends** item from `USER_FEEDBACK_BACKLOG.md` so engineering can estimate work without guessing product details.

## Goals (MVP)

- Let a **logged-in web user** see a small list of **people they’ve added as friends** (bidirectional or request/accept — pick one model early).
- **Invite a friend** to the current lobby via a **deep link** or **share code** they already have (no requirement to solve discovery in v1).
- **Block / remove** with clear UX and server-enforced rules where it matters (e.g. who can see “online” or last-seen).

## Non-goals (v1)

- Full social feed, DMs in-app, or global user search (high abuse surface).
- Guaranteeing “who is imposter” secrecy via crypto on the wire (separate backlog row: per-connection state).

## Suggested technical direction

- **Identity:** reuse existing Supabase auth user id as the stable `userId` everywhere.
- **Data:** new tables, e.g. `friend_requests`, `friendships` (or single `friend_edges` with status), optional `blocks`. Row-level security so users only read their own edges.
- **Presence / online:** optional second phase — either Postgres + polling, or a small Worker/PartyKit channel scoped to friend pairs (watch costs and privacy).

## Client touchpoints

- **Account & profile:** “Friends” section — list, pending requests, accept/decline, remove.
- **Lobby:** “Invite friends” could open a picker that copies the same invite link/code as the main share UI.

## Open product decisions

- Request/accept vs auto-mutual when both add the same handle.
- Whether friends see each other’s **display names** only or also **avatar** tokens stored in profile.
- Rate limits on friend requests and invite spam.

When these are decided, split into tickets: schema + RLS, API routes or Edge Functions, UI, and analytics/error handling.
