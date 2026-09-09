import { expect, test } from '@playwright/test'

test.use({ storageState: '.auth/chef.json' })

test('renders the authenticated work ledger without browser errors', async ({ page }) => {
  const browserErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text())
  })
  page.on('pageerror', (error) => browserErrors.push(error.message))

  const response = await page.goto('/insights/time-analysis', { waitUntil: 'networkidle' })
  expect(response?.status()).toBeLessThan(500)
  await expect(page.getByRole('heading', { name: 'Work Ledger' })).toBeVisible()
  await expect(
    page.getByText(/Manual fallback clock|Ledger database setup required/)
  ).toBeVisible()
  await page.screenshot({
    path: 'test-results/work-ledger-authenticated.png',
    fullPage: true,
  })
  expect(browserErrors).toEqual([])
})
