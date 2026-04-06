# Contributing

Thanks for helping improve Imposter. This project is a **Discord Activity** plus **web/PWA** build: React (Vite), PartyKit realtime server, Cloudflare Worker for OAuth, optional Supabase.

## Before you start

1. Read [`README.md`](./README.md) — prerequisites, env vars, and scripts.
2. For deploy order and portal setup, use [`docs/LAUNCH_PLAN.md`](./docs/LAUNCH_PLAN.md).
3. Architecture and UI conventions for agents/humans: [`.cursor/rules/`](./.cursor/rules/).

## Local setup

```bash
npm install
cd server && npm install && cd ..
cp .env.example .env   # fill values
```

Terminal A — PartyKit:

```bash
npm run dev:party
```

Terminal B — Vite:

```bash
npm run dev
```

- **Normal local play:** use the in-app web profile / name controls.
- **`VITE_DISCORD_MOCK=1`:** fixed mock user; intended for Playwright / quick UI only (see README).

## Quality bar

```bash
npm run lint
npm run build
```

E2E (needs PartyKit on `127.0.0.1:1999`, same as CI):

```bash
npm run dev:party   # separate terminal
npm run test:e2e
```

Server TypeScript:

```bash
cd server && npx tsc --noEmit -p .
```

## Pull requests

- Keep changes focused; match existing patterns (see shadcn/ui usage in `src/components/ui/`).
- **i18n:** default strings in `src/i18n/locales/en.json`; register locales in `src/i18n/config.ts`.
- **Word packs:** server ids in `server/src/word-packs.ts` must match `src/data/word-pack-options.ts`.
- Do not commit `.env`, `.env.deploy`, or secrets.

## Security

See [`docs/SECURITY.md`](./docs/SECURITY.md) and root [`SECURITY.md`](./SECURITY.md) for reporting and operational notes.
