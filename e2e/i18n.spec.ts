import { expect, test } from '@playwright/test'

test('Spanish strings load from saved language', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('i18nextLng', 'es')
  })
  await page.goto('/')
  await expect(page.getByText('Conectando…')).toBeVisible({ timeout: 120_000 })
})
