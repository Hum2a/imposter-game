import { expect, test } from '@playwright/test'

test.describe('gameplay (mock + PartyKit on :1999)', () => {
  test('host reaches clue write after start', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('i18nextLng', 'en')
    })
    await page.goto('/')
    await expect(
      page.getByRole('button', { name: /Start game|Empezar partida/i })
    ).toBeVisible({
      timeout: 120_000,
    })
    await page.getByRole('button', { name: /Start game|Empezar partida/i }).click()
    await expect(page.getByText(/Write your clue|Escribe tu pista/i)).toBeVisible({
      timeout: 30_000,
    })
  })
})
