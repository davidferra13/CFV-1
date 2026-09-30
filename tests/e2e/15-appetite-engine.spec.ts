import { expect, test } from '@playwright/test'

test.describe('public appetite engine', () => {
  test('preserves a hard need while spinning and records local evidence', async ({
    page,
  }, testInfo) => {
    await page.goto('/eat?appetite=need-vegan,taste-spicy&appetiteLocks=need-vegan')

    await expect(page.getByRole('heading', { name: 'What should we eat?' })).toBeVisible()
    await expect(page.getByText('What sounds good?')).toBeVisible()

    const vegan = page.getByRole('button', { name: /Vegan/ })
    await expect(vegan).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: 'Fresh' }).click()
    await page.getByRole('button', { name: 'Spin appetite' }).click()

    await expect(page).toHaveURL(/appetite=[^&]*need-vegan/)
    await expect(page.getByRole('button', { name: /Vegan/ })).toBeVisible()
    const evidence = await page.evaluate(() => {
      const raw = window.localStorage.getItem('chefflow:appetite-evidence:v1')
      return raw ? JSON.parse(raw) : []
    })
    expect(evidence).toEqual(
      expect.arrayContaining([expect.objectContaining({ action: 'spin_seen' })])
    )

    await testInfo.attach('eat-appetite-proof', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    })
  })

  test('lock state round-trips through the URL', async ({ page }) => {
    await page.goto('/eat?appetite=food-thai')
    const thai = page.getByRole('button', { name: /Thai/ })

    await thai.click()
    await expect(page).toHaveURL(/appetiteLocks=food-thai/)
    await expect(thai).toHaveAttribute('aria-pressed', 'true')

    await thai.click()
    await expect(page).not.toHaveURL(/appetiteLocks=/)
    await expect(thai).toHaveAttribute('aria-pressed', 'false')
  })
})
