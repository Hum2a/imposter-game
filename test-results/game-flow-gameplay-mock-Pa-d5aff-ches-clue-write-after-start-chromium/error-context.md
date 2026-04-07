# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: game-flow.spec.ts >> gameplay (mock + PartyKit on :1999) >> host reaches clue write after start
- Location: e2e\game-flow.spec.ts:4:3

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /Start game|Empezar partida/i })
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 120000ms
  - waiting for getByRole('button', { name: /Start game|Empezar partida/i })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - img [ref=e4]
  - paragraph [ref=e6]: Reconnecting to game server…
  - paragraph [ref=e7]: Connection dropped. Trying again — you can keep this tab open.
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test'
  2  | 
  3  | test.describe('gameplay (mock + PartyKit on :1999)', () => {
  4  |   test('host reaches clue write after start', async ({ page }) => {
  5  |     await page.addInitScript(() => {
  6  |       window.localStorage.setItem('i18nextLng', 'en')
  7  |     })
  8  |     await page.goto('/')
  9  |     await expect(
  10 |       page.getByRole('button', { name: /Start game|Empezar partida/i })
> 11 |     ).toBeVisible({
     |       ^ Error: expect(locator).toBeVisible() failed
  12 |       timeout: 120_000,
  13 |     })
  14 |     await page.getByRole('button', { name: /Start game|Empezar partida/i }).click()
  15 |     await expect(page.getByText(/Write your clue|Escribe tu pista/i)).toBeVisible({
  16 |       timeout: 30_000,
  17 |     })
  18 |   })
  19 | })
  20 | 
```