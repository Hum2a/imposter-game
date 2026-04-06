## Summary

<!-- What does this PR change and why? -->

## How to test

<!-- e.g. npm run lint && npm run build; manual steps for Discord / PartyKit -->

## Checklist

- [ ] `npm run lint` and `npm run build` pass at repo root
- [ ] `cd server && npx tsc --noEmit -p .` passes (if server TS touched)
- [ ] No secrets or `.env` / `.env.deploy` files committed
- [ ] i18n: new user-facing strings added to `src/i18n/locales/en.json` (and other locales if applicable)
- [ ] Word pack IDs match between `server/src/word-packs.ts` and `src/data/word-pack-options.ts` (if applicable)
