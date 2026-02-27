// Quick smoke test to verify diagnostic config works
import { test, expect } from '@playwright/test'

test('dashboard loads', async ({ page }) => {
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')
  expect(await page.title()).toBeTruthy()
})
