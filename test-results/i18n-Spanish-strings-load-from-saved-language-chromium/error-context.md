# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: i18n.spec.ts >> Spanish strings load from saved language
- Location: e2e\i18n.spec.ts:3:1

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Conectando…')
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 120000ms
  - waiting for getByText('Conectando…')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - img [ref=e4]
  - paragraph [ref=e6]: Reconectando al servidor…
  - paragraph [ref=e7]: Se cortó la conexión. Reintentando — puedes dejar esta pestaña abierta.
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test'
  2  | 
  3  | test('Spanish strings load from saved language', async ({ page }) => {
  4  |   await page.addInitScript(() => {
  5  |     window.localStorage.setItem('i18nextLng', 'es')
  6  |   })
  7  |   await page.goto('/')
> 8  |   await expect(page.getByText('Conectando…')).toBeVisible({ timeout: 120_000 })
     |                                               ^ Error: expect(locator).toBeVisible() failed
  9  | })
  10 | 
```