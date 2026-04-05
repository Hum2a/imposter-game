import { expect, test } from '@playwright/test'

test('app shell loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('body')).toBeVisible()
  await expect(page.getByText(/Imposter|Connecting|Game server not configured/)).toBeVisible({
    timeout: 30_000,
  })
})
