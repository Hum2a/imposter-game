import { expect, test } from '@playwright/test'

test('app shell loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('body')).toBeVisible()
  // Do not accept “game server not configured”: that usually means the preview bundle was built without VITE_PARTYKIT_HOST (see playwright.config webServer.env).
  await expect(page.getByText(/Imposter|Connecting|Conectando/)).toBeVisible({
    timeout: 30_000,
  })
})
