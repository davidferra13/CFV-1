import { test, expect } from '@playwright/test'

test('public culinary dictionary exposes seeded public aliases', async ({ page }) => {
  await page.goto('/dictionary?q=scallion')

  await expect(page.getByRole('heading', { name: 'Culinary Dictionary' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Green Onion' })).toBeVisible()
  await expect(page.getByText('scallion')).toBeVisible()
  await expect(page.getByText('spring onion')).toBeVisible()
})
