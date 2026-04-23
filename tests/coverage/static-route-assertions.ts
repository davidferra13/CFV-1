import type { Page } from '@playwright/test'
import { expect, test } from '../helpers/fixtures'
import routeInventory, { type CoverageRole } from '../helpers/route-inventory'

type AssertRouteLoadsOptions = {
  role: CoverageRole
  storageStatePath?: string
  missingStateMessage?: string
  requireStorageState?: boolean
}

async function gotoWithRetry(page: Page, url: string) {
  let lastResponse: Awaited<ReturnType<typeof page.goto>> = null

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      lastResponse = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 })
      const status = lastResponse?.status() ?? 0

      if (status >= 500 && attempt < 2) {
        await page.waitForTimeout(400)
        continue
      }

      const redirectedToSignIn = /auth\/signin/i.test(page.url())
      if (redirectedToSignIn && attempt < 2) {
        await page.waitForTimeout(400)
        continue
      }

      return lastResponse
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const retryable = /ERR_ABORTED|ERR_CONNECTION|timeout|frame was detached/i.test(message)
      if (!retryable || attempt === 2) throw error
      await page.waitForTimeout(400)
    }
  }

  return lastResponse
}

export async function assertRolePageLoads(page: Page, url: string, options: AssertRouteLoadsOptions) {
  const {
    role,
    storageStatePath,
    missingStateMessage,
    requireStorageState = false,
  } = options

  if (storageStatePath) {
    const hasStorageState = routeInventory.hasUsableStorageState(storageStatePath)
    if (requireStorageState) {
      expect(hasStorageState, missingStateMessage ?? `${role} auth state is required`).toBeTruthy()
    } else {
      test.skip(!hasStorageState, missingStateMessage ?? `${role} auth state not configured`)
    }
  }

  const errors: string[] = []
  const onPageError = (err: Error) => errors.push(err.message)
  page.on('pageerror', onPageError)

  const response = await gotoWithRetry(page, url)
  page.off('pageerror', onPageError)

  const status = response?.status() ?? 0
  expect(status, `[${role}] ${url} returned HTTP ${status}`).toBeLessThan(500)
  expect(errors, `[${role}] ${url} had JS errors: ${errors.join('; ')}`).toHaveLength(0)

  const currentUrl = page.url()
  if (role !== 'public') {
    expect(currentUrl, `[${role}] ${url} redirected to login`).not.toMatch(/auth\/signin/)
  }

  let bodyText = ''
  try {
    bodyText = await page.locator('body').innerText()
  } catch {
    bodyText = (await page.locator('body').textContent()) ?? ''
  }
  if (!bodyText.trim()) {
    await page.waitForTimeout(500)
    bodyText = (await page.locator('body').textContent()) ?? ''
  }

  expect(bodyText.trim().length, `[${role}] ${url} rendered blank`).toBeGreaterThan(10)
}
